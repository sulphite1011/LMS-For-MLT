import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { getAuthUser } from "@/lib/auth";
import User from "@/models/User";
import { audienceFilter } from "@/lib/notifications";

const RECENT_DAYS = 30;
const MAX_ITEMS = 30;

/**
 * GET /api/notifications — the signed-in user's notifications (general ones + their semesters),
 * the unread count and their notification settings. Private, never cached.
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await dbConnect();

    const user = await User.findById(authUser._id)
      .select("notificationsEnabled currentSemester notifySemesters notificationsSeenAt createdAt")
      .lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const settings = {
      enabled: user.notificationsEnabled !== false,
      currentSemester: user.currentSemester ?? null,
      notifySemesters: user.notifySemesters ?? [],
    };
    const seenAt = user.notificationsSeenAt ?? user.createdAt;
    const headers = { "Cache-Control": "private, no-store" };

    if (!settings.enabled) {
      return NextResponse.json({ settings, notifications: [], unreadCount: 0, seenAt }, { headers });
    }

    const since = new Date(Math.max(Date.now() - RECENT_DAYS * 86400000, new Date(user.createdAt).getTime() - 7 * 86400000));
    const filter = { createdAt: { $gte: since }, ...audienceFilter({ ...user, currentSemester: user.currentSemester }) };
    const [items, unreadCount] = await Promise.all([
      Notification.find(filter)
        .select("title message kind semester link createdAt")
        .sort({ createdAt: -1 })
        .limit(MAX_ITEMS)
        .lean(),
      Notification.countDocuments({ ...filter, createdAt: { $gt: new Date(Math.max(+new Date(seenAt), +since)) } }),
    ]);

    return NextResponse.json({ settings, notifications: items, unreadCount, seenAt }, { headers });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
