"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, BookOpen, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

interface INotification {
  _id: string;
  type: "NEW_RESOURCE" | "COMMENT_REPLY";
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: INotification) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Smart Polling: check every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications(
        notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const subscribeToPush = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.error("Permission denied for notifications");
        return;
      }

      const register = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("VAPID public key not found");

      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray
      });

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
      });

      if (res.ok) {
        toast.success("Notifications enabled!");
      }
    } catch (error) {
      console.error("Subscription failed:", error);
      toast.error("Failed to enable notifications");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 transition-colors ${permission === "granted" ? "text-gray-400 hover:text-teal" : "text-gray-300 hover:text-teal"
          }`}
      >
        <Bell className="w-6 h-6" />
        {permission !== "granted" && (
          <span className="absolute top-2 right-2 flex h-2 w-2 items-center justify-center rounded-full bg-amber-500 ring-1 ring-white" title="Notifications disabled" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-3">
                  {permission !== "granted" && (
                    <button
                      onClick={subscribeToPush}
                      className="text-[10px] bg-teal/10 text-teal px-2 py-1 rounded-full font-bold hover:bg-teal/20 transition-colors"
                    >
                      Enable Alerts
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-teal hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-teal/5 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-teal" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      {permission === "granted" ? "No notifications yet" : "Stay Informed"}
                    </p>
                    <p className="text-xs text-gray-500 mb-4 px-4">
                      {permission === "granted"
                        ? "We'll notify you when new resources match your profile."
                        : "Enable desktop alerts to get instant notifications about resources and replies."}
                    </p>
                    {permission !== "granted" && (
                      <button
                        onClick={subscribeToPush}
                        className="bg-teal text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-teal-dark transition-all shadow-sm"
                      >
                        Enable Notifications
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((n) => (
                      <Link
                        key={n._id}
                        href={n.link}
                        onClick={() => {
                          markAsRead(n._id);
                          setIsOpen(false);
                        }}
                        className={`block p-4 hover:bg-teal/5 transition-colors relative ${!n.isRead ? "bg-teal/2" : ""
                          }`}
                      >
                        <div className="flex gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.type === "NEW_RESOURCE"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-purple-100 text-purple-600"
                              }`}
                          >
                            {n.type === "NEW_RESOURCE" ? (
                              <BookOpen className="w-5 h-5" />
                            ) : (
                              <MessageCircle className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${!n.isRead ? "font-bold text-gray-900" : "text-gray-600"
                                }`}
                            >
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-2">
                              {new Date(n.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          {!n.isRead && (
                            <div className="w-2 h-2 bg-teal rounded-full mt-1.5 shrink-0" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
