import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqSpecialty from "@/models/McqSpecialty";
import McqSubject from "@/models/McqSubject";
import { requireSuperAdmin } from "@/lib/auth";
import { mcqAuthErrorResponse, slugify } from "@/lib/mcq";

/** GET /api/mcq/subjects?specialtyId=&semester= — public list. Never returns the HTML itself. */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = req.nextUrl;
    const filter: Record<string, unknown> = {};

    const specialtyId = searchParams.get("specialtyId");
    if (specialtyId) {
      if (!mongoose.isValidObjectId(specialtyId)) return NextResponse.json([]);
      filter.specialtyId = specialtyId;
    }
    const semester = searchParams.get("semester");
    if (semester) {
      const n = parseInt(semester, 10);
      if (!Number.isInteger(n)) return NextResponse.json([]);
      filter.semester = n;
    }

    const subjects = await McqSubject.find(filter)
      .select("-htmlContent")
      .sort({ semester: 1, name: 1 })
      .limit(500)
      .lean();

    return NextResponse.json(subjects, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("GET /api/mcq/subjects error:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

/**
 * POST /api/mcq/subjects — Super Admin only. multipart/form-data:
 * specialtyId, semester, name, description?. (HTML pages are uploaded per UNIT, see /api/mcq/units.)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    await dbConnect();

    const form = await req.formData();
    const specialtyId = String(form.get("specialtyId") ?? "");
    const semester = parseInt(String(form.get("semester") ?? ""), 10);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    if (!mongoose.isValidObjectId(specialtyId)) {
      return NextResponse.json({ error: "Choose a specialty" }, { status: 400 });
    }
    const specialty = await McqSpecialty.findById(specialtyId).lean();
    if (!specialty) return NextResponse.json({ error: "Specialty not found" }, { status: 404 });

    if (!Number.isInteger(semester) || semester < 1 || semester > specialty.semesterCount) {
      return NextResponse.json({ error: `Semester must be between 1 and ${specialty.semesterCount}` }, { status: 400 });
    }
    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Subject name is required (120 characters max)" }, { status: 400 });
    }
    const slug = slugify(name);
    if (!slug) return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 });
    if (await McqSubject.exists({ specialtyId, semester, slug })) {
      return NextResponse.json({ error: "A subject with this name already exists in this semester" }, { status: 409 });
    }

    const data: Record<string, unknown> = {
      specialtyId,
      semester,
      name,
      slug,
      description: description || undefined,
      createdBy: user._id,
    };

    const subject = await McqSubject.create(data);
    revalidatePath("/mcqs", "layout");

    return NextResponse.json(subject.toObject(), { status: 201 });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("POST /api/mcq/subjects error:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
