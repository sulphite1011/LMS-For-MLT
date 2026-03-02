import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "./db";
import User from "@/models/User";

export async function getAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;

  await dbConnect();
  const user = await User.findOne({ clerkId: userId });
  return user as any; // Cast as IUserDoc for role check
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAuth();
  if (user.role !== "superAdmin") {
    throw new Error("Forbidden: Super Admin access required");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!["superAdmin", "admin"].includes(user.role)) {
    throw new Error("Forbidden: Admin access required");
  }
  return user;
}

export async function syncUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const emails = clerkUser.emailAddresses.map(e => e.emailAddress.toLowerCase());
  const isHamad = emails.includes("hamadkhadimdgkmc@gmail.com");

  console.log(`[Lib Sync] Syncing user ${userId}. Emails: ${emails.join(", ")}. Is Super Admin: ${isHamad}`);

  try {
    await dbConnect();

    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      console.log(`[Lib Sync] User not found. Creating...`);
      try {
        user = await User.create({
          clerkId: userId,
          username: clerkUser.username || clerkUser.firstName || `user_${userId.slice(-5)}`,
          userImage: clerkUser.imageUrl,
          role: isHamad ? "superAdmin" : "user",
        });
      } catch (createError: any) {
        if (createError.code === 11000) {
          console.log(`[Lib Sync] Username collision. Retrying with suffix...`);
          user = await User.create({
            clerkId: userId,
            username: `${clerkUser.username || clerkUser.firstName || "user"}_${userId.slice(-5)}`,
            userImage: clerkUser.imageUrl,
            role: isHamad ? "superAdmin" : "user",
          });
        } else {
          throw createError;
        }
      }
      console.log(`[Lib Sync] Created user: ${user.username} with role: ${user.role}`);
    } else {
      console.log(`[Lib Sync] User exists: ${user.username}, Role: ${user.role}`);
      if (user.userImage !== clerkUser.imageUrl) {
        user.userImage = clerkUser.imageUrl;
        await user.save();
      }
      if (isHamad && user.role !== "superAdmin") {
        console.log(`[Lib Sync] Forcing superAdmin role for Hamad`);
        user.role = "superAdmin";
        await user.save();
      }
      // Note: We intentionally DO NOT upgrade regular users to admin here.
      // Admin status is managed via the Super Admin dashboard or the claim flow.
    }

    return user;
  } catch (error) {
    console.error("[Lib Sync Error]:", error);
    return null;
  }
}
