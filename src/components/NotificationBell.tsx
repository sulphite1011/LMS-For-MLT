"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Archive, ArchiveRestore, Bell, BookOpen, Megaphone, Settings, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "@/lib/utils";

interface Item {
  _id: string;
  title: string;
  message?: string;
  kind: "resource" | "custom" | "setup";
  semester?: number | null;
  link?: string;
  createdAt: string;
}

interface Payload {
  notifications: Item[];
  archived: Item[];
  unreadCount: number;
  seenAt: string;
  settings: { enabled: boolean; currentSemester: number | null };
}

type Tab = "inbox" | "archived";

const POLL_MS = 60_000;

/** Bell with an unread badge, an Inbox / Archived dropdown, and archive / delete per notification. Signed-in users only. */
export function NotificationBell() {
  const { isLoaded, isSignedIn } = useUser();
  const [data, setData] = useState<Payload | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("inbox");
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
    if (next) setTab("inbox");
    if (next && data) {
      setSeenBefore(new Date(data.seenAt).getTime());
      if (data.unreadCount > 0) {
        setData({ ...data, unreadCount: 0 });
        fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
      }
    }
  };

  /** Optimistic archive / unarchive / delete; reloads from the server if the request fails. */
  const act = async (item: Item, action: "archive" | "unarchive" | "delete") => {
    if (!data) return;
    setData({
      ...data,
      notifications:
        action === "unarchive"
          ? [item, ...data.notifications].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          : data.notifications.filter((n) => n._id !== item._id),
      archived:
        action === "archive"
          ? [item, ...data.archived].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          : data.archived.filter((n) => n._id !== item._id),
    });
    try {
      const res = await fetch(`/api/notifications/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      if (action === "delete") toast.success("Notification deleted");
      else if (action === "archive") toast.success("Archived");
      else toast.success("Moved back to inbox");
    } catch {
      toast.error("Could not update. Try again.");
      load();
    }
  };

  const list = tab === "inbox" ? data?.notifications ?? [] : data?.archived ?? [];
  const archivedCount = data?.archived.length ?? 0;

  const renderItem = (n: Item) => {
    const isNew = tab === "inbox" && new Date(n.createdAt).getTime() > seenBefore;
    const isSetup = n.kind === "setup";
    const body = (
      <div className="flex gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-teal/10 text-teal flex items-center justify-center shrink-0">
          {n.kind === "resource" ? <BookOpen className="w-4 h-4" /> : n.kind === "setup" ? <Sparkles className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary break-words [overflow-wrap:anywhere]">{n.title}</p>
          {n.message && <p className="text-xs text-slate-500 mt-0.5 break-words [overflow-wrap:anywhere]">{n.message}</p>}
          {!isSetup && (
            <p className="text-[11px] text-slate-400 mt-1">
              {formatDistanceToNow(new Date(n.createdAt))}
              {n.semester ? ` · Semester ${n.semester}` : " · Everyone"}
            </p>
          )}
        </div>
      </div>
    );

    return (
      <div
        key={n._id}
        className={`flex items-start gap-1 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isNew || isSetup ? "bg-teal/5" : ""}`}
      >
        {n.link ? (
          n.link.startsWith("/") ? (
            <Link href={n.link} onClick={() => setOpen(false)} className="flex min-w-0 flex-1">
              {body}
            </Link>
          ) : (
            <a href={n.link} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1">
              {body}
            </a>
          )
        ) : (
          body
        )}
        {!isSetup && (
          <div className="flex flex-col gap-1 shrink-0">
            {tab === "inbox" ? (
              <button
                type="button"
                onClick={() => act(n, "archive")}
                aria-label="Archive notification"
                title="Archive"
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal hover:bg-teal/10 transition-colors"
              >
                <Archive className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => act(n, "unarchive")}
                aria-label="Move back to inbox"
                title="Unarchive"
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal hover:bg-teal/10 transition-colors"
              >
                <ArchiveRestore className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => act(n, "delete")}
              aria-label="Delete notification"
              title="Delete"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
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

          {data?.settings.enabled && (
            <div className="flex gap-1 px-3 pt-2 border-b border-slate-100" role="tablist">
              {(["inbox", "archived"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    tab === t ? "border-teal text-teal" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t === "inbox" ? "Inbox" : `Archived${archivedCount ? ` (${archivedCount})` : ""}`}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {!data?.settings.enabled ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Notifications are turned off. Turn them on in your{" "}
                <Link href="/dashboard?tab=notifications" onClick={() => setOpen(false)} className="text-teal hover:underline">
                  settings
                </Link>
                .
              </p>
            ) : list.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                {tab === "inbox" ? "You're all caught up." : "Nothing archived. Archive a notification to keep it here."}
              </p>
            ) : (
              list.map(renderItem)
            )}
          </div>

          {data?.settings.enabled && (
            <p className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">Notifications are removed automatically after 60 days.</p>
          )}
        </div>
      )}
    </div>
  );
}
