"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, BookOpen, MessageCircle, Trash2, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { subscribeUserToPush } from "@/lib/push-client";

interface INotification {
  _id: string;
  type: "NEW_RESOURCE" | "COMMENT_REPLY" | "SYSTEM_BROADCAST";
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
    // Smart Polling: check every 45 seconds (slightly faster for better perceived performance)
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch immediately when the drawer is opened to ensure freshness
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

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


  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      setNotifications(notifications.filter((n) => n._id !== id));
      setUnreadCount((prev) => notifications.find(n => n._id === id && !n.isRead) ? Math.max(0, prev - 1) : prev);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
      });
      setNotifications([]);
      setUnreadCount(0);
      toast.success("Notifications cleared");
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };


  const subscribeToPush = async () => {
    const success = await subscribeUserToPush();
    if (success) {
      setPermission("granted");
      toast.success("Notifications enabled!");
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
            {/* Backdrop for mobile to focus on the drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-navy/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-16 left-0 right-0 bottom-0 md:bottom-auto md:absolute md:top-full md:right-0 md:left-auto md:mt-3 w-full md:w-[420px] bg-white md:rounded-3xl shadow-2xl border-t md:border border-slate-100 z-50 overflow-hidden flex flex-col"
            >
              {/* Premium Header */}
              <div className="bg-navy p-5 flex items-center justify-between relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-teal/10 pointer-events-none" />
                <div className="relative z-10 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-teal shadow-teal/20" />
                  <h3 className="font-bold text-white text-lg tracking-tight">Updates</h3>
                  {unreadCount > 0 && (
                    <span className="bg-teal text-navy text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      {unreadCount} New
                    </span>
                  )}
                </div>

                <div className="relative z-10 flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-bold text-teal-400 hover:text-white transition-colors"
                    >
                      Mark all read
                    </button>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] font-bold text-red-300 hover:text-white transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center animate-pulse">
                        <Bell className="w-10 h-10 text-teal/40" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal rounded-full border-4 border-white" />
                    </div>
                    <h3 className="text-xl font-bold text-navy mb-2">You&apos;re All Caught Up</h3>
                    <p className="text-sm text-slate-500 max-w-[240px] leading-relaxed">
                      {permission === "granted"
                        ? "Check back later for important updates and replies."
                        : "Enable desktop alerts to stay in the loop instantly."}
                    </p>
                    {permission !== "granted" && (
                      <button
                        onClick={subscribeToPush}
                        className="mt-6 px-6 py-2.5 bg-navy text-teal rounded-xl text-xs font-bold hover:bg-navy-light transition-all shadow-lg shadow-navy/10"
                      >
                        Enable Push Alerts
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`group relative p-5 transition-all hover:bg-white border-l-4 ${!n.isRead ? "bg-white border-l-teal shadow-sm" : "bg-transparent border-l-transparent"
                          }`}
                      >
                        <div className="flex gap-4 items-start">
                          <Link
                            href={n.link}
                            onClick={() => {
                              markAsRead(n._id);
                              setIsOpen(false);
                            }}
                            className="flex-1 flex gap-4 min-w-0"
                          >
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${n.type === "NEW_RESOURCE"
                                  ? "bg-blue-50 text-blue-500"
                                  : n.type === "SYSTEM_BROADCAST"
                                    ? "bg-amber-50 text-amber-500"
                                    : "bg-teal/10 text-teal"
                                }`}
                            >
                              {n.type === "NEW_RESOURCE" ? (
                                <BookOpen className="w-6 h-6" />
                              ) : n.type === "SYSTEM_BROADCAST" ? (
                                <Megaphone className="w-6 h-6" />
                              ) : (
                                <MessageCircle className="w-6 h-6" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${n.type === "NEW_RESOURCE" ? "text-blue-400" : n.type === "SYSTEM_BROADCAST" ? "text-amber-400" : "text-teal"
                                  }`}>
                                  {n.type.replace("_", " ")}
                                </span>
                                {!n.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                                )}
                              </div>
                              <h4 className={`text-sm leading-tight transition-colors ${!n.isRead ? "font-bold text-navy" : "font-medium text-slate-600"
                                }`}>
                                {n.title}
                              </h4>
                              <p className="text-[13px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-1.5 uppercase">
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                {new Date(n.createdAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </Link>

                          {/* Delete Action */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              deleteNotification(n._id);
                            }}
                            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* View all footer (Mobile ONLY) */}
              <div className="md:hidden p-4 bg-white border-t border-slate-100 shrink-0">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 bg-slate-100 text-navy font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
