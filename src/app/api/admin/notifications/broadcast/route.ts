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
        // User must either have it as primary semester OR have it in subscribed semesters
        targetConditions.push({ primarySemester: { $in: semNums } });
        targetConditions.push({ "notificationPreferences.subscribedSemesters": { $in: semNums } });
      }

      if (targets.includes("general")) {
        // Only those who explicitly have receiveGeneral enabled
        targetConditions.push({ "notificationPreferences.receiveGeneral": true });
      }

      // Always include users who have "Receive All" enabled regardless of filters
      targetConditions.push({ "notificationPreferences.receiveAll": true });

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
        type: "SYSTEM_BROADCAST",
        title,
        message,
        link: link || "/dashboard"
      })
    );

    await Promise.all(promises);

    console.log(`[Broadcast API] Successfully sent to ${usersToNotify.length} users.`);

    return NextResponse.json({
      success: true,
      count: usersToNotify.length,
      message: `Broadcast sent to ${usersToNotify.length} users.`
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send broadcast";
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
