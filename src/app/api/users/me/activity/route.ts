import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Comment from "@/models/Comment";
import Resource from "@/models/Resource";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/users/me/activity
 * Returns user's comment history and recently liked resources
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get comment history (most recent 20)
    const comments = await Comment.find({ userId: authUser.clerkId, content: { $ne: "" } })
      .populate({ path: "resourceId", select: "title resourceType subjectId", populate: { path: "subjectId", select: "name" } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET /api/users/me/activity error:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
