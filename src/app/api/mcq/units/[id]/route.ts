import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqUnit from "@/models/McqUnit";
import { requireSuperAdmin } from "@/lib/auth";
import { mcqAuthErrorResponse } from "@/lib/mcq";
import { processMcqUpload } from "@/lib/mcqUpload";

/**
 * PUT /api/mcq/units/[id] — Super Admin only. multipart/form-data, all fields optional:
 * name, description, file (replace the page: .html or .json), removeFile=true.
 * The slug (public URL) is generated at creation and is not changed by a rename.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    const unit = await McqUnit.findById(id);
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    const form = await req.formData();

    if (form.has("name")) {
      const name = String(form.get("name")).trim();
      if (!name || name.length > 120) {
        return NextResponse.json({ error: "Unit name is required (120 characters max)" }, { status: 400 });
      }
      unit.name = name;
    }
    if (form.has("description")) {
      unit.description = String(form.get("description")).trim() || undefined;
    }

    const file = form.get("file");
    let imported: { source: string; count: number } | null = null;
    if (file instanceof File && file.size > 0) {
      const outcome = await processMcqUpload(file);
      if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 400 });
      unit.htmlContent = outcome.patch.htmlContent;
      unit.htmlFileName = outcome.patch.htmlFileName;
      unit.htmlSize = outcome.patch.htmlSize;
      unit.hasPage = true;
      unit.questions = outcome.patch.questions as typeof unit.questions;
      unit.questionCount = outcome.patch.questionCount;
      imported = { source: outcome.source, count: outcome.count };
    } else if (form.get("removeFile") === "true") {
      unit.htmlContent = undefined;
      unit.htmlFileName = undefined;
      unit.htmlSize = undefined;
      unit.hasPage = false;
      unit.questions = undefined;
      unit.questionCount = 0;
    }

    await unit.save();
    revalidatePath("/mcqs", "layout");

    const { htmlContent: _omit, questions: _q, ...safe } = unit.toObject();
    void _omit;
    void _q;
    return NextResponse.json({ ...safe, imported });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("PUT /api/mcq/units/[id] error:", error);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

/** DELETE /api/mcq/units/[id] — Super Admin only. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    const deleted = await McqUnit.findByIdAndDelete(id).select("_id");
    if (!deleted) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    revalidatePath("/mcqs", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("DELETE /api/mcq/units/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}
