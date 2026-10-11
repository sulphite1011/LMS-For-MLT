import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqUnit from "@/models/McqUnit";
import { requireAuth } from "@/lib/auth";
import { mcqAuthErrorResponse } from "@/lib/mcq";

/**
 * GET /api/mcq/units/[id]/questions — signed-in users only. The full question set of a unit.
 * Visitors only ever receive the free preview (first 10 questions) embedded in the unit page, so the
 * remaining questions and answers are not exposed to them. Private, never cached.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await dbConnect();
    const unit = await McqUnit.findById(id).select("+questions").lean();
    if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ questions: unit.questions ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("GET /api/mcq/units/[id]/questions error:", error);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
