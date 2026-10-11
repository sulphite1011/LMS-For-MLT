import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import McqProgress from "@/models/McqProgress";
import { requireAuth } from "@/lib/auth";
import { mcqAuthErrorResponse } from "@/lib/mcq";

/** GET /api/mcq/progress/units — status of every unit the signed-in user has touched (for ticks on the MCQ hub). */
export async function GET() {
  try {
    const user = await requireAuth();
    await dbConnect();
    const rows = await McqProgress.find({ userId: user._id })
      .select("unitId completed bestScore attempts session")
      .limit(2000)
      .lean();
    const progress: Record<string, { completed: boolean; bestScore: number; attempts: number; inProgress: boolean }> = {};
    for (const r of rows) {
      progress[String(r.unitId)] = {
        completed: !!r.completed,
        bestScore: r.bestScore ?? 0,
        attempts: r.attempts ?? 0,
        inProgress: !!r.session,
      };
    }
    return NextResponse.json({ progress }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("GET /api/mcq/progress/units error:", error);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
