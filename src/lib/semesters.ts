/** Semesters students can choose / admins can target (MLT program: 8 semesters). */
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function isValidSemester(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= SEMESTERS.length;
}

/** Parses "3" / 3 into a valid semester number, else undefined. */
export function parseSemesterValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return isValidSemester(n) ? n : undefined;
}

export function semesterLabel(semester?: number | null): string {
  return semester ? `Semester ${semester}` : "All students";
}
