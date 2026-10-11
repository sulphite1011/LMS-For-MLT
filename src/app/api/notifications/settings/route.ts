import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { isValidSemester } from "@/lib/semesters";

/**
 * PUT /api/notifications/settings — the signed-in user's own notification preferences:
 * { enabled: boolean, currentSemester: 1-8 | null, notifySemesters: number[] }.
 * Notifications for the current semester are always delivered while notifications are on.
 */
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "Invalid value" }, { status: 400 });
      update.notificationsEnabled = body.enabled;
    }
    if (body.currentSemester !== undefined) {
      if (body.currentSemester !== null && !isValidSemester(body.currentSemester)) {
        return NextResponse.json({ error: "Choose a semester from 1 to 8" }, { status: 400 });
      }
      update.currentSemester = body.currentSemester;
    }
    if (body.notifySemesters !== undefined) {
      if (!Array.isArray(body.notifySemesters) || !body.notifySemesters.every(isValidSemester)) {
        return NextResponse.json({ error: "Invalid semester list" }, { status: 400 });
      }
      update.notifySemesters = [...new Set<number>(body.notifySemesters)].sort((a, b) => a - b);
    }

    await dbConnect();
    const updated = await User.findByIdAndUpdate(authUser._id, { $set: update }, { new: true })
      .select("notificationsEnabled currentSemester notifySemesters")
      .lean();
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      enabled: updated.notificationsEnabled !== false,
      currentSemester: updated.currentSemester ?? null,
      notifySemesters: updated.notifySemesters ?? [],
    });
  } catch (error) {
    console.error("PUT /api/notifications/settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
