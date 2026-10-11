import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqUnit from "@/models/McqUnit";
import McqProgress, { type IMcqProgressDoc } from "@/models/McqProgress";
import McqStudyDay from "@/models/McqStudyDay";
import { requireAuth } from "@/lib/auth";
import { mcqAuthErrorResponse } from "@/lib/mcq";
import { dayKey } from "@/lib/mcqProgress";

const NO_STORE = { "Cache-Control": "private, no-store" };

const isIntArray = (v: unknown, len: number, min: number, max: number): v is number[] =>
  Array.isArray(v) && v.length === len && v.every((n) => Number.isInteger(n) && n >= min && n <= max);

async function markStudyDay(userId: mongoose.Types.ObjectId, answered: number) {
  if (answered <= 0) return;
  await McqStudyDay.updateOne(
    { userId, day: dayKey() },
    { $max: { answered }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
}

/** GET /api/mcq/progress?unitId= — the signed-in user's saved progress for one unit. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await dbConnect();
    const unitId = req.nextUrl.searchParams.get("unitId");
    if (!unitId || !mongoose.isValidObjectId(unitId)) {
      return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
    }
    const progress = await McqProgress.findOne({ userId: user._id, unitId }).lean();
    return NextResponse.json({ progress: progress ?? null }, { headers: NO_STORE });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("GET /api/mcq/progress error:", error);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}

/**
 * PUT /api/mcq/progress — body { unitId, action, ... }
 *  save     { mode, order, answers, index, elapsedSec }  store the unfinished attempt
 *  finish   { mode, order, answers, elapsedSec }          score it on the server, clear the session
 *  discard  {}                                            drop the unfinished attempt
 *  complete { completed: boolean }                        mark the unit completed / not completed
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    await dbConnect();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    const { unitId, action } = body as { unitId?: string; action?: string };
    if (!unitId || !mongoose.isValidObjectId(unitId)) return NextResponse.json({ error: "Invalid unit" }, { status: 400 });

    const unit = await McqUnit.findById(unitId).select("+questions questionCount hasPage").lean();
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    const questions = unit.questions ?? [];
    const key = { userId: user._id, unitId };
    const now = new Date();

    if (action === "complete") {
      const completed = body.completed !== false;
      const update: mongoose.UpdateQuery<IMcqProgressDoc> = completed
        ? { $set: { completed: true, lastActivityAt: now, completedAt: now } }
        : { $set: { completed: false, lastActivityAt: now }, $unset: { completedAt: "" } };
      const progress = await McqProgress.findOneAndUpdate(key, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }).lean();
      if (completed) await markStudyDay(user._id, 1);
      return NextResponse.json({ progress }, { headers: NO_STORE });
    }

    if (action === "discard") {
      const progress = await McqProgress.findOneAndUpdate(key, { $unset: { session: "" } }, { new: true }).lean();
      return NextResponse.json({ progress }, { headers: NO_STORE });
    }

    if (action === "save" || action === "finish") {
      if (!questions.length) return NextResponse.json({ error: "This unit has no native quiz" }, { status: 400 });
      const { mode, order, answers, index, elapsedSec } = body as Record<string, unknown>;
      if (mode !== "practice" && mode !== "test") return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
      if (!Array.isArray(order) || order.length < 1 || order.length > questions.length) {
        return NextResponse.json({ error: "Invalid question order" }, { status: 400 });
      }
      if (!isIntArray(order, order.length, 0, questions.length - 1) || new Set(order).size !== order.length) {
        return NextResponse.json({ error: "Invalid question order" }, { status: 400 });
      }
      if (!isIntArray(answers, order.length, -1, 7)) return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
      const elapsed = Math.max(0, Math.min(Number(elapsedSec) || 0, 60 * 60 * 24));
      const answered = (answers as number[]).filter((a) => a >= 0).length;

      if (action === "save") {
        const idx = Number.isInteger(index) ? Math.max(0, Math.min(index as number, order.length - 1)) : 0;
        const progress = await McqProgress.findOneAndUpdate(
          key,
          {
            $set: {
              session: { mode, order, answers, index: idx, elapsedSec: elapsed, startedAt: now },
              lastActivityAt: now,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();
        await markStudyDay(user._id, answered);
        return NextResponse.json({ progress }, { headers: NO_STORE });
      }

      // finish: the server scores the attempt itself
      let correct = 0;
      const missed: number[] = [];
      (order as number[]).forEach((qi, pos) => {
        const chosen = (answers as number[])[pos];
        if (chosen === questions[qi].answer) correct++;
        else missed.push(qi);
      });
      const total = order.length;
      const percent = Math.round((correct / total) * 100);

      const existing = await McqProgress.findOne(key).select("bestScore attempts").lean();
      const progress = await McqProgress.findOneAndUpdate(
        key,
        {
          $set: {
            lastScore: percent,
            lastTotal: total,
            lastCorrect: correct,
            missed,
            bestScore: Math.max(existing?.bestScore ?? 0, percent),
            attempts: (existing?.attempts ?? 0) + 1,
            lastActivityAt: now,
          },
          $unset: { session: "" },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      await markStudyDay(user._id, answered);
      return NextResponse.json({ progress, result: { correct, total, percent, missed } }, { headers: NO_STORE });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("PUT /api/mcq/progress error:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
