import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireAdmin } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { title, message, link, targets } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    await dbConnect();

    let query: any = { clerkId: { $ne: admin.clerkId } };

    if (targets && Array.isArray(targets) && !targets.includes("all")) {
      const targetConditions = [];

      const semesters = targets.filter(t => typeof t === "number" || !isNaN(Number(t)));
      if (semesters.length > 0) {
        const semNums = semesters.map(Number);
        targetConditions.push({ primarySemester: { $in: semNums } });
        targetConditions.push({ "notificationPreferences.subscribedSemesters": { $in: semNums } });
      }

      if (targets.includes("general")) {
        targetConditions.push({ "notificationPreferences.receiveGeneral": true });
      }

      if (targetConditions.length > 0) {
        query.$or = targetConditions;
      }
    }

    const usersToNotify = await User.find(query).select("clerkId");

    if (usersToNotify.length === 0) {
      return NextResponse.json({ message: "No users found matching the criteria" }, { status: 404 });
    }

    const promises = usersToNotify.map(u =>
      sendNotification({
        recipientId: u.clerkId,
        type: "COMMENT_REPLY", // Reusing type or we could add 'BROADCAST'
        title,
        message,
        link: link || "/dashboard"
      })
    );

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      count: usersToNotify.length,
      message: `Broadcast sent to ${usersToNotify.length} users.`
    });

  } catch (error: any) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: error.message || "Failed to send broadcast" }, { status: 500 });
  }
}
