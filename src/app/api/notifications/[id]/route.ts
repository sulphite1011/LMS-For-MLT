import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import NotificationState from "@/models/NotificationState";
import { getAuthUser } from "@/lib/auth";

/**
 * PATCH /api/notifications/[id] — the signed-in student's own choice for one notification.
 * body { action: "archive" | "unarchive" | "delete" }. Affects only that student's view.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "archive" && action !== "unarchive" && action !== "delete") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await dbConnect();
    const key = { userId: authUser._id, notificationId: id };

    if (action === "unarchive") {
      await NotificationState.deleteOne({ ...key, state: "archived" });
    } else {
      await NotificationState.updateOne(
        key,
        { $set: { state: action === "archive" ? "archived" : "deleted" } },
        { upsert: true }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
