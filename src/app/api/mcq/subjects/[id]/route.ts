import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqSpecialty from "@/models/McqSpecialty";
import McqSubject from "@/models/McqSubject";
import McqUnit from "@/models/McqUnit";
import { requireSuperAdmin } from "@/lib/auth";
import { mcqAuthErrorResponse } from "@/lib/mcq";

/**
 * PUT /api/mcq/subjects/[id] — Super Admin only. multipart/form-data, all fields optional:
 * name, description, semester (move).
 * The slug (public URL) is generated at creation and is not changed by a rename.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    const subject = await McqSubject.findById(id);
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    const form = await req.formData();

    if (form.has("name")) {
      const name = String(form.get("name")).trim();
      if (!name || name.length > 120) {
        return NextResponse.json({ error: "Subject name is required (120 characters max)" }, { status: 400 });
      }
      subject.name = name;
    }
    if (form.has("description")) {
      subject.description = String(form.get("description")).trim() || undefined;
    }

    if (form.has("semester")) {
      const semester = parseInt(String(form.get("semester")), 10);
      const specialty = await McqSpecialty.findById(subject.specialtyId).lean();
      if (!specialty || !Number.isInteger(semester) || semester < 1 || semester > specialty.semesterCount) {
        return NextResponse.json({ error: "Invalid semester" }, { status: 400 });
      }
      if (semester !== subject.semester) {
        if (await McqSubject.exists({ specialtyId: subject.specialtyId, semester, slug: subject.slug })) {
          return NextResponse.json({ error: "A subject with this name already exists in that semester" }, { status: 409 });
        }
        subject.semester = semester;
      }
    }

    await subject.save();
    revalidatePath("/mcqs", "layout");

    return NextResponse.json(subject.toObject());
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("PUT /api/mcq/subjects/[id] error:", error);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

/** DELETE /api/mcq/subjects/[id] — Super Admin only. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    const unitCount = await McqUnit.countDocuments({ subjectId: id });
    if (unitCount > 0) {
      return NextResponse.json(
        { error: `This subject still has ${unitCount} unit${unitCount === 1 ? "" : "s"}. Delete the units first.` },
        { status: 409 }
      );
    }
    const deleted = await McqSubject.findByIdAndDelete(id).select("_id");
    if (!deleted) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    revalidatePath("/mcqs", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("DELETE /api/mcq/subjects/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
