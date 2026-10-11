"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, ChevronRight, PlayCircle, Search, X } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Record<string, UnitStatus>>({});
  const [resume, setResume] = useState<ResumeItem[]>([]);
  const readyRef = useRef(false);
  const scrolledRef = useRef(false);

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
    url.searchParams.delete("sub");
    window.history.replaceState(null, "", url.toString());
  }, [spSlug, sem]);

  // ---- scroll to a subject coming from an old link -------------------------
  useEffect(() => {
    if (scrolledRef.current || !sem) return;
    const sub = initial?.sub || new URLSearchParams(window.location.search).get("sub");
    if (!sub) return;
    scrolledRef.current = true;
    requestAnimationFrame(() => document.getElementById(`subject-${sub}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [sem, initial]);

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

  const UnitRow = ({ sp, sub, u, showPath }: { sp: McqCatalogSpecialty; sub: McqCatalogSubject; u: McqCatalogUnit; showPath?: boolean }) => {
    const st = status[u.id];
    return (
      <Link
        href={unitHref(sp, sub, u)}
        className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 hover:border-teal/40 hover:bg-teal/5 transition-all"
      >
        <span className="shrink-0">
          {st?.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : st?.inProgress ? (
            <PlayCircle className="w-5 h-5 text-teal" />
          ) : (
            <span className="block w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-teal/50" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text-primary [overflow-wrap:anywhere]">{u.name}</span>
          {showPath && (
            <span className="block text-xs text-gray-400 truncate">
              {sp.name} · Sem {sub.semester} · {sub.name}
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-gray-400">
          {st?.attempts ? `Best ${st.bestScore}%` : st?.inProgress ? "In progress" : u.qCount ? `${u.qCount} Qs` : ""}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal shrink-0" />
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
            <UnitRow key={u.id} sp={sp} sub={sub} u={u} showPath />
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
                    className="shrink-0 w-64 rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 hover:border-teal transition-all"
                  >
                    <span className="flex items-center gap-2 text-xs font-medium text-teal">
                      <PlayCircle className="w-4 h-4" /> {r.answered}/{r.sessionTotal} answered
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
                  onClick={() => setSem(n)}
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

          {/* subjects + units, all visible */}
          {subjectsHere.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No MCQs in this semester yet.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {subjectsHere.map((sub) => (
                <section key={sub.id} id={`subject-${sub.slug}`} className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 scroll-mt-24">
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h2 className="font-semibold text-text-primary [overflow-wrap:anywhere]">{sub.name}</h2>
                    <span className="text-xs text-gray-400 shrink-0">
                      {sub.units.length} unit{sub.units.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sub.units.map((u) => (
                      <UnitRow key={u.id} sp={specialty} sub={sub} u={u} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
