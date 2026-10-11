"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, Loader2, PlayCircle, RotateCcw, Target, Timer, XCircle,
} from "lucide-react";

export interface PlayerQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface SavedProgress {
  completed: boolean;
  attempts: number;
  bestScore: number;
  lastScore: number;
  lastTotal: number;
  lastCorrect: number;
  missed: number[];
  session?: {
    mode: "practice" | "test";
    order: number[];
    answers: number[];
    index: number;
    elapsedSec: number;
  };
}

type Mode = "practice" | "test";
type Phase = "menu" | "quiz" | "result";

interface Props {
  unitId: string;
  unitName: string;
  questions: PlayerQuestion[];
  backHref: string;
}

const LETTERS = "ABCDEFGH";
const TEST_SIZES = [3, 5, 10, 15, 20, 25, 30, 40, 50];
const SECONDS_PER_QUESTION = 60;

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function McqPlayer({ unitId, unitName, questions, backHref }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const total = questions.length;

  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("practice");
  const [testCount, setTestCount] = useState(Math.min(10, total));
  const [order, setOrder] = useState<number[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<SavedProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [missedNow, setMissedNow] = useState<number[]>([]);

  const stateRef = useRef({ mode, order, answers, index, elapsed });
  stateRef.current = { mode, order, answers, index, elapsed };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- load saved progress -------------------------------------------------
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoadingProgress(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/mcq/progress?unitId=${unitId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setProgress(d?.progress ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingProgress(false);
      });
    return () => {
      cancelled = true;
    };
  }, [unitId, isLoaded, isSignedIn]);

  // ---- API helpers ---------------------------------------------------------
  const put = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/mcq/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, ...body }),
      });
      if (!res.ok) throw new Error("save failed");
      return res.json();
    },
    [unitId]
  );

  const scheduleSave = useCallback(() => {
    if (!isSignedIn) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s.order.length) return;
      put({ action: "save", mode: s.mode, order: s.order, answers: s.answers, index: s.index, elapsedSec: s.elapsed }).catch(() => {});
    }, 700);
  }, [isSignedIn, put]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  // ---- timer ---------------------------------------------------------------
  useEffect(() => {
    if (phase !== "quiz") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const limit = mode === "test" ? order.length * SECONDS_PER_QUESTION : 0;

  // ---- start / finish ------------------------------------------------------
  const begin = (m: Mode, ord: number[], ans?: number[], idx = 0, el = 0) => {
    setMode(m);
    setOrder(ord);
    setAnswers(ans ?? ord.map(() => -1));
    setIndex(idx);
    setElapsed(el);
    setPhase("quiz");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startPractice = () => begin("practice", Array.from({ length: total }, (_, i) => i));
  const startTest = () => begin("test", shuffled(total).slice(0, Math.min(testCount, total)));
  const retryMissed = (ids: number[]) => begin("practice", ids);
  const resume = () => {
    const s = progress?.session;
    if (!s) return;
    const validOrder = s.order.every((q) => q >= 0 && q < total);
    if (!validOrder) return startPractice();
    begin(s.mode, s.order, s.answers, s.index, s.elapsedSec);
  };

  const finish = useCallback(async () => {
    const s = stateRef.current;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setFinishing(true);
    // local scoring is the fallback; a signed-in user's result is scored by the server
    const localMissed = s.order.filter((qi, pos) => s.answers[pos] !== questions[qi].answer);
    let missed = localMissed;
    if (isSignedIn) {
      try {
        const data = await put({ action: "finish", mode: s.mode, order: s.order, answers: s.answers, elapsedSec: s.elapsed });
        setProgress(data.progress);
        missed = data.result?.missed ?? localMissed;
      } catch {
        toast.error("Could not save your result, but your score is shown below.");
      }
    }
    setMissedNow(missed);
    setFinishing(false);
    setPhase("result");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isSignedIn, put, questions]);

  // auto-submit when the test countdown reaches zero
  useEffect(() => {
    if (phase === "quiz" && mode === "test" && limit > 0 && elapsed >= limit && !finishing) {
      toast("Time is up — submitting your test.");
      void finish();
    }
  }, [phase, mode, limit, elapsed, finishing, finish]);

  const choose = (opt: number) => {
    if (phase !== "quiz") return;
    if (mode === "practice" && answers[index] >= 0) return; // locked after answering
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = opt;
      stateRef.current = { ...stateRef.current, answers: next };
      return next;
    });
    scheduleSave();
  };

  const go = (i: number) => {
    setIndex(i);
    stateRef.current = { ...stateRef.current, index: i };
    scheduleSave();
  };

  const toggleComplete = async () => {
    if (!isSignedIn) return toast.error("Sign in to track your progress");
    const next = !progress?.completed;
    try {
      const data = await put({ action: "complete", completed: next });
      setProgress((p) => ({ ...(p as SavedProgress), ...data.progress }));
      toast.success(next ? "Marked as completed" : "Marked as not completed");
    } catch {
      toast.error("Could not update. Try again.");
    }
  };

  const discardSession = async () => {
    try {
      const data = await put({ action: "discard" });
      setProgress(data.progress);
    } catch {
      toast.error("Could not discard. Try again.");
    }
  };

  const answeredCount = answers.filter((a) => a >= 0).length;
  const result = useMemo(() => {
    if (phase !== "result") return null;
    let correct = 0;
    const rows = order.map((qi, pos) => {
      const chosen = answers[pos];
      const q = questions[qi];
      const ok = chosen === q.answer;
      if (ok) correct++;
      return { qi, q, chosen, ok };
    });
    const pct = order.length ? Math.round((correct / order.length) * 100) : 0;
    return { rows, correct, pct };
  }, [phase, order, answers, questions]);

  // ======================================================================
  // MENU
  // ======================================================================
  if (phase === "menu") {
    const hasSession = !!progress?.session;
    const missed = progress?.missed ?? [];
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal">{total} MCQs available</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal">Instant explanations</span>
            {progress?.completed && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              </span>
            )}
            {progress && progress.attempts > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Best {progress.bestScore}% · {progress.attempts} attempt{progress.attempts === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loadingProgress && isSignedIn ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your progress…
            </div>
          ) : null}

          {hasSession && progress?.session && (
            <div className="mb-6 rounded-xl border border-teal/30 bg-teal/5 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-800 text-sm">Continue where you left off</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {progress.session.mode === "test" ? "Test" : "Practice"} · {progress.session.answers.filter((a) => a >= 0).length} of{" "}
                  {progress.session.order.length} answered
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={resume} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-teal text-white hover:bg-teal-dark transition-all">
                  <PlayCircle className="w-4 h-4" /> Resume
                </button>
                <button onClick={discardSession} className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 transition-all">
                  Discard
                </button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-teal" />
                <h3 className="font-semibold text-gray-800">Practice mode</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">All {total} questions, no time limit. You see the answer and explanation straight after each question.</p>
              <button onClick={startPractice} className="w-full px-4 py-2.5 rounded-full text-sm font-medium bg-teal text-white hover:bg-teal-dark transition-all">
                Start practice
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-5 h-5 text-teal" />
                <h3 className="font-semibold text-gray-800">Test mode</h3>
              </div>
              <p className="text-sm text-gray-500 mb-3">Random questions against the clock ({SECONDS_PER_QUESTION}s each). Answers are shown at the end.</p>
              <div className="flex gap-2">
                <select
                  value={testCount}
                  onChange={(e) => setTestCount(parseInt(e.target.value, 10))}
                  className="px-3 py-2.5 rounded-full text-sm bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal"
                  aria-label="Number of questions"
                >
                  {[...TEST_SIZES.filter((n) => n < total), total].map((n) => (
                    <option key={n} value={n}>
                      {n} MCQs
                    </option>
                  ))}
                </select>
                <button onClick={startTest} className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium bg-navy text-white hover:opacity-90 transition-all">
                  Start test
                </button>
              </div>
            </div>
          </div>

          {missed.length > 0 && (
            <button
              onClick={() => retryMissed(missed)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Retry {missed.length} missed question{missed.length === 1 ? "" : "s"} from last attempt
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={backHref} className="text-sm text-gray-600 hover:text-teal transition-colors">
            ← Back to units
          </Link>
          {isLoaded && isSignedIn ? (
            <button
              onClick={toggleComplete}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                progress?.completed ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-gray-700 border-gray-200 hover:border-teal/40 hover:text-teal"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {progress?.completed ? "Completed — click to undo" : "Mark as completed"}
            </button>
          ) : isLoaded ? (
            <p className="text-xs text-gray-500">Sign in to save your progress, streak and completed units.</p>
          ) : null}
        </div>
      </div>
    );
  }

  // ======================================================================
  // RESULT
  // ======================================================================
  if (phase === "result" && result) {
    const msg = result.pct >= 80 ? "Excellent work!" : result.pct >= 60 ? "Good job — keep going." : "Keep practising — review the explanations below.";
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className="w-32 h-32 rounded-full grid place-items-center shrink-0"
              style={{ background: `conic-gradient(#14b8a6 ${result.pct * 3.6}deg, rgba(148,163,184,.25) 0deg)` }}
              role="img"
              aria-label={`Score ${result.pct} percent`}
            >
              <div className="w-24 h-24 rounded-full bg-white grid place-items-center">
                <span className="text-2xl font-bold text-gray-800">{result.pct}%</span>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-800">{msg}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {unitName} · {mode === "test" ? "Test" : "Practice"}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3 text-xs font-medium">
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">{result.correct} correct</span>
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">{order.length - result.correct - result.rows.filter((r) => r.chosen < 0).length} wrong</span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600">{result.rows.filter((r) => r.chosen < 0).length} skipped</span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {fmt(elapsed)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {missedNow.length > 0 && (
              <button onClick={() => retryMissed(missedNow)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-teal text-white hover:bg-teal-dark transition-all">
                <RotateCcw className="w-4 h-4" /> Retry {missedNow.length} missed
              </button>
            )}
            <button onClick={mode === "test" ? startTest : startPractice} className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-teal/40 hover:text-teal transition-all">
              {mode === "test" ? "New test" : "Practise again"}
            </button>
            <button onClick={() => setPhase("menu")} className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-teal/40 hover:text-teal transition-all">
              Back to menu
            </button>
            {isSignedIn && (
              <button
                onClick={toggleComplete}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  progress?.completed ? "bg-green-50 text-green-700 border-green-200" : "border-gray-200 text-gray-700 hover:border-teal/40 hover:text-teal"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {progress?.completed ? "Completed" : "Mark as completed"}
              </button>
            )}
          </div>
          {!isSignedIn && <p className="text-xs text-gray-500 mt-4">Sign in to save results, track your streak and use &ldquo;retry missed&rdquo; later.</p>}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Review</h3>
          {result.rows.map((r, i) => (
            <div key={`${r.qi}-${i}`} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start gap-3">
                {r.chosen < 0 ? (
                  <Flag className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                ) : r.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800 wrap-break-word">
                    {i + 1}. {r.q.q}
                  </p>
                  <p className="text-sm mt-2 text-gray-600 wrap-break-word">
                    Your answer:{" "}
                    <span className={r.chosen < 0 ? "text-gray-400" : r.ok ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                      {r.chosen < 0 ? "Not answered" : `${LETTERS[r.chosen]}. ${r.q.options[r.chosen]}`}
                    </span>
                  </p>
                  {!r.ok && (
                    <p className="text-sm mt-1 text-gray-600 wrap-break-word">
                      Correct answer: <span className="text-green-700 font-medium">{LETTERS[r.q.answer]}. {r.q.options[r.q.answer]}</span>
                    </p>
                  )}
                  {r.q.explanation && <p className="text-sm mt-2 text-gray-500 wrap-break-word">{r.q.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ======================================================================
  // QUIZ
  // ======================================================================
  const q = questions[order[index]];
  const chosen = answers[index];
  const revealed = mode === "practice" && chosen >= 0;
  const remaining = limit - elapsed;
  const pct = order.length ? Math.round(((index + 1) / order.length) * 100) : 0;
  const isLast = index === order.length - 1;

  const confirmFinish = () => {
    const unanswered = order.length - answeredCount;
    if (unanswered > 0 && !window.confirm(`${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered. Submit anyway?`)) return;
    void finish();
  };

  const optionClass = (i: number) => {
    const base = "w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-all ";
    if (revealed) {
      if (i === q.answer) return base + "border-green-300 bg-green-50 text-green-800";
      if (i === chosen) return base + "border-red-300 bg-red-50 text-red-700";
      return base + "border-gray-200 text-gray-500 opacity-70";
    }
    if (mode === "test" && i === chosen) return base + "border-teal bg-teal/10 text-gray-800";
    return base + "border-gray-200 bg-white text-gray-700 hover:border-teal/50 hover:bg-teal/5";
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-sm font-medium text-gray-700">
            Question {index + 1} of {order.length}
          </p>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {mode === "test" ? `${fmt(remaining)} left` : fmt(elapsed)}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal">{mode === "test" ? "Test" : "Instant feedback"}</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-teal transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4" role="navigation" aria-label="Question palette">
          {order.map((qi, pos) => {
            const a = answers[pos];
            let cls = "bg-white text-gray-600 border-gray-200";
            if (a >= 0) {
              if (mode === "practice") cls = a === questions[qi].answer ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-600 border-red-300";
              else cls = "bg-teal/10 text-teal border-teal/40";
            }
            if (pos === index) cls += " ring-2 ring-teal";
            return (
              <button key={pos} onClick={() => go(pos)} className={`w-8 h-8 rounded-full border text-xs font-medium ${cls}`} aria-label={`Go to question ${pos + 1}`}>
                {pos + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-7">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 wrap-break-word">{q.q}</h2>
        <div className="mt-5 space-y-2.5">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => choose(i)} disabled={revealed} className={optionClass(i)}>
              <span className="font-semibold shrink-0">{LETTERS[i]}.</span>
              <span className="wrap-break-word min-w-0">{opt}</span>
            </button>
          ))}
        </div>

        {revealed && (
          <div className={`mt-5 rounded-xl border p-4 text-sm ${chosen === q.answer ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            <p className="font-semibold">{chosen === q.answer ? "Correct!" : `Incorrect — the answer is ${LETTERS[q.answer]}.`}</p>
            {q.explanation && <p className="mt-1 opacity-90 wrap-break-word">{q.explanation}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => go(Math.max(0, index - 1))}
          disabled={index === 0}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-teal/40 hover:text-teal disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex gap-2">
          {mode === "practice" && (
            <button
              onClick={() => {
                if (saveTimer.current) clearTimeout(saveTimer.current);
                if (isSignedIn) scheduleSave();
                toast.success(isSignedIn ? "Progress saved" : "Sign in to save progress");
                setPhase("menu");
                if (isSignedIn) setProgress((p) => ({ ...(p ?? ({} as SavedProgress)), session: { mode, order, answers, index, elapsedSec: elapsed } }));
              }}
              className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-teal/40 hover:text-teal transition-all"
            >
              Save &amp; exit
            </button>
          )}
          {isLast || mode === "test" ? (
            <button onClick={confirmFinish} disabled={finishing} className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-teal text-white hover:bg-teal-dark disabled:opacity-60 transition-all">
              {finishing && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "test" ? "Submit test" : "Finish"}
            </button>
          ) : null}
          {!isLast && (
            <button onClick={() => go(index + 1)} className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-teal text-white hover:bg-teal-dark transition-all">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
