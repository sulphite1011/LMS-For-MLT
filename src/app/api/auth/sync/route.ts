import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

const DEFAULT_AVATAR = "/images/default-avatar.png";

function generateHandle(base: string): string {
  // Clean the base - remove spaces, special chars, lowercase
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  return clean || "user";
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

    const resolvedImage = clerkUser.imageUrl && clerkUser.imageUrl.length > 10
      ? clerkUser.imageUrl
      : DEFAULT_AVATAR;

    await dbConnect();

    let user = await User.findOne({ clerkId: userId });

    if (!user) {
      const rawUsername = clerkUser.username || clerkUser.firstName || `user_${userId.slice(-5)}`;

      // Generate unique handle
      let baseHandle = generateHandle(rawUsername);
      let handle = baseHandle;
      let handleSuffix = 1;
      while (await User.findOne({ userHandle: handle })) {
        handle = `${baseHandle}${handleSuffix}`;
        handleSuffix++;
      }

      try {
        user = await User.create({
          clerkId: userId,
          username: rawUsername,
          userHandle: handle,
          userImage: resolvedImage,
          role: isHamad ? "superAdmin" : "user",
        });
      } catch (createError: any) {
        if (createError.code === 11000) {
          // Username collision — add suffix
          const suffixedUsername = `${rawUsername}_${userId.slice(-5)}`;
          let handleRetry = generateHandle(suffixedUsername);
          while (await User.findOne({ userHandle: handleRetry })) {
            handleRetry = `${handleRetry}${Math.floor(Math.random() * 1000)}`;
          }
          user = await User.create({
            clerkId: userId,
            username: suffixedUsername,
            userHandle: handleRetry,
            userImage: resolvedImage,
            role: isHamad ? "superAdmin" : "user",
          });
        } else {
          throw createError;
        }
      }
    } else {
      let hasChanges = false;
      if (isHamad && user.role !== "superAdmin") {
        user.role = "superAdmin";
        hasChanges = true;
      }
      // Only update userImage if user specifically updated it on Google
      if (user.userImage !== resolvedImage && resolvedImage !== DEFAULT_AVATAR && !user.customAvatar) {
        user.userImage = resolvedImage;
        hasChanges = true;
      }
      if (!user.userImage && !user.customAvatar) {
        user.userImage = DEFAULT_AVATAR;
        hasChanges = true;
      }
      // Auto-assign handle if missing (for existing users)
      if (!user.userHandle) {
        let baseHandle = generateHandle(user.username);
        let handle = baseHandle;
        let i = 1;
        while (await User.findOne({ userHandle: handle, _id: { $ne: user._id } })) {
          handle = `${baseHandle}${i++}`;
        }
        user.userHandle = handle;
        hasChanges = true;
      }
      if (hasChanges) await user.save();
    }

    return NextResponse.json({
      _id: user._id,
      username: user.username,
      userHandle: user.userHandle,
      role: user.role,
    });
  } catch (error: any) {
    console.error("[API Sync Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
