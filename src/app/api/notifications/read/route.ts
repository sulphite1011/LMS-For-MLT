import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";

/** POST /api/notifications/read — marks everything up to now as read for the signed-in user. */
export async function POST() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await dbConnect();
    await User.updateOne({ _id: authUser._id }, { $set: { notificationsSeenAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/read error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
