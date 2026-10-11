import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import McqUnit from "@/models/McqUnit";
import McqSubject from "@/models/McqSubject";
import McqSpecialty from "@/models/McqSpecialty";
import McqProgress from "@/models/McqProgress";
import McqStudyDay from "@/models/McqStudyDay";
import { requireAuth } from "@/lib/auth";
import { mcqAuthErrorResponse } from "@/lib/mcq";
import { computeStreak } from "@/lib/mcqProgress";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** GET /api/mcq/progress/summary — streak, totals and the "continue where you left off" list. */
export async function GET() {
  try {
    const user = await requireAuth();
    await dbConnect();

    const [days, rows, completedCount] = await Promise.all([
      McqStudyDay.find({ userId: user._id }).select("day answered").lean(),
      McqProgress.find({ userId: user._id }).sort({ lastActivityAt: -1 }).limit(60).lean(),
      McqProgress.countDocuments({ userId: user._id, completed: true }),
    ]);

    const streak = computeStreak(days.map((d) => d.day));
    const totalAnswered = days.reduce((sum, d) => sum + (d.answered || 0), 0);

    const unitIds = rows.map((r) => r.unitId);
    const units = await McqUnit.find({ _id: { $in: unitIds } }).select("name slug subjectId specialtyId questionCount").lean();
    const subjects = await McqSubject.find({ _id: { $in: units.map((u) => u.subjectId) } }).select("name slug semester").lean();
    const specialties = await McqSpecialty.find({ _id: { $in: units.map((u) => u.specialtyId) } }).select("name slug").lean();
    const unitMap = new Map(units.map((u) => [String(u._id), u]));
    const subjectMap = new Map(subjects.map((s) => [String(s._id), s]));
    const specMap = new Map(specialties.map((s) => [String(s._id), s]));

    const toItem = (r: (typeof rows)[number]) => {
      const unit = unitMap.get(String(r.unitId));
      if (!unit) return null;
      const subject = subjectMap.get(String(unit.subjectId));
      const specialty = specMap.get(String(unit.specialtyId));
      if (!subject || !specialty) return null;
      const session = r.session as { order?: number[]; answers?: number[] } | undefined;
      const answered = session?.answers ? session.answers.filter((a) => a >= 0).length : 0;
      return {
        unitId: String(unit._id),
        unitName: unit.name,
        subjectName: subject.name,
        specialtyName: specialty.name,
        semester: subject.semester,
        href: `/mcqs/${specialty.slug}/${subject.semester}/${subject.slug}/${unit.slug}`,
        completed: r.completed,
        bestScore: r.bestScore,
        attempts: r.attempts,
        inProgress: !!session,
        answered,
        sessionTotal: session?.order?.length ?? 0,
        lastActivityAt: r.lastActivityAt,
      };
    };

    const items = rows.map(toItem).filter((x): x is NonNullable<ReturnType<typeof toItem>> => x !== null);
    const resume = items.filter((i) => i.inProgress).slice(0, 4);
    const recent = items.filter((i) => !i.inProgress).slice(0, 4);

    return NextResponse.json(
      {
        streak: streak.current,
        longestStreak: streak.longest,
        studiedToday: streak.studiedToday,
        totalAnswered,
        completedCount,
        resume,
        recent,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("GET /api/mcq/progress/summary error:", error);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
