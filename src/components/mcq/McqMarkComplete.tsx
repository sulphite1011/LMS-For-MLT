"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { CheckCircle2 } from "lucide-react";

/** "Mark as completed" for units that are shown as an uploaded HTML page (no native quiz). */
export function McqMarkComplete({ unitId }: { unitId: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    fetch(`/api/mcq/progress?unitId=${unitId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setCompleted(!!d?.progress?.completed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [unitId, isLoaded, isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <p className="text-xs text-gray-500">Sign in to mark units as completed and keep a study streak.</p>;

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/mcq/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, action: "complete", completed: !completed }),
      });
      if (!res.ok) throw new Error();
      setCompleted(!completed);
      toast.success(!completed ? "Marked as completed" : "Marked as not completed");
    } catch {
      toast.error("Could not update. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-60 ${
        completed ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-gray-700 border-gray-200 hover:border-teal/40 hover:text-teal"
      }`}
    >
      <CheckCircle2 className="w-4 h-4" />
      {completed ? "Completed — click to undo" : "Mark as completed"}
    </button>
  );
}
