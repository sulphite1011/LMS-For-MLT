"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BookOpen, Megaphone, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { SEMESTERS, semesterLabel } from "@/lib/semesters";
import { formatDateTime } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface Sent {
  _id: string;
  title: string;
  message?: string;
  kind: "resource" | "custom";
  semester?: number | null;
  link?: string;
  createdAt: string;
  createdBy?: { username?: string } | null;
}

const inputClass =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm";

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Sent[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [semester, setSemester] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/manage", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/notifications/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          link: link.trim(),
          semester: semester ? Number(semester) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(semester ? `Sent to Semester ${semester} students` : "Sent to all students");
      setTitle("");
      setMessage("");
      setLink("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notifications/manage/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to delete");
      toast.success("Notification deleted");
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">
          Send an announcement to every student or to one semester. New resources notify automatically when you publish them.
        </p>
      </div>

      <motion.form
        onSubmit={send}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm space-y-4"
      >
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-teal" />
          New announcement
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g., Mid-term schedule announced" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea className={inputClass} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} placeholder="Optional details…" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send to</label>
            <select className={inputClass} value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">All students</option>
              {SEMESTERS.map((n) => (
                <option key={n} value={n}>Semester {n} students</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
            <input className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} placeholder="/resource/… or https://…" maxLength={300} />
          </div>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {sending ? "Sending…" : "Send notification"}
        </button>
      </motion.form>

      <section className="space-y-3">
        <h2 className="font-semibold text-text-primary">Sent notifications</h2>
        {loading ? (
          <TableSkeleton rows={4} />
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nothing sent yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {items.map((n) => (
              <div key={n._id} className="flex items-start justify-between gap-3 px-6 py-4">
                <div className="flex gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-teal/10 text-teal flex items-center justify-center shrink-0">
                    {n.kind === "resource" ? <BookOpen className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm break-words [overflow-wrap:anywhere]">{n.title}</p>
                    {n.message && <p className="text-xs text-gray-500 mt-0.5 break-words [overflow-wrap:anywhere]">{n.message}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {semesterLabel(n.semester)} · {formatDateTime(n.createdAt)}
                      {n.createdBy?.username ? ` · by ${n.createdBy.username}` : ""}
                    </p>
                  </div>
                </div>
                <button onClick={() => setDeleteId(n._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" aria-label={`Delete ${n.title}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete notification?"
        message="Students will no longer see this notification."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
