"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Flame, ListChecks, PlayCircle, Target } from "lucide-react";

interface Item {
  unitId: string;
  unitName: string;
  subjectName: string;
  specialtyName: string;
  semester: number;
  href: string;
  completed: boolean;
  bestScore: number;
  attempts: number;
  inProgress: boolean;
  answered: number;
  sessionTotal: number;
}

interface Summary {
  streak: number;
  longestStreak: number;
  studiedToday: boolean;
  totalAnswered: number;
  completedCount: number;
  resume: Item[];
  recent: Item[];
}

/** Dashboard card: study streak, completed units and "continue where you left off". */
export function StudyProgress() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mcq/progress/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const stats = [
    { icon: Flame, label: data.streak === 1 ? "day streak" : "day streak", value: data.streak, tone: "text-orange-500" },
    { icon: CheckCircle2, label: "units completed", value: data.completedCount, tone: "text-green-500" },
    { icon: Target, label: "questions answered", value: data.totalAnswered, tone: "text-teal" },
  ];
  const list = [...data.resume, ...data.recent].slice(0, 4);

  return (
    <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 mb-6" aria-label="MCQ study progress">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-teal" /> MCQ study progress
        </h2>
        <Link href="/mcqs" className="text-sm text-teal hover:underline inline-flex items-center gap-1">
          Browse MCQs <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-gray-50 p-3 text-center">
            <s.icon className={`w-5 h-5 mx-auto ${s.tone}`} />
            <p className="text-xl font-bold text-gray-800 mt-1">{s.value}</p>
            <p className="text-[11px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        {data.studiedToday
          ? `You studied today. Longest streak: ${data.longestStreak} day${data.longestStreak === 1 ? "" : "s"}.`
          : data.streak > 0
          ? "Answer a question today to keep your streak going."
          : "Answer a question today to start a streak."}
      </p>

      {list.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{data.resume.length ? "Continue where you left off" : "Recent units"}</h3>
          <ul className="space-y-2">
            {list.map((it) => (
              <li key={it.unitId}>
                <Link href={it.href} className="flex items-center gap-3 rounded-xl border border-gray-200 hover:border-teal/40 p-3 transition-all">
                  {it.inProgress ? (
                    <PlayCircle className="w-5 h-5 text-teal shrink-0" />
                  ) : it.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <ListChecks className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{it.unitName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {it.subjectName} · {it.specialtyName} · Sem {it.semester}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {it.inProgress ? `${it.answered}/${it.sessionTotal} answered` : it.attempts ? `Best ${it.bestScore}%` : it.completed ? "Completed" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
