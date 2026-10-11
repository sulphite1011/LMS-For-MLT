export const STUDY_TZ = "Asia/Karachi";

/** YYYY-MM-DD of a date in the study timezone. */
export function dayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STUDY_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

/**
 * Current streak = consecutive study days ending today (or yesterday, so the streak is not shown
 * as broken before the student has studied today). Also returns the longest streak in `days`.
 */
export function computeStreak(days: string[], today: string = dayKey()): { current: number; longest: number; studiedToday: boolean } {
  const set = new Set(days);
  const studiedToday = set.has(today);
  let cursor = studiedToday ? today : shiftDay(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }
  return { current, longest, studiedToday };
}
