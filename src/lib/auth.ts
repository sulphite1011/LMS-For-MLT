import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "./db";
import User from "@/models/User";

export async function getAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;

  await dbConnect();
  const user = await User.findOne({ clerkId: userId });
  return user;
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

  await dbConnect();

  let user = await User.findOne({ clerkId: userId });
  if (!user) {
    user = await User.create({
      clerkId: userId,
      username: clerkUser.username || clerkUser.firstName || "user",
      role: "admin",
    });
  }

  return user;
}
