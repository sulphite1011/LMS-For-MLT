import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Subject from "@/models/Subject";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await dbConnect();
    const subjects = await Subject.find().sort({ name: 1 }).lean();
    return NextResponse.json(subjects);
  } catch (error) {
    console.error("GET /api/subjects error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
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
    });
    if (existing) {
      return NextResponse.json(
        { error: "Subject already exists" },
        { status: 409 }
      );
    }

    const subject = await Subject.create({
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: user._id,
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create subject";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
