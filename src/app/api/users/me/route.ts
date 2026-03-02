import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/users/me
 * Returns the current user's profile
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ clerkId: authUser.clerkId })
      .select("-password -__v")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

/**
 * PATCH /api/users/me
 * Update current user's profile (username, bio, customAvatar)
 */
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { username, bio, customAvatar } = body;

    const updateData: Record<string, unknown> = {};

    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed || trimmed.length < 2) {
        return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
      }
      if (trimmed.length > 30) {
        return NextResponse.json({ error: "Username must be 30 characters or less" }, { status: 400 });
      }
      // Check uniqueness
      const existing = await User.findOne({ username: trimmed, clerkId: { $ne: authUser.clerkId } });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      updateData.username = trimmed;
    }

    if (bio !== undefined) {
      updateData.bio = bio.trim().slice(0, 300);
    }

    if (customAvatar !== undefined) {
      // Accepts base64 data URL or https:// URL
      updateData.customAvatar = customAvatar;
    }

    const updated = await User.findOneAndUpdate(
      { clerkId: authUser.clerkId },
      { $set: updateData },
      { new: true }
    ).select("-password -__v");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/users/me error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
