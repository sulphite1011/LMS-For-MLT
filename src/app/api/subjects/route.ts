import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Subject from "@/models/Subject";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, AppErrors } from "@/lib/api-errors";

export async function GET() {
  try {
    await dbConnect();
    const subjects = await Subject.find().sort({ name: 1 }).lean();
    return NextResponse.json(subjects, {
      headers: {
        // Subjects change very infrequently — cache aggressively
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const { name, description } = await req.json();

    if (!name || !name.trim()) {
      throw AppErrors.BadRequest("Subject name is required");
    }

    await dbConnect();

    const existing = await Subject.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      throw AppErrors.Conflict("Subject already exists");
    }

    const subject = await Subject.create({
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: user._id,
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
