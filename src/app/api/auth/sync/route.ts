import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

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
          userImage: clerkUser.imageUrl,
          role: isHamad ? "superAdmin" : "user",
        });
      } catch (createError: any) {
        if (createError.code === 11000) {
          console.log(`[API Sync] Username collision. Retrying...`);
          user = await User.create({
            clerkId: userId,
            username: `${username}_${userId.slice(-5)}`,
            userImage: clerkUser.imageUrl,
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
      if (user.userImage !== clerkUser.imageUrl) {
        user.userImage = clerkUser.imageUrl;
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
