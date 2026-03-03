import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";

const HANDLE_CHANGE_DAYS = 15;
const DEFAULT_AVATAR = "/images/default-avatar.png";

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

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { username, userHandle, bio, customAvatar } = body;

    const updateData: Record<string, unknown> = {};

    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed || trimmed.length < 2) {
        return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
      }
      if (trimmed.length > 30) {
        return NextResponse.json({ error: "Username must be 30 characters or less" }, { status: 400 });
      }
      const existing = await User.findOne({ username: trimmed, clerkId: { $ne: authUser.clerkId } });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      updateData.username = trimmed;
    }

    if (userHandle !== undefined) {
      // Check 15-day restriction
      const currentUser = await User.findOne({ clerkId: authUser.clerkId });
      if (currentUser?.userHandleLastChanged) {
        const daysSince = (Date.now() - currentUser.userHandleLastChanged.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < HANDLE_CHANGE_DAYS) {
          const daysLeft = Math.ceil(HANDLE_CHANGE_DAYS - daysSince);
          return NextResponse.json(
            { error: `You can change your handle again in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` },
            { status: 429 }
          );
        }
      }
      const cleanHandle = userHandle.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
      if (!cleanHandle || cleanHandle.length < 2) {
        return NextResponse.json({ error: "Handle must be at least 2 characters (letters, numbers, underscore only)" }, { status: 400 });
      }
      const existingHandle = await User.findOne({ userHandle: cleanHandle, clerkId: { $ne: authUser.clerkId } });
      if (existingHandle) {
        return NextResponse.json({ error: "@handle already taken" }, { status: 409 });
      }
      updateData.userHandle = cleanHandle;
      updateData.userHandleLastChanged = new Date();
    }

    if (bio !== undefined) {
      updateData.bio = bio.trim().slice(0, 300);
    }

    if (customAvatar !== undefined) {
      // Accepts base64 data URL or https:// URL — processed on client side
      updateData.customAvatar = customAvatar;
      updateData.userImage = customAvatar || DEFAULT_AVATAR; // Force sync the visual avatar so it doesn't flicker on refresh
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
