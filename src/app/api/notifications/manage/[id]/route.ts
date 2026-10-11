import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { requireAdmin } from "@/lib/auth";

/** DELETE /api/notifications/manage/[id] — the admin who sent it, or the Super Admin. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await dbConnect();

    const filter: Record<string, unknown> = { _id: id };
    if (user.role !== "superAdmin") filter.createdBy = user._id;
    const deleted = await Notification.findOneAndDelete(filter).select("_id");
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message.includes("Forbidden")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("DELETE /api/notifications/manage/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
