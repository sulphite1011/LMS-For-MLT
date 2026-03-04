import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { auth } from "@clerk/nextjs/server";

// GET /api/notifications - Fetch latest notifications for the current user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch latest 20 non-archived notifications
    const notifications = await Notification.find({
      recipientId: userId,
      isArchived: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications - Update notification status (read/archived)
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { notificationId, action } = body;

    if (notificationId) {
      const updateData: any = {};
      if (action === "archive") updateData.isArchived = true;
      else updateData.isRead = true;

      await Notification.updateOne(
        { _id: notificationId, recipientId: userId },
        { $set: updateData }
      );
    } else {
      // Bulk actions
      if (action === "archive_all") {
        await Notification.updateMany(
          { recipientId: userId, isArchived: false },
          { $set: { isArchived: true } }
        );
      } else {
        // Mark all as read
        await Notification.updateMany(
          { recipientId: userId, isRead: false },
          { $set: { isRead: true } }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

// DELETE /api/notifications - Delete notifications (Trash)
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      await Notification.deleteOne({ _id: id, recipientId: userId });
    } else {
      // Clear all
      await Notification.deleteMany({ recipientId: userId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
}
