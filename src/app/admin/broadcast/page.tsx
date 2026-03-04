"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Send, Users, Bell, ArrowLeft, Loader2, CheckCircle2,
  AlertCircle, Globe, Info
} from "lucide-react";
import toast from "react-hot-toast";

export default function BroadcastPage() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const link = "/dashboard";
  const [targets, setTargets] = useState<string[]>(["all"]);

  const toggleTarget = (t: string) => {
    if (t === "all") {
      setTargets(["all"]);
    } else {
      let next = targets.filter(x => x !== "all");
      if (next.includes(t)) {
        next = next.filter(x => x !== t);
      } else {
        next.push(t);
      }
      // If nothing left, default to "all" to ensure someone gets it
      if (next.length === 0) next = ["all"];
      setTargets(next);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Please provide title and message");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          link,
          targets: targets.map(t => (isNaN(Number(t)) ? t : Number(t)))
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Broadcast sent Successfully!`);
        setTitle("");
        setMessage("");
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Broadcast</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Send instant alerts to all students or specific semesters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 space-y-6 order-1 lg:order-1"
        >
          <form onSubmit={handleSend} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Subject / Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Upcoming Exam Schedule"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Announcement Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Compose your message here..."
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal transition-all resize-none"
                  required
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full h-14 bg-teal text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-teal-dark active:scale-[0.98] transition-all shadow-lg shadow-teal/10 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Dispatch Broadcast
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Sidebar Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 order-2 lg:order-2"
        >
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xl lg:sticky lg:top-24">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal" /> Target Audience
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => toggleTarget("all")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${targets.includes("all")
                  ? "bg-teal/10 border-teal text-teal"
                  : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200"
                  }`}
              >
                <div className="flex items-center gap-3 font-semibold">
                  <Globe className="w-4 h-4" /> All Students
                </div>
                {targets.includes("all") && <CheckCircle2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => toggleTarget("general")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${targets.includes("general")
                  ? "bg-teal/10 border-teal text-teal"
                  : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200"
                  }`}
              >
                <div className="flex items-center gap-3 font-semibold">
                  <Bell className="w-4 h-4" /> General Only
                </div>
                {targets.includes("general") && <CheckCircle2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-widest">Specific Semesters</p>
              <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleTarget(String(s))}
                    className={`h-10 rounded-xl border text-xs font-bold transition-all ${targets.includes(String(s))
                      ? "bg-teal text-white border-teal shadow-md shadow-teal/10"
                      : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                      }`}
                  >
                    S{s}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">
                Caution: Broadcasts are sent via Web Push immediately. Ensure accuracy before dispatching.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
