"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, ChevronRight, Loader2, PlayCircle, Search, X } from "lucide-react";
import type { McqCatalogSpecialty, McqCatalogSubject, McqCatalogUnit } from "@/lib/mcq";

interface UnitStatus {
  completed: boolean;
  bestScore: number;
  attempts: number;
  inProgress: boolean;
}

interface ResumeItem {
  unitId: string;
  unitName: string;
  subjectName: string;
  href: string;
  answered: number;
  sessionTotal: number;
}

interface Props {
  catalog: McqCatalogSpecialty[];
  /** Pre-selected values from the URL (old links redirect here). */
  initial?: { s?: string; sem?: string; sub?: string };
}

const STORE_KEY = "mcq-hub-selection";

const unitHref = (sp: McqCatalogSpecialty, sub: McqCatalogSubject, u: McqCatalogUnit) =>
  `/mcqs/${sp.slug}/${sub.semester}/${sub.slug}/${u.slug}`;

/**
 * One-page MCQ hub: pick specialty and semester with two rows of pills and tap a unit — the
 * subjects and their units are listed right there. Search spans everything. Remembers your last
 * choice; signed-in users also see ticks and a "continue" strip.
 */
export function McqBrowser({ catalog, initial }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const [spSlug, setSpSlug] = useState<string>("");
  const [sem, setSem] = useState<number>(0);
  const [subSlug, setSubSlug] = useState<string>("");
  const [opening, setOpening] = useState<string>("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Record<string, UnitStatus>>({});
  const [resume, setResume] = useState<ResumeItem[]>([]);
  const readyRef = useRef(false);

  const specialty = useMemo(() => catalog.find((c) => c.slug === spSlug) ?? catalog[0], [catalog, spSlug]);

  /** subjects of the selected specialty grouped by semester */
  const bySemester = useMemo(() => {
    const map = new Map<number, McqCatalogSubject[]>();
    for (const sub of specialty?.subjects ?? []) {
      const list = map.get(sub.semester) ?? [];
      list.push(sub);
      map.set(sub.semester, list);
    }
    return map;
  }, [specialty]);

  const semesters = useMemo(
    () => Array.from({ length: specialty?.semesterCount ?? 8 }, (_, i) => i + 1),
    [specialty]
  );

  // ---- initial selection: URL → last visit → first with content ------------
  useEffect(() => {
    if (!catalog.length) return;
    let saved: { s?: string; sem?: number } = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}");
    } catch {
      /* storage unavailable */
    }
    const params = new URLSearchParams(window.location.search);
    const wantSlug = initial?.s || params.get("s") || saved.s;
    const sp = catalog.find((c) => c.slug === wantSlug) ?? catalog.find((c) => c.subjects.length) ?? catalog[0];

    const semsWithContent = [...new Set(sp.subjects.map((x) => x.semester))].sort((a, b) => a - b);
    const wantSem = Number(initial?.sem || params.get("sem") || saved.sem || 0);
    const pick = semsWithContent.includes(wantSem) ? wantSem : semsWithContent[0] ?? 1;

    setSpSlug(sp.slug);
    setSem(pick);
    setSubSlug(initial?.sub || params.get("sub") || "");
    readyRef.current = true;
  }, [catalog, initial]);

  // ---- keep URL + memory in sync ------------------------------------------
  useEffect(() => {
    if (!readyRef.current || !spSlug || !sem) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ s: spSlug, sem }));
    } catch {
      /* ignore */
    }
    const url = new URL(window.location.href);
    url.searchParams.set("s", spSlug);
    url.searchParams.set("sem", String(sem));
    if (subSlug) url.searchParams.set("sub", subSlug);
    else url.searchParams.delete("sub");
    window.history.replaceState(null, "", url.toString());
  }, [spSlug, sem, subSlug]);

  // clear the "opening…" state if the page is restored from the back/forward cache
  useEffect(() => {
    const clear = () => setOpening("");
    window.addEventListener("pageshow", clear);
    return () => window.removeEventListener("pageshow", clear);
  }, []);

  // ---- signed-in extras ----------------------------------------------------
  const loadProgress = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch("/api/mcq/progress/units", { cache: "no-store" }),
        fetch("/api/mcq/progress/summary", { cache: "no-store" }),
      ]);
      if (a.ok) setStatus((await a.json()).progress ?? {});
      if (b.ok) setResume(((await b.json()).resume ?? []) as ResumeItem[]);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) void loadProgress();
  }, [isLoaded, isSignedIn, loadProgress]);

  // ---- search --------------------------------------------------------------
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    const out: { sp: McqCatalogSpecialty; sub: McqCatalogSubject; u: McqCatalogUnit }[] = [];
    for (const sp of catalog) {
      for (const sub of sp.subjects) {
        const subjectHit = sub.name.toLowerCase().includes(q);
        for (const u of sub.units) {
          if (subjectHit || u.name.toLowerCase().includes(q)) out.push({ sp, sub, u });
        }
      }
    }
    return out.slice(0, 40);
  }, [q, catalog]);

  if (!catalog.length) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-semibold text-gray-700">No MCQs yet</p>
        <p className="text-gray-400 mt-1">They will appear here once they are added. Check back soon!</p>
      </div>
    );
  }

  const subjectsHere = bySemester.get(sem) ?? [];
  const activeSub = subjectsHere.find((s) => s.slug === subSlug) ?? subjectsHere[0];

  /** instant feedback: mark the tapped unit as "opening" (ignores ctrl/cmd/middle clicks) */
  const onOpen = (id: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    setOpening(id);
  };

  const UnitRow = ({ sp, sub, u }: { sp: McqCatalogSpecialty; sub: McqCatalogSubject; u: McqCatalogUnit }) => {
    const st = status[u.id];
    const busy = opening === u.id;
    return (
      <Link
        href={unitHref(sp, sub, u)}
        onClick={onOpen(u.id)}
        className={`group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-all active:scale-[0.99] ${
          busy ? "border-teal bg-teal/5" : "border-gray-100 hover:border-teal/40 hover:bg-teal/5"
        }`}
      >
        <span className="shrink-0">
          {busy ? (
            <Loader2 className="w-5 h-5 text-teal animate-spin" />
          ) : st?.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : st?.inProgress ? (
            <PlayCircle className="w-5 h-5 text-teal" />
          ) : (
            <span className="block w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-teal/50" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text-primary [overflow-wrap:anywhere]">{u.name}</span>
          <span className="block text-xs text-gray-400 truncate">
            {sp.name} · Sem {sub.semester} · {sub.name}
          </span>
        </span>
        <span className="shrink-0 text-xs text-gray-400">{busy ? "Opening…" : st?.attempts ? `Best ${st.bestScore}%` : u.qCount ? `${u.qCount} Qs` : ""}</span>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal shrink-0" />
      </Link>
    );
  };

  const UnitTile = ({ sp, sub, u, n }: { sp: McqCatalogSpecialty; sub: McqCatalogSubject; u: McqCatalogUnit; n: number }) => {
    const st = status[u.id];
    const busy = opening === u.id;
    const state = st?.completed ? "done" : st?.inProgress ? "progress" : "new";
    return (
      <Link
        href={unitHref(sp, sub, u)}
        onClick={onOpen(u.id)}
        className={`group relative flex flex-col justify-between gap-3 rounded-2xl border p-4 min-h-[112px] transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
          busy
            ? "border-teal bg-teal/5 shadow-md"
            : state === "done"
              ? "border-green-200 bg-green-50/60 hover:border-green-300"
              : state === "progress"
                ? "border-teal/40 bg-teal/5 hover:border-teal"
                : "border-gray-200 bg-white hover:border-teal/50"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`shrink-0 grid place-items-center w-8 h-8 rounded-lg text-sm font-bold ${
              state === "done" ? "bg-green-500 text-white" : "bg-navy text-white group-hover:bg-teal"
            } transition-colors`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : state === "done" ? <CheckCircle2 className="w-4 h-4" /> : n}
          </span>
          <span className="min-w-0 text-sm font-semibold leading-snug text-text-primary line-clamp-3 [overflow-wrap:anywhere]">{u.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">{u.qCount ? `${u.qCount} questions` : "MCQs"}</span>
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              busy ? "text-teal" : state === "done" ? "text-green-600" : state === "progress" ? "text-teal" : "text-teal opacity-0 group-hover:opacity-100 max-sm:opacity-100"
            } transition-opacity`}
          >
            {busy ? "Opening…" : state === "done" ? `Best ${st?.bestScore ?? 0}%` : state === "progress" ? "Resume" : "Start"}
            {!busy && <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any unit or subject…"
          aria-label="Search MCQ units"
          className="w-full rounded-full border border-gray-200 bg-white pl-11 pr-10 py-3 text-sm focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {q ? (
        <section aria-label="Search results" className="space-y-2">
          <p className="text-sm text-gray-500">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          {results.map(({ sp, sub, u }) => (
            <UnitRow key={u.id} sp={sp} sub={sub} u={u} />
          ))}
          {results.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nothing found. Try a shorter word.</p>}
        </section>
      ) : (
        <>
          {resume.length > 0 && (
            <section aria-label="Continue where you left off">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Continue where you left off</h2>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                {resume.map((r) => (
                  <Link
                    key={r.unitId}
                    href={r.href}
                    onClick={onOpen(r.unitId)}
                    className="shrink-0 w-64 rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 hover:border-teal transition-all"
                  >
                    <span className="flex items-center gap-2 text-xs font-medium text-teal">
                      {opening === r.unitId ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}{" "}
                      {opening === r.unitId ? "Opening…" : `${r.answered}/${r.sessionTotal} answered`}
                    </span>
                    <span className="block text-sm font-medium text-text-primary mt-1 truncate">{r.unitName}</span>
                    <span className="block text-xs text-gray-500 truncate">{r.subjectName}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* specialty */}
          <div role="tablist" aria-label="Specialty" className="flex gap-2 overflow-x-auto pb-1">
            {catalog.map((c) => {
              const active = c.slug === specialty.slug;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSpSlug(c.slug);
                    const sems = [...new Set(c.subjects.map((x) => x.semester))].sort((a, b) => a - b);
                    setSem(sems.includes(sem) ? sem : sems[0] ?? 1);
                    setSubSlug("");
                  }}
                  className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                    active ? "bg-navy text-white border-navy shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-teal/40 hover:text-teal"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* semester */}
          <div role="tablist" aria-label="Semester" className="flex gap-2 overflow-x-auto pb-1">
            {semesters.map((n) => {
              const count = bySemester.get(n)?.length ?? 0;
              const active = n === sem;
              return (
                <button
                  key={n}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={count === 0}
                  onClick={() => {
                    setSem(n);
                    setSubSlug("");
                  }}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-40 disabled:pointer-events-none ${
                    active ? "bg-teal text-white border-teal" : "bg-white text-gray-600 border-gray-200 hover:border-teal/40 hover:text-teal"
                  }`}
                >
                  Sem {n}
                  {count > 0 && <span className={`ml-1.5 text-xs ${active ? "text-white/80" : "text-gray-400"}`}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* subject picker + units of the chosen subject only */}
          {!activeSub ? (
            <p className="text-center text-gray-400 py-12 text-sm">No MCQs in this semester yet.</p>
          ) : (
            <div className="space-y-4">
              <div role="tablist" aria-label="Subject" className="flex flex-wrap gap-2">
                {subjectsHere.map((sub) => {
                  const active = sub.id === activeSub.id;
                  const done = sub.units.filter((u) => status[u.id]?.completed).length;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSubSlug(sub.slug)}
                      className={`group inline-flex items-center gap-2 max-w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold text-left transition-all ${
                        active
                          ? "bg-gradient-to-br from-navy to-navy-light text-white border-navy shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-teal/50 hover:text-teal"
                      }`}
                    >
                      <span className="truncate">{sub.name}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-teal/10 group-hover:text-teal"
                        }`}
                      >
                        {done > 0 ? `${done}/${sub.units.length}` : sub.units.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              <section key={activeSub.id} aria-label={`${activeSub.name} units`} className="mcq-fade rounded-3xl bg-white shadow-sm border border-gray-100 p-4 sm:p-6">
                {(() => {
                  const done = activeSub.units.filter((u) => status[u.id]?.completed).length;
                  const pct = activeSub.units.length ? Math.round((done / activeSub.units.length) * 100) : 0;
                  return (
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h2 className="text-lg font-bold text-text-primary [overflow-wrap:anywhere]">{activeSub.name}</h2>
                      <div className="shrink-0 flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          {activeSub.units.length} unit{activeSub.units.length === 1 ? "" : "s"}
                        </span>
                        {isSignedIn && (
                          <span className="hidden sm:flex items-center gap-2">
                            <span className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <span className="block h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
                            </span>
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeSub.units.map((u, i) => (
                    <UnitTile key={u.id} sp={specialty} sub={activeSub} u={u} n={i + 1} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
