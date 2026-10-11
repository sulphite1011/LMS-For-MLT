"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { SEMESTERS } from "@/lib/semesters";

interface Settings {
  enabled: boolean;
  currentSemester: number | null;
  notifySemesters: number[];
}

/** Profile tab: choose the current semester, turn notifications on/off, follow extra semesters. */
export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSettings(d.settings))
      .catch(() => toast.error("Couldn't load your notification settings"));
  }, []);

  if (!settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-teal animate-spin" />
      </div>
    );
  }

  const save = async (patch: Partial<Settings>) => {
    const previous = settings;
    setSettings({ ...settings, ...patch });
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSettings(data);
      toast.success("Notification settings saved");
    } catch (err) {
      setSettings(previous);
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleExtra = (n: number) => {
    const has = settings.notifySemesters.includes(n);
    save({ notifySemesters: has ? settings.notifySemesters.filter((s) => s !== n) : [...settings.notifySemesters, n] });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center shrink-0">
            {settings.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Notifications</h3>
            <p className="text-sm text-slate-500">
              Get alerts for new resources and announcements. Updates for everyone, and for your current semester, always reach you while this is on.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Turn notifications on or off"
          disabled={saving}
          onClick={() => save({ enabled: !settings.enabled })}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-60 ${settings.enabled ? "bg-teal" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${settings.enabled ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="current-semester">My current semester</label>
        <select
          id="current-semester"
          value={settings.currentSemester ?? ""}
          disabled={saving}
          onChange={(e) => save({ currentSemester: e.target.value ? Number(e.target.value) : null })}
          className="w-full sm:w-64 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm bg-white"
        >
          <option value="">Not selected</option>
          {SEMESTERS.map((n) => (
            <option key={n} value={n}>Semester {n}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">You always receive notifications for this semester.</p>
      </div>

      <div>
        <p className="block text-sm font-medium text-slate-700 mb-2">Also notify me about other semesters</p>
        <div className="flex flex-wrap gap-2">
          {SEMESTERS.filter((n) => n !== settings.currentSemester).map((n) => {
            const on = settings.notifySemesters.includes(n);
            return (
              <button
                key={n}
                type="button"
                disabled={saving}
                aria-pressed={on}
                onClick={() => toggleExtra(n)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-60 ${on ? "bg-teal text-white border-teal" : "bg-white text-slate-600 border-gray-200 hover:border-teal hover:text-teal"}`}
              >
                Semester {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
