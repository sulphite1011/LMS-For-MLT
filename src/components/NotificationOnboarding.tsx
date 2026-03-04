"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, GraduationCap, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { subscribeUserToPush } from "@/lib/push-client";

export function NotificationOnboarding() {
  const { user, isLoaded } = useUser();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Check if onboarding is needed
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const profile = await res.json();
          const hasSemester = !!(profile.primarySemester || profile.semester);
          const hasPush = Notification.permission === "granted";
          const dismissed = localStorage.getItem("notification_onboarding_dismissed");

          if ((!hasSemester || !hasPush) && !dismissed) {
            // Small delay for better UX
            setTimeout(() => setShow(true), 2000);
          }
        }
      } catch {
        // Silently fail onboarding check in background
      }
    };

    checkOnboarding();
  }, [isLoaded, user]);

  const handleSaveSemester = async () => {
    if (!selectedSemester) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primarySemester: selectedSemester }),
      });

      if (res.ok) {
        setStep(2);
      } else {
        toast.error("Failed to save semester");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    const success = await subscribeUserToPush();
    setLoading(false);
    if (success) {
      toast.success("All set! Notifications enabled.");
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("notification_onboarding_dismissed", "true");
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 text-center">
            {step === 1 ? (
              <>
                <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-8 h-8 text-teal" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to MLT Study Hub</h2>
                <p className="text-gray-500 mb-8">Select your current semester to receive personalized resource alerts.</p>

                <div className="grid grid-cols-5 gap-3 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSemester(s)}
                      className={`h-12 rounded-xl border-2 font-bold transition-all ${selectedSemester === s
                        ? "border-teal bg-teal/5 text-teal"
                        : "border-gray-100 text-gray-400 hover:border-teal/30 hover:text-teal/70"
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSaveSemester}
                  disabled={!selectedSemester || loading}
                  className="w-full h-14 bg-teal text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-teal-dark transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next <ArrowRight className="w-5 h-5" /></>}
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Bell className="w-8 h-8 text-teal" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Stay Informed</h2>
                <p className="text-gray-500 mb-8 px-4">Get instant notifications for new resources and replies even when you&apos;re busy in the lab.</p>

                <div className="space-y-4">
                  <button
                    onClick={handleEnableNotifications}
                    disabled={loading}
                    className="w-full h-14 bg-teal text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-teal-dark transition-all shadow-lg shadow-teal/20"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enable Desktop Notifications <Check className="w-5 h-5" /></>}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
                  >
                    Not now, maybe later
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-50 flex">
            <div className={`h-full bg-teal transition-all duration-500 ${step === 1 ? "w-1/2" : "w-full"}`} />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
