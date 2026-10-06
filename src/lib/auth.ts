import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "./db";
import User from "@/models/User";

// Fields every caller of getAuthUser() actually reads (identity + role checks + comment author info).
// Notably excluded: `password` (hash) and the large base64 `customAvatar`.
const AUTH_USER_FIELDS = "_id clerkId username userHandle userImage role";

/**
 * Returns the signed-in user's MongoDB record as a plain (lean) object, or null.
 * Pass `{ includeAvatar: true }` only when the caller needs `customAvatar`
 * (e.g. to stamp the author's avatar on a new comment/rating).
 */
export async function getAuthUser(options?: { includeAvatar?: boolean }) {
  const { userId } = await auth();
  if (!userId) return null;

  await dbConnect();
  const user = await User.findOne({ clerkId: userId })
    .select(options?.includeAvatar ? `${AUTH_USER_FIELDS} customAvatar` : AUTH_USER_FIELDS)
    .lean();
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


  try {
    await dbConnect();

    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      try {
        user = await User.create({
          clerkId: userId,
          username: clerkUser.username || clerkUser.firstName || `user_${userId.slice(-5)}`,
          userImage: clerkUser.imageUrl,
          role: isHamad ? "superAdmin" : "user",
        });
      } catch (createError: any) {
        if (createError.code === 11000) {
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
    } else {
      if (user.userImage !== clerkUser.imageUrl) {
        user.userImage = clerkUser.imageUrl;
        await user.save();
      }
      if (isHamad && user.role !== "superAdmin") {
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
