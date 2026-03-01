import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Subject from "@/models/Subject";
import Resource from "@/models/Resource";
import { requireAdmin } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { name, description } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const existing = await Subject.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Subject with this name already exists" },
        { status: 409 }
      );
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      { name: name.trim(), description: description?.trim() || "" },
      { new: true }
    );

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(subject);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update subject";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await dbConnect();

    const resourceCount = await Resource.countDocuments({ subjectId: id });
    if (resourceCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete subject with ${resourceCount} resource(s). Delete resources first.`,
        },
        { status: 400 }
      );
    }

    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete subject";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
