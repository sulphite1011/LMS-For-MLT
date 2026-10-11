"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import "./mcq-player.css";

export interface PlayerQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface SavedProgress {
  completed?: boolean;
  attempts?: number;
  bestScore?: number;
  missed?: number[];
  session?: {
    mode: "practice" | "test";
    order: number[];
    answers: number[];
    index: number;
    elapsedSec: number;
  };
}

type Mode = "practice" | "test";
type Phase = "setup" | "quiz" | "result" | "review";

interface Props {
  unitId: string;
  unitName: string;
  questions: PlayerQuestion[];
  backHref: string;
}

const LETTERS = "ABCDEFGH";
const TEST_SIZES = [3, 5, 10, 15, 20, 25, 30, 40, 50];
/** Standard: 1.5 minutes per MCQ. */
const SECONDS_PER_QUESTION = 90;
/** Visitors can answer this many MCQs (in total) before being asked to create a free account. */
const FREE_LIMIT = 10;
const FREE_KEY = "mcq-free-answers";

function allIndexes(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function shuffled(n: number): number[] {
  const a = allIndexes(n);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(total: number): string {
  const t = Math.max(0, Math.floor(total));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function readFree(): number {
  try {
    return Math.max(0, parseInt(window.localStorage.getItem(FREE_KEY) || "0", 10) || 0);
  } catch {
    return 0;
  }
}

function writeFree(n: number) {
  try {
    window.localStorage.setItem(FREE_KEY, String(n));
  } catch {
    /* storage may be unavailable */
  }
}

export function McqPlayer({ unitId, unitName, questions, backHref }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname();
  const total = questions.length;

  const testOptions = useMemo(() => {
    const values = TEST_SIZES.filter((n) => n < total);
    values.push(total);
    return [...new Set(values)].sort((a, b) => a - b);
  }, [total]);

  const [mode, setMode] = useState<Mode>("practice");
  const [phase, setPhase] = useState<Phase>("quiz");
  const [testSize, setTestSize] = useState(Math.min(5, total));
  const [order, setOrder] = useState<number[]>(() => allIndexes(total));
  const [answers, setAnswers] = useState<number[]>(() => Array(total).fill(-1));
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<SavedProgress | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [missedNow, setMissedNow] = useState<number[]>([]);
  const [freeUsed, setFreeUsed] = useState(0);
  const [gate, setGate] = useState(false);

  const stateRef = useRef({ mode, order, answers, index, elapsed });
  stateRef.current = { mode, order, answers, index, elapsed };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visitor = isLoaded && !isSignedIn;

  // ---- saved progress / free-answer counter --------------------------------
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setFreeUsed(readFree());
      return;
    }
    let cancelled = false;
    fetch(`/api/mcq/progress?unitId=${unitId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setProgress(d?.progress ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [unitId, isLoaded, isSignedIn]);

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

  const saveNow = useCallback(async () => {
    const s = stateRef.current;
    if (!isSignedIn || !s.order.length) return null;
    return put({ action: "save", mode: s.mode, order: s.order, answers: s.answers, index: s.index, elapsedSec: s.elapsed });
  }, [isSignedIn, put]);

  const scheduleSave = useCallback(() => {
    if (!isSignedIn) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNow().catch(() => {});
    }, 700);
  }, [isSignedIn, saveNow]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  // ---- timer (test mode) ---------------------------------------------------
  const limit = mode === "test" ? order.length * SECONDS_PER_QUESTION : 0;
  const remaining = Math.max(0, limit - elapsed);

  useEffect(() => {
    if (mode !== "test" || phase !== "quiz") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [mode, phase]);

  const finish = useCallback(async () => {
    const s = stateRef.current;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setFinishing(true);
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

  useEffect(() => {
    if (mode === "test" && phase === "quiz" && limit > 0 && elapsed >= limit && !finishing) {
      toast("Time is up — your test was submitted.");
      void finish();
    }
  }, [mode, phase, limit, elapsed, finishing, finish]);

  // ---- starting / switching ------------------------------------------------
  const begin = (m: Mode, ord: number[], ans?: number[], idx = 0, el = 0) => {
    setMode(m);
    setOrder(ord);
    setAnswers(ans ?? ord.map(() => -1));
    setIndex(idx);
    setElapsed(el);
    setMissedNow([]);
    setPhase("quiz");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetPractice = () => begin("practice", allIndexes(total));

  const goTestSetup = () => {
    setMode("test");
    setOrder([]);
    setAnswers([]);
    setIndex(0);
    setElapsed(0);
    setMissedNow([]);
    setPhase("setup");
  };

  const startTest = () => begin("test", shuffled(total).slice(0, Math.min(testSize, total)));
  const retryMissed = (ids: number[]) => begin("practice", ids);

  const resume = () => {
    const s = progress?.session;
    if (!s || !s.order.every((q) => q >= 0 && q < total)) return resetPractice();
    begin(s.mode, s.order, s.answers, s.index, s.elapsedSec);
  };

  const discardSession = async () => {
    try {
      const data = await put({ action: "discard" });
      setProgress(data.progress);
    } catch {
      toast.error("Could not discard. Try again.");
    }
  };

  // ---- interaction ---------------------------------------------------------
  const choose = (opt: number) => {
    if (phase !== "quiz") return;
    if (mode === "practice" && answers[index] >= 0) return; // locked after answering
    const isNew = answers[index] < 0;

    if (visitor && isNew && freeUsed >= FREE_LIMIT) {
      setGate(true);
      return;
    }

    setAnswers((prev) => {
      const next = [...prev];
      next[index] = opt;
      stateRef.current = { ...stateRef.current, answers: next };
      return next;
    });
    scheduleSave();

    if (visitor && isNew) {
      const n = freeUsed + 1;
      setFreeUsed(n);
      writeFree(n);
      if (n >= FREE_LIMIT) setGate(true);
    }
  };

  const go = (i: number) => {
    setIndex(i);
    stateRef.current = { ...stateRef.current, index: i };
    scheduleSave();
  };

  const saveAndExit = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const data = await saveNow();
      if (data) setProgress(data.progress);
      toast.success("Progress saved. Pick up where you left off any time.");
    } catch {
      toast.error("Could not save. Try again.");
      return;
    }
    resetPractice();
  };

  const toggleComplete = async () => {
    if (!isSignedIn) return toast.error("Sign in to track your progress");
    const next = !progress?.completed;
    try {
      const data = await put({ action: "complete", completed: next });
      setProgress((p) => ({ ...(p ?? {}), ...data.progress }));
      toast.success(next ? "Marked as completed" : "Marked as not completed");
    } catch {
      toast.error("Could not update. Try again.");
    }
  };

  const confirmFinish = () => {
    const unanswered = answers.filter((a) => a < 0).length;
    if (unanswered > 0 && !window.confirm(`${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered. Submit anyway?`)) return;
    void finish();
  };

  // ---- derived -------------------------------------------------------------
  const answeredCount = answers.filter((a) => a >= 0).length;
  const correctCount = order.reduce((sum, qi, pos) => sum + (answers[pos] === questions[qi]?.answer ? 1 : 0), 0);
  const livePercent = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const hideScore = mode === "test" && phase === "quiz";
  const savedSession = progress?.session;
  const showResume = !!savedSession && phase === "quiz" && answeredCount === 0 && !(mode === "test");

  const authQuery = `?redirect_url=${encodeURIComponent(pathname || "/mcqs")}`;

  // ======================================================================
  // main panel
  // ======================================================================
  let main: React.ReactNode;

  if (phase === "setup") {
    main = (
      <div className="test-setup">
        <div className="test-setup-icon">✓</div>
        <h2>Set up your test</h2>
        <p>Choose how many {unitName} MCQs you want to attempt. You get 1.5 minutes per MCQ.</p>
        <div className="test-setup-form">
          <label className="test-setup-label" htmlFor="mcqp-test-count">
            Number of MCQs
          </label>
          <select id="mcqp-test-count" className="test-count-select" value={testSize} onChange={(e) => setTestSize(Number(e.target.value))}>
            {testOptions.map((n) => (
              <option key={n} value={n}>
                {n} MCQs
              </option>
            ))}
          </select>
          <div className="test-setup-actions">
            <button className="btn btn-primary" type="button" onClick={startTest}>
              Start Test
            </button>
          </div>
        </div>
      </div>
    );
  } else if (phase === "result") {
    const unanswered = answers.filter((a) => a < 0).length;
    const incorrect = order.length - correctCount - unanswered;
    const percent = order.length ? Math.round((correctCount / order.length) * 100) : 0;
    main = (
      <div className="result">
        <div className="result-ring" data-score={`${percent}%`} style={{ "--score": `${percent * 3.6}deg` } as React.CSSProperties} />
        <h2>{mode === "test" ? "Test complete" : "Practice complete"}</h2>
        <p>
          Here is your {unitName} result for {order.length} MCQs{mode === "test" ? ` · ${formatTime(elapsed)} used` : ""}.
        </p>
        <div className="result-stats">
          <div className="result-stat">
            <strong>{correctCount}</strong>
            <span>Correct</span>
          </div>
          <div className="result-stat">
            <strong>{incorrect}</strong>
            <span>Incorrect</span>
          </div>
          <div className="result-stat">
            <strong>{unanswered}</strong>
            <span>Unanswered</span>
          </div>
        </div>
        <div className="result-actions">
          <button className="btn btn-primary" type="button" onClick={() => setPhase("review")}>
            Review with explanations
          </button>
          {missedNow.length > 0 && (
            <button className="btn btn-secondary" type="button" onClick={() => retryMissed(missedNow)}>
              Retry {missedNow.length} missed
            </button>
          )}
          <button className="btn btn-secondary" type="button" onClick={() => (mode === "test" ? goTestSetup() : resetPractice())}>
            {mode === "test" ? "Retake test" : "Practise again"}
          </button>
          {isSignedIn && (
            <button className={`btn ${progress?.completed ? "btn-done" : "btn-secondary"}`} type="button" onClick={toggleComplete}>
              {progress?.completed ? "✓ Completed" : "Mark as completed"}
            </button>
          )}
        </div>
        {visitor && <p className="notice">Create a free account to save results, keep a streak and use “retry missed” later.</p>}
      </div>
    );
  } else if (phase === "review") {
    main = (
      <div className="question">
        <div className="q-top">
          <div className="q-label">
            <span className="q-number">✓</span>
            Review
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => setPhase("result")}>
            Back to result
          </button>
        </div>
        <div className="review-list">
          {order.map((qi, i) => {
            const q = questions[qi];
            const sel = answers[i];
            const unanswered = sel < 0;
            const good = sel === q.answer;
            return (
              <article className="review-item" key={`${qi}-${i}`}>
                <div className={`review-badge ${unanswered ? "empty" : good ? "good" : "bad"}`}>
                  {unanswered ? "Not answered" : good ? "Correct" : "Incorrect"}
                </div>
                <div className="review-q">
                  {i + 1}. {q.q}
                </div>
                <div className="review-answer">
                  <strong>Your answer:</strong> {unanswered ? "No answer" : `${LETTERS[sel]} — ${q.options[sel]}`}
                </div>
                <div className="review-answer">
                  <strong>Correct answer:</strong> {LETTERS[q.answer]} — {q.options[q.answer]}
                </div>
                {q.explanation && (
                  <div className="review-explanation">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    );
  } else {
    // running question
    const q = questions[order[index]];
    const selected = answers[index];
    const checked = mode === "practice" && selected >= 0;
    const pct = Math.round(((index + 1) / order.length) * 100);
    const last = index === order.length - 1;

    main = (
      <>
        <div className="progress-wrap">
          <div className="progress-head">
            <span className="progress-text">
              Question {index + 1} of {order.length}
            </span>
            <span className="progress-value">{pct}%</span>
          </div>
          <div className="progress">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="question">
          <div className="q-top">
            <div className="q-label">
              <span className="q-number">{index + 1}</span>
              {mode === "practice" ? "Practice question" : "Test question"}
            </div>
            {mode === "test" ? (
              <div className={`timer ${remaining <= 60 ? "danger" : remaining <= 180 ? "warning" : ""}`}>◷ {formatTime(remaining)}</div>
            ) : (
              <div className="timer" style={{ background: "#f1f5f9", color: "#64748b" }}>
                Instant feedback
              </div>
            )}
          </div>

          <h2>{q.q}</h2>

          <div className="options">
            {q.options.map((text, i) => {
              let cls = "option";
              if (selected === i) cls += " selected";
              if (checked && i === q.answer) cls += " correct";
              if (checked && selected === i && i !== q.answer) cls += " incorrect";
              return (
                <button key={i} className={cls} type="button" disabled={checked} onClick={() => choose(i)}>
                  <span className="option-key">{LETTERS[i]}</span>
                  <span className="option-text">{text}</span>
                </button>
              );
            })}
          </div>

          {checked && (
            <div className={`feedback ${selected === q.answer ? "correct" : "incorrect"}`}>
              <div className="feedback-head">{selected === q.answer ? "✓ Correct" : "✕ Incorrect"}</div>
              {q.explanation && (
                <p>
                  <strong>Explanation:</strong> {q.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="controls">
          <button className="btn btn-secondary" type="button" disabled={index === 0} onClick={() => go(Math.max(0, index - 1))}>
            ← Previous
          </button>
          <div className="controls-right">
            {isSignedIn && (
              <button className="btn btn-ghost" type="button" onClick={saveAndExit}>
                Save &amp; exit
              </button>
            )}
            {mode === "test" && !last && (
              <button className="btn btn-danger" type="button" disabled={finishing} onClick={confirmFinish}>
                Submit
              </button>
            )}
            {last ? (
              <button
                className={`btn ${mode === "test" ? "btn-danger" : "btn-primary"}`}
                type="button"
                disabled={finishing}
                onClick={mode === "test" ? confirmFinish : () => void finish()}
              >
                {mode === "test" ? "Submit Test" : "Finish Practice"}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => go(index + 1)}>
                Next →
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ======================================================================
  // page
  // ======================================================================
  const timerChip = mode === "test" && (phase === "quiz" || phase === "result" || phase === "review") ? `${order.length * 1.5} minutes` : "No timer";
  const modeChip = mode === "test" ? (phase === "setup" ? "Choose test size" : `${order.length}-question timed test`) : "Instant explanations";

  return (
    <div className="mcqp">
      <div className="toolbar">
        <div className="mode-switch" role="tablist" aria-label="Quiz mode">
          <button className={`mode-btn ${mode === "practice" ? "active" : ""}`} type="button" onClick={resetPractice}>
            Practice
          </button>
          <button className={`mode-btn ${mode === "test" ? "active" : ""}`} type="button" onClick={goTestSetup}>
            Test Mode
          </button>
        </div>
        <div className="chips">
          <span className="chip">{total} MCQs available</span>
          <span className="chip">{modeChip}</span>
          <span className="chip">{timerChip}</span>
          {progress?.completed && <span className="chip done">✓ Completed</span>}
        </div>
      </div>

      {showResume && savedSession && (
        <div className="resume-card">
          <div>
            <strong>Continue where you left off</strong>
            <span>
              {savedSession.mode === "test" ? "Test" : "Practice"} · {savedSession.answers.filter((a) => a >= 0).length} of{" "}
              {savedSession.order.length} answered
            </span>
          </div>
          <div className="controls-right">
            <button className="btn btn-primary" type="button" onClick={resume}>
              Resume
            </button>
            <button className="btn btn-ghost" type="button" onClick={discardSession}>
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="layout">
        <section className="card main-card">{main}</section>

        <aside className="sidebar">
          <div className="card side-card">
            <h3 className="side-title">Session progress</h3>
            <div className="side-stats">
              <div className="stat">
                <div className="value">{answeredCount}</div>
                <div className="label">Answered</div>
              </div>
              <div className="stat">
                <div className="value">{hideScore ? "—" : `${livePercent}%`}</div>
                <div className="label">{hideScore ? "Score after test" : "Current score"}</div>
              </div>
            </div>
          </div>

          {phase === "setup" && (
            <div className="card side-card">
              <h3 className="side-title">Test settings</h3>
              <label className="test-setup-label" htmlFor="mcqp-test-count-side">
                Number of MCQs
              </label>
              <select id="mcqp-test-count-side" className="test-count-select" value={testSize} onChange={(e) => setTestSize(Number(e.target.value))}>
                {testOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} MCQs
                  </option>
                ))}
              </select>
              <button className="btn btn-primary btn-block" type="button" style={{ marginTop: 10 }} onClick={startTest}>
                Start Test
              </button>
            </div>
          )}

          <div className="card side-card">
            <h3 className="side-title">Questions</h3>
            <div className="palette">
              {order.map((qi, pos) => {
                const a = answers[pos];
                let cls = "q-pill";
                if (mode === "practice" && a >= 0) cls += a === questions[qi].answer ? " correct" : " incorrect";
                else if (mode === "test" && phase === "quiz" && a >= 0) cls += " answered";
                else if (phase !== "quiz" && a >= 0) cls += a === questions[qi].answer ? " correct" : " incorrect";
                if (pos === index && phase === "quiz") cls += " current";
                return (
                  <button
                    key={pos}
                    className={cls}
                    type="button"
                    onClick={() => {
                      if (phase === "result" || phase === "review") return;
                      go(pos);
                    }}
                  >
                    {pos + 1}
                  </button>
                );
              })}
            </div>
            <div className="legend">
              <div className="legend-row">
                <span>Current</span>
                <span className="legend-key current" />
              </div>
              <div className="legend-row">
                <span>Answered</span>
                <span className="legend-key answered" />
              </div>
              <div className="legend-row">
                <span>Correct</span>
                <span className="legend-key correct" />
              </div>
              <div className="legend-row">
                <span>Incorrect</span>
                <span className="legend-key incorrect" />
              </div>
            </div>
          </div>

          <div className="card side-card">
            <h3 className="side-title">My progress</h3>
            {isSignedIn ? (
              <div className="progress-kpi">
                <span>
                  Best score: <strong>{progress?.attempts ? `${progress.bestScore}%` : "—"}</strong>
                </span>
                <span>
                  Attempts: <strong>{progress?.attempts ?? 0}</strong>
                </span>
                <button className={`btn btn-block ${progress?.completed ? "btn-done" : "btn-secondary"}`} type="button" onClick={toggleComplete}>
                  {progress?.completed ? "✓ Completed — undo" : "Mark as completed"}
                </button>
                {(progress?.missed?.length ?? 0) > 0 && phase !== "result" && (
                  <button className="btn btn-secondary btn-block" type="button" onClick={() => retryMissed(progress?.missed ?? [])}>
                    Retry {progress?.missed?.length} missed
                  </button>
                )}
              </div>
            ) : (
              <div className="progress-kpi">
                <span>
                  Free answers: <strong>{Math.min(freeUsed, FREE_LIMIT)} / {FREE_LIMIT}</strong>
                </span>
                <Link className="btn btn-primary btn-block" href={`/sign-up${authQuery}`}>
                  Create free account
                </Link>
              </div>
            )}
          </div>

          <div className="card side-card">
            <h3 className="side-title">Mode</h3>
            <p className="notice" style={{ margin: 0, textAlign: "left" }}>
              {mode === "test"
                ? phase === "setup"
                  ? "Choose the number of MCQs, then start the timed test."
                  : "Test Mode hides the score and explanations until you submit."
                : "Practice shows the correct answer and explanation as soon as you answer."}
            </p>
            <p className="notice" style={{ margin: "10px 0 0", textAlign: "left" }}>
              <Link href={backHref} style={{ color: "var(--teal-dark)" }}>
                ← Back to units
              </Link>
            </p>
          </div>
        </aside>
      </div>

      {gate && (
        <div className="gate-backdrop" role="dialog" aria-modal="true" aria-label="Create a free account">
          <div className="gate">
            <div style={{ fontSize: 34 }}>🎉</div>
            <h3>Nice work — 10 MCQs solved!</h3>
            <p>Create a free account to keep going. It only takes a few seconds.</p>
            <ul>
              <li>Unlock all MCQs</li>
              <li>Save your progress and resume anytime</li>
              <li>Track your record, streak and completed units in your profile</li>
            </ul>
            <div className="gate-actions">
              <Link className="btn btn-primary" href={`/sign-up${authQuery}`}>
                Create free account
              </Link>
              <Link className="btn btn-secondary" href={`/sign-in${authQuery}`}>
                I already have an account
              </Link>
              <button className="btn btn-ghost" type="button" onClick={() => setGate(false)}>
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
