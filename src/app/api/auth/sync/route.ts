import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

const DEFAULT_AVATAR = "/images/default-avatar.png";

// Detect if a Clerk image URL is the Google default/placeholder
function isDefaultGoogleAvatar(url: string | null | undefined): boolean {
  if (!url) return true;
  // Google default avatars contain lh3.googleusercontent.com and end with =s96-c or similar
  // Clerk's default is usually a DiceBear/initials avatar
  // We detect: empty string, null, undefined, or Clerk's auto-generated avatars
  return (
    url === "" ||
    url.includes("gravatar.com/avatar") ||
    // Clerk uses https://img.clerk.com/...?height=...&width=...&quality=... for custom
    // The default generated one often contains "default" in path or is very short
    false
  );
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const emails = (clerkUser.emailAddresses || []).map(e => e.emailAddress.toLowerCase());
    const isHamad = emails.includes("hamadkhadimdgkmc@gmail.com");

    // Resolve avatar: use Clerk image if it's a real custom photo, else use default
    const resolvedImage = clerkUser.imageUrl && clerkUser.imageUrl.length > 10
      ? clerkUser.imageUrl
      : DEFAULT_AVATAR;

    console.log(`[API Sync] Starting sync for ${userId}. Emails: ${emails.join(", ")}`);

    await dbConnect();

    let user = await User.findOne({ clerkId: userId });

    if (!user) {
      console.log(`[API Sync] User not found in DB. Creating...`);
      const username = clerkUser.username || clerkUser.firstName || `user_${userId.slice(-5)}`;
      try {
        user = await User.create({
          clerkId: userId,
          username,
          userImage: resolvedImage,
          role: isHamad ? "superAdmin" : "user",
        });
      } catch (createError: any) {
        if (createError.code === 11000) {
          console.log(`[API Sync] Username collision. Retrying...`);
          user = await User.create({
            clerkId: userId,
            username: `${username}_${userId.slice(-5)}`,
            userImage: resolvedImage,
            role: isHamad ? "superAdmin" : "user",
          });
        } else {
          throw createError;
        }
      }
    } else {
      console.log(`[API Sync] User found: ${user.username}`);
      let hasChanges = false;
      if (isHamad && user.role !== "superAdmin") {
        user.role = "superAdmin";
        hasChanges = true;
      }
      // Only update userImage if user doesn't have a custom avatar set
      // and the new image is different from what we have
      if (!user.customAvatar && user.userImage !== resolvedImage) {
        user.userImage = resolvedImage;
        hasChanges = true;
      }
      // Fix: if userImage is currently empty/broken, set the default
      if (!user.userImage && !user.customAvatar) {
        user.userImage = DEFAULT_AVATAR;
        hasChanges = true;
      }
      if (hasChanges) await user.save();
    }

    return NextResponse.json({
      _id: user._id,
      username: user.username,
      role: user.role,
    });
  } catch (error: any) {
    console.error("[API Sync Error]:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
