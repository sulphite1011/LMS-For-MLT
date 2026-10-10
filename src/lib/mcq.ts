import { cache } from "react";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqSpecialty from "@/models/McqSpecialty";
import McqSubject from "@/models/McqSubject";
import McqUnit from "@/models/McqUnit";

/** Largest MCQ HTML file accepted (bytes). Kept under typical serverless request-body limits. */
export const MCQ_HTML_MAX_BYTES = 4_000_000;

export const BASE_URL = "https://lms-for-mlt.vercel.app";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Maps errors thrown by requireSuperAdmin()/requireAuth() to 401/403 responses (null = not an auth error). */
export function mcqAuthErrorResponse(error: unknown): NextResponse | null {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Unauthorized")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (message.includes("Forbidden")) {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }
  return null;
}

/** Returns an error message if the string does not look like a usable HTML document, else null. */
export function validateHtmlText(html: string): string | null {
  if (!html.trim()) return "The HTML file is empty";
  if (!/<(!doctype|html|body|div|script|style|head|main|section|form)\b/i.test(html)) {
    return "This does not look like an HTML file";
  }
  return null;
}

const plain = <T,>(value: unknown): T => JSON.parse(JSON.stringify(value));

export interface McqSpecialtyView {
  _id: string;
  name: string;
  slug: string;
  fullName?: string;
  description?: string;
  semesterCount: number;
  subjectCount: number;
  pageCount: number;
}

export interface McqSubjectView {
  _id: string;
  specialtyId: string;
  semester: number;
  name: string;
  slug: string;
  description?: string;
  unitCount: number;
  pageCount: number;
  updatedAt?: string;
}

export interface McqUnitView {
  _id: string;
  subjectId: string;
  specialtyId: string;
  name: string;
  slug: string;
  description?: string;
  hasPage: boolean;
  htmlFileName?: string;
  htmlSize?: number;
  updatedAt?: string;
}

/** All specialties with subject / uploaded-page counts (no HTML is loaded). */
export const getSpecialties = cache(async (): Promise<McqSpecialtyView[]> => {
  await dbConnect();
  const [specialties, subjectCounts, unitCounts] = await Promise.all([
    McqSpecialty.find({}).sort({ createdAt: 1 }).lean(),
    McqSubject.aggregate([{ $group: { _id: "$specialtyId", subjects: { $sum: 1 } } }]),
    McqUnit.aggregate([{ $group: { _id: "$specialtyId", pages: { $sum: { $cond: ["$hasPage", 1, 0] } } } }]),
  ]);
  const subjectsById = new Map<string, number>(
    subjectCounts.map((c: { _id: unknown; subjects: number }): [string, number] => [String(c._id), c.subjects])
  );
  const pagesById = new Map<string, number>(
    unitCounts.map((c: { _id: unknown; pages: number }): [string, number] => [String(c._id), c.pages])
  );
  return plain<McqSpecialtyView[]>(
    specialties.map((s) => ({
      ...s,
      subjectCount: subjectsById.get(String(s._id)) ?? 0,
      pageCount: pagesById.get(String(s._id)) ?? 0,
    }))
  );
});

export const getSpecialtyBySlug = cache(async (slug: string): Promise<McqSpecialtyView | null> => {
  const all = await getSpecialties();
  return all.find((s) => s.slug === slug) ?? null;
});

/** { semester → subject count } for one specialty. */
export const getSemesterStats = cache(async (specialtyId: string) => {
  await dbConnect();
  const rows: { _id: number; subjects: number }[] = await McqSubject.aggregate([
    { $match: { specialtyId: new mongoose.Types.ObjectId(specialtyId) } },
    { $group: { _id: "$semester", subjects: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r): [number, { _id: number; subjects: number }] => [r._id, r]));
});

export const getSubjectsForSemester = cache(
  async (specialtyId: string, semester: number): Promise<McqSubjectView[]> => {
    await dbConnect();
    const subjects = await McqSubject.find({
      specialtyId: new mongoose.Types.ObjectId(specialtyId),
      semester,
    })
      .select("-htmlContent")
      .sort({ name: 1 })
      .lean();
    const counts: { _id: unknown; units: number; pages: number }[] = await McqUnit.aggregate([
      { $match: { subjectId: { $in: subjects.map((s) => s._id) } } },
      { $group: { _id: "$subjectId", units: { $sum: 1 }, pages: { $sum: { $cond: ["$hasPage", 1, 0] } } } },
    ]);
    const byId = new Map(counts.map((c): [string, { units: number; pages: number }] => [String(c._id), c]));
    return plain<McqSubjectView[]>(
      subjects.map((s) => ({
        ...s,
        unitCount: byId.get(String(s._id))?.units ?? 0,
        pageCount: byId.get(String(s._id))?.pages ?? 0,
      }))
    );
  }
);

export const getSubjectBySlug = cache(
  async (specialtyId: string, semester: number, slug: string): Promise<McqSubjectView | null> => {
    const subjects = await getSubjectsForSemester(specialtyId, semester);
    return subjects.find((s) => s.slug === slug) ?? null;
  }
);

/** Units of one subject (no HTML is loaded). */
export const getUnitsForSubject = cache(async (subjectId: string): Promise<McqUnitView[]> => {
  await dbConnect();
  const units = await McqUnit.find({ subjectId: new mongoose.Types.ObjectId(subjectId) })
    .select("-htmlContent")
    .sort({ createdAt: 1 })
    .lean();
  return plain<McqUnitView[]>(units);
});

export const getUnitBySlug = cache(async (subjectId: string, slug: string): Promise<McqUnitView | null> => {
  const units = await getUnitsForSubject(subjectId);
  return units.find((u) => u.slug === slug) ?? null;
});

/** Parses a /mcqs/[specialty]/[semester] segment; null if it is not a valid semester for the specialty. */
export function parseSemester(value: string, semesterCount: number): number | null {
  if (!/^\d{1,2}$/.test(value)) return null;
  const n = parseInt(value, 10);
  return n >= 1 && n <= semesterCount ? n : null;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
