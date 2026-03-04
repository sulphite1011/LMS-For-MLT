"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, BookOpen, MessageCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { subscribeUserToPush } from "@/lib/push-client";

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
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: 10,
              }}
              className="absolute top-full right-0 mt-3 w-[calc(100vw-2rem)] md:w-96 max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-y-3 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 shrink-0">Notifications</h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  {permission !== "granted" && (
                    <button
                      onClick={subscribeToPush}
                      className="text-[10px] bg-teal/10 text-teal px-2 py-1 rounded-full font-bold hover:bg-teal/20 transition-colors"
                    >
                      Enable Alerts
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={markAllAsRead}
                        className="text-[9px] sm:text-[10px] text-teal hover:underline font-medium"
                      >
                        Read all
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={clearAllNotifications}
                        className="text-[10px] text-red-500 hover:underline font-medium"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] md:max-h-[400px] overflow-y-auto">
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
                      <div
                        key={n._id}
                        className={`group relative p-4 hover:bg-teal/5 transition-colors ${!n.isRead ? "bg-teal/2" : ""
                          }`}
                      >
                        <div className="flex gap-2 relative">
                          <Link
                            href={n.link}
                            onClick={() => {
                              markAsRead(n._id);
                              setIsOpen(false);
                            }}
                            className="flex-1 flex gap-3 min-w-0"
                          >
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
                              <p className="text-[10px] text-gray-400 mt-1.5 uppercase font-medium">
                                {new Date(n.createdAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </Link>

                          {/* Action Buttons (Visible on hover on PC, Always on mobile) */}
                          <div className="flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                deleteNotification(n._id);
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 sm:text-gray-400 rounded-lg transition-colors bg-gray-50 md:bg-transparent"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {!n.isRead && (
                            <div className="w-2 h-2 bg-teal rounded-full mt-1.5 shrink-0" />
                          )}
                        </div>
                      </div>
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
