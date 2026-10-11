"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Bell, BookOpen, Megaphone, Settings } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";

interface Item {
  _id: string;
  title: string;
  message?: string;
  kind: "resource" | "custom";
  semester?: number | null;
  link?: string;
  createdAt: string;
}

interface Payload {
  notifications: Item[];
  unreadCount: number;
  seenAt: string;
  settings: { enabled: boolean; currentSemester: number | null };
}

const POLL_MS = 60_000;

/** Bell with an unread badge and a dropdown list. Shown only to signed-in users. */
export function NotificationBell() {
  const { isLoaded, isSignedIn } = useUser();
  const [data, setData] = useState<Payload | null>(null);
  const [open, setOpen] = useState(false);
  const [seenBefore, setSeenBefore] = useState<number>(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* offline — keep what we have */
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isLoaded, isSignedIn, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isLoaded || !isSignedIn) return null;

  const unread = data?.unreadCount ?? 0;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && data) {
      setSeenBefore(new Date(data.seenAt).getTime());
      if (data.unreadCount > 0) {
        setData({ ...data, unreadCount: 0 });
        fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
      }
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications (${unread} new)` : "Notifications"}
        aria-expanded={open}
        className="relative p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-16 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-96 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-text-primary">Notifications</h3>
            <Link
              href="/dashboard?tab=notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-xs text-teal hover:underline"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Link>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!data?.settings.enabled ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Notifications are turned off. Turn them on in your{" "}
                <Link href="/dashboard?tab=notifications" onClick={() => setOpen(false)} className="text-teal hover:underline">
                  settings
                </Link>
                .
              </p>
            ) : data.notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                You&apos;re all caught up.
                {!data.settings.currentSemester && (
                  <>
                    {" "}
                    <Link href="/dashboard?tab=notifications" onClick={() => setOpen(false)} className="text-teal hover:underline">
                      Choose your semester
                    </Link>{" "}
                    to get the right updates.
                  </>
                )}
              </p>
            ) : (
              data.notifications.map((n) => {
                const isNew = new Date(n.createdAt).getTime() > seenBefore;
                const inner = (
                  <div className={`flex gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isNew ? "bg-teal/5" : ""}`}>
                    <div className="w-8 h-8 rounded-full bg-teal/10 text-teal flex items-center justify-center shrink-0">
                      {n.kind === "resource" ? <BookOpen className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary break-words [overflow-wrap:anywhere]">{n.title}</p>
                      {n.message && <p className="text-xs text-slate-500 mt-0.5 break-words [overflow-wrap:anywhere]">{n.message}</p>}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt))}
                        {n.semester ? ` · Semester ${n.semester}` : " · Everyone"}
                      </p>
                    </div>
                  </div>
                );
                if (!n.link) return <div key={n._id}>{inner}</div>;
                return n.link.startsWith("/") ? (
                  <Link key={n._id} href={n.link} onClick={() => setOpen(false)}>{inner}</Link>
                ) : (
                  <a key={n._id} href={n.link} target="_blank" rel="noopener noreferrer">{inner}</a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
