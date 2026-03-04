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

    // Fetch latest 20 notifications
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications/mark-read - Mark all notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { notificationId } = body;

    if (notificationId) {
      // Mark specific notification as read
      await Notification.updateOne(
        { _id: notificationId, recipientId: userId },
        { $set: { isRead: true } }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { recipientId: userId, isRead: false },
        { $set: { isRead: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications/mark-read error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
