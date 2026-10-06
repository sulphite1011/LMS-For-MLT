import { createHash } from "crypto";
import User from "@/models/User";

/**
 * Same result as `customAvatar || userImage`, except an uploaded base64 avatar is replaced by a short
 * URL to /api/avatars/[clerkId] (cacheable, and not repeated in every comment of the same user).
 */
function resolveAvatar(u: { clerkId: string; customAvatar?: string; userImage?: string }) {
  if (u.customAvatar) {
    if (/^data:/i.test(u.customAvatar)) {
      const version = createHash("sha1").update(u.customAvatar).digest("hex").slice(0, 12);
      return `/api/avatars/${encodeURIComponent(u.clerkId)}?v=${version}`;
    }
    return u.customAvatar;
  }
  return u.userImage;
}

/**
 * Merges the latest user profile data (username, customAvatar, userImage) 
 * from the User collection into the provided comments.
 * This ensures that if a user updates their profile, all their 
 * past comments reflect the changes immediately.
 */
export async function mergeCommentUserInfo(comments: any[]) {
  if (!comments || comments.length === 0) return [];

  // Collect all unique user IDs from comments and their replies
  const userIds = new Set<string>();
  comments.forEach(c => {
    if (c.userId) userIds.add(String(c.userId));
    c.replies?.forEach((r: any) => {
      if (r.userId) userIds.add(String(r.userId));
    });
  });

  // Fetch all relevant users in one query
  const users = await User.find({ clerkId: { $in: Array.from(userIds) } }).lean();
  const userMap = new Map(users.map(u => [u.clerkId, u]));

  // Merge the latest data
  return comments.map(c => {
    const u = userMap.get(String(c.userId));
    return {
      ...c,
      userName: u ? u.username : c.userName,
      userImage: u ? resolveAvatar(u) : (c.userImage || "/images/default-avatar.png"),
      replies: c.replies?.map((r: any) => {
        const ru = userMap.get(String(r.userId));
        return {
          ...r,
          userName: ru ? ru.username : r.userName,
          userImage: ru ? resolveAvatar(ru) : (r.userImage || "/images/default-avatar.png")
        };
      })
    };
  });
}

/**
 * Convenience version for a single comment
 */
export async function mergeSingleCommentUserInfo(comment: any) {
  const merged = await mergeCommentUserInfo([comment]);
  return merged[0];
}
