import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import NotificationState from "@/models/NotificationState";
import { getAuthUser } from "@/lib/auth";
import User from "@/models/User";
import { audienceFilter } from "@/lib/notifications";

/** Notifications live for 60 days (also enforced by a TTL index on the collection). */
const WINDOW_DAYS = 60;
const MAX_ITEMS = 40;

/**
 * GET /api/notifications — the signed-in user's notifications for the last 60 days:
 * general ones + the semesters they follow, minus the ones they deleted. Archived ones come back in
 * `archived`. Everything is computed from the user's CURRENT settings, so switching semester
 * immediately swaps the list. A new account sees the last 60 days straight away, and (until a
 * semester is chosen) a first "set up your notifications" item. Private, never cached.
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
    const headers = { "Cache-Control": "private, no-store" };

    if (!settings.enabled) {
      return NextResponse.json({ settings, notifications: [], archived: [], unreadCount: 0, seenAt: new Date(0) }, { headers });
    }

    const seenAt = user.notificationsSeenAt ?? new Date(0);
    const since = new Date(Date.now() - WINDOW_DAYS * 86400000);

    const states = await NotificationState.find({ userId: user._id }).select("notificationId state").lean();
    const hiddenIds = states.map((s) => s.notificationId);
    const archivedIds = states.filter((s) => s.state === "archived").map((s) => s.notificationId);

    const audience = audienceFilter({ ...user, currentSemester: user.currentSemester });
    const fields = "title message kind semester link createdAt";
    const inboxFilter = { createdAt: { $gte: since }, ...audience, _id: { $nin: hiddenIds } };

    const [items, archived, unreadItems] = await Promise.all([
      Notification.find(inboxFilter).select(fields).sort({ createdAt: -1 }).limit(MAX_ITEMS).lean(),
      archivedIds.length
        ? Notification.find({ createdAt: { $gte: since }, ...audience, _id: { $in: archivedIds } })
            .select(fields)
            .sort({ createdAt: -1 })
            .limit(MAX_ITEMS)
            .lean()
        : Promise.resolve([]),
      Notification.countDocuments({ ...inboxFilter, createdAt: { $gt: new Date(Math.max(+new Date(seenAt), +since)) } }),
    ]);

    const needsSetup = !user.currentSemester;
    const setupItem = {
      _id: "setup",
      kind: "setup" as const,
      title: "Set up your notifications",
      message: "Choose your current semester to get the right updates. You'll see the last 60 days of announcements for it.",
      semester: null,
      link: "/dashboard?tab=notifications",
      createdAt: new Date(),
    };

    return NextResponse.json(
      {
        settings,
        notifications: needsSetup ? [setupItem, ...items] : items,
        archived,
        unreadCount: unreadItems + (needsSetup && !user.notificationsSeenAt ? 1 : 0),
        seenAt,
      },
      { headers }
    );
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
