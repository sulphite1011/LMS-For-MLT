import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqUnit from "@/models/McqUnit";
import { requireSuperAdmin } from "@/lib/auth";
import { MCQ_HTML_MAX_BYTES, mcqAuthErrorResponse, validateHtmlText } from "@/lib/mcq";

/**
 * PUT /api/mcq/units/[id] — Super Admin only. multipart/form-data, all fields optional:
 * name, description, file (replace the HTML), removeFile=true.
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
    if (file instanceof File && file.size > 0) {
      if (file.size > MCQ_HTML_MAX_BYTES) {
        return NextResponse.json({ error: "HTML file is too large (max 4 MB)" }, { status: 400 });
      }
      const html = await file.text();
      const problem = validateHtmlText(html);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      unit.htmlContent = html;
      unit.htmlFileName = file.name;
      unit.htmlSize = file.size;
      unit.hasPage = true;
    } else if (form.get("removeFile") === "true") {
      unit.htmlContent = undefined;
      unit.htmlFileName = undefined;
      unit.htmlSize = undefined;
      unit.hasPage = false;
    }

    await unit.save();
    revalidatePath("/mcqs", "layout");

    const { htmlContent: _omit, ...safe } = unit.toObject();
    void _omit;
    return NextResponse.json(safe);
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
