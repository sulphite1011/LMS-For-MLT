import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { auth } from "@clerk/nextjs/server";
import { getAuthUser } from "@/lib/auth";

const HANDLE_CHANGE_DAYS = 15;
const USERNAME_CHANGE_DAYS = 30;
const DEFAULT_AVATAR = "/images/default-avatar.png";

export async function GET() {
  try {
    console.log("[API /users/me] Starting GET...");
    const { userId } = await auth();
    console.log("[API /users/me] userId:", userId);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ clerkId: userId })
      .select("-password -__v")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { username, userHandle, bio, customAvatar, primarySemester, notificationPreferences } = body;

    const updateData: Record<string, unknown> = {};

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
      return NextResponse.json({ error: "User profile not found. Please refresh." }, { status: 404 });
    }

    if (username !== undefined) {
      const trimmed = username.trim();

      console.log(`[API /users/me] Username update requested. Current: "${currentUser.username}", New: "${trimmed}"`);

      if (currentUser.username !== trimmed) {
        console.log(`[API /users/me] Username change detected. Last changed: ${currentUser.usernameLastChanged}`);

        // Enforce 30-day rule only if changing to a NEW username
        if (currentUser.usernameLastChanged) {
          const daysSince = (Date.now() - new Date(currentUser.usernameLastChanged).getTime()) / (1000 * 60 * 60 * 24);
          console.log(`[API /users/me] Days since last change: ${daysSince.toFixed(2)}`);

          if (daysSince < USERNAME_CHANGE_DAYS) {
            const daysLeft = Math.ceil(USERNAME_CHANGE_DAYS - daysSince);
            console.log(`[API /users/me] REJECTED: ${daysLeft} days left.`);
            return NextResponse.json(
              { error: `Username already changed recently. You can change it again in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.` },
              { status: 429 }
            );
          }
        }

        console.log("[API /users/me] Restriction passed. Validating...");

        if (!trimmed || trimmed.length < 2) {
          return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
        }
        if (trimmed.length > 30) {
          return NextResponse.json({ error: "Username must be 30 characters or less" }, { status: 400 });
        }
        const existing = await User.findOne({ username: trimmed, clerkId: { $ne: clerkId } }).collation({ locale: 'en', strength: 2 });
        if (existing) {
          return NextResponse.json({ error: "Username already taken" }, { status: 409 });
        }
        updateData.username = trimmed;
        updateData.usernameLastChanged = new Date();
        console.log("[API /users/me] Username update queued. New timestamp set.");
      }
    }

    if (userHandle !== undefined) {
      // Check 15-day restriction
      if (currentUser.userHandleLastChanged) {
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
      const existingHandle = await User.findOne({ userHandle: cleanHandle, clerkId: { $ne: clerkId } }).collation({ locale: 'en', strength: 2 });
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

    if (primarySemester !== undefined) {
      updateData.primarySemester = primarySemester;
    }

    if (notificationPreferences !== undefined) {
      updateData.notificationPreferences = notificationPreferences;
    }

    const updated = await User.findOneAndUpdate(
      { clerkId },
      { $set: updateData },
      { new: true }
    ).select("-password -__v");

    if (!updated) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/users/me error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
