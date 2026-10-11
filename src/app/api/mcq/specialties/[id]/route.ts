import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqSpecialty from "@/models/McqSpecialty";
import McqSubject from "@/models/McqSubject";
import { requireSuperAdmin } from "@/lib/auth";
import { mcqAuthErrorResponse } from "@/lib/mcq";

/**
 * PUT /api/mcq/specialties/[id] — Super Admin only.
 * Body: { name?, fullName?, description?, semesterCount? }. The slug (public URL) never changes.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Specialty not found" }, { status: 404 });

    const specialty = await McqSpecialty.findById(id);
    if (!specialty) return NextResponse.json({ error: "Specialty not found" }, { status: 404 });

    const body = await req.json();

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 40) {
        return NextResponse.json({ error: "Name is required (40 characters max)" }, { status: 400 });
      }
      specialty.name = name;
    }
    if (body.fullName !== undefined) specialty.fullName = String(body.fullName).trim() || undefined;
    if (body.description !== undefined) specialty.description = String(body.description).trim() || undefined;

    if (body.semesterCount !== undefined) {
      const count = Number(body.semesterCount);
      if (!Number.isInteger(count) || count < 1 || count > 12) {
        return NextResponse.json({ error: "Semesters must be a whole number from 1 to 12" }, { status: 400 });
      }
      const highest = await McqSubject.findOne({ specialtyId: specialty._id }).sort({ semester: -1 }).select("semester").lean();
      if (highest && count < highest.semester) {
        return NextResponse.json(
          { error: `Subjects already exist in semester ${highest.semester}; move or delete them first` },
          { status: 400 }
        );
      }
      specialty.semesterCount = count;
    }

    await specialty.save();
    revalidatePath("/mcqs", "layout");
    return NextResponse.json(specialty);
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("PUT /api/mcq/specialties/[id] error:", error);
    return NextResponse.json({ error: "Failed to update specialty" }, { status: 500 });
  }
}

/** DELETE /api/mcq/specialties/[id] — Super Admin only; refused while the specialty still has subjects. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Specialty not found" }, { status: 404 });

    if (await McqSubject.exists({ specialtyId: id })) {
      return NextResponse.json(
        { error: "This specialty still has subjects. Delete them first." },
        { status: 400 }
      );
    }
    const deleted = await McqSpecialty.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Specialty not found" }, { status: 404 });

    revalidatePath("/mcqs", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("DELETE /api/mcq/specialties/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete specialty" }, { status: 500 });
  }
}
