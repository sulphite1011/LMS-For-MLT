import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqSubject from "@/models/McqSubject";
import McqUnit from "@/models/McqUnit";
import { requireSuperAdmin } from "@/lib/auth";
import { MCQ_HTML_MAX_BYTES, mcqAuthErrorResponse, slugify, validateHtmlText } from "@/lib/mcq";

/** GET /api/mcq/units?subjectId= — public list. Never returns the HTML itself. */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const subjectId = req.nextUrl.searchParams.get("subjectId");
    if (!subjectId || !mongoose.isValidObjectId(subjectId)) return NextResponse.json([]);

    const units = await McqUnit.find({ subjectId })
      .select("-htmlContent")
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    return NextResponse.json(units, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("GET /api/mcq/units error:", error);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

/**
 * POST /api/mcq/units — Super Admin only. multipart/form-data:
 * subjectId, name, description?, file? (a single .html file, <= MCQ_HTML_MAX_BYTES).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    await dbConnect();

    const form = await req.formData();
    const subjectId = String(form.get("subjectId") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const file = form.get("file");

    if (!mongoose.isValidObjectId(subjectId)) {
      return NextResponse.json({ error: "Choose a subject" }, { status: 400 });
    }
    const subject = await McqSubject.findById(subjectId).select("specialtyId").lean();
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Unit name is required (120 characters max)" }, { status: 400 });
    }
    const slug = slugify(name);
    if (!slug) return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 });
    if (await McqUnit.exists({ subjectId, slug })) {
      return NextResponse.json({ error: "A unit with this name already exists in this subject" }, { status: 409 });
    }

    const data: Record<string, unknown> = {
      subjectId,
      specialtyId: subject.specialtyId,
      name,
      slug,
      description: description || undefined,
      hasPage: false,
      createdBy: user._id,
    };

    if (file instanceof File && file.size > 0) {
      if (file.size > MCQ_HTML_MAX_BYTES) {
        return NextResponse.json({ error: "HTML file is too large (max 4 MB)" }, { status: 400 });
      }
      const html = await file.text();
      const problem = validateHtmlText(html);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      data.htmlContent = html;
      data.htmlFileName = file.name;
      data.htmlSize = file.size;
      data.hasPage = true;
    }

    const unit = await McqUnit.create(data);
    revalidatePath("/mcqs", "layout");

    const { htmlContent: _omit, ...safe } = unit.toObject();
    void _omit;
    return NextResponse.json(safe, { status: 201 });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("POST /api/mcq/units error:", error);
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}
