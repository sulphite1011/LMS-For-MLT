import User from "@/models/User";

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
      userImage: u ? (u.customAvatar || u.userImage) : (c.userImage || "/images/default-avatar.png"),
      replies: c.replies?.map((r: any) => {
        const ru = userMap.get(String(r.userId));
        return {
          ...r,
          userName: ru ? ru.username : r.userName,
          userImage: ru ? (ru.customAvatar || ru.userImage) : (r.userImage || "/images/default-avatar.png")
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
