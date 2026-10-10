/**
 * "Unknown Author" handling. When an admin is removed, their resources are marked `isOrphaned`
 * and the former owner is recorded in `formerOwnerId` / `formerOwnerName`. Everyone except the
 * Super Admin sees only "Unknown Author": public reads exclude the former-owner fields and
 * hide `createdBy` for orphaned resources.
 */
export const UNKNOWN_AUTHOR = "Unknown Author";

/** Append to every public `.select()` so the former owner can never leak. */
export const HIDE_FORMER_OWNER = "-formerOwnerId -formerOwnerName";

/**
 * For lean resource objects (with `createdBy` populated as `{ clerkId, username }`): sets
 * `authorName` — the author's username, or "Unknown Author" for orphaned resources.
 * With `hideOwner` (default) the owner of orphaned resources is also removed from the object;
 * the Super Admin's own listing passes `false` so it can still see/claim them.
 */
export function maskOrphans<T extends { isOrphaned?: boolean; createdBy?: unknown }>(items: T[], hideOwner = true): T[] {
  for (const item of items) {
    const record = item as Record<string, unknown>;
    if (item.isOrphaned) {
      if (hideOwner) record.createdBy = undefined;
      record.authorName = UNKNOWN_AUTHOR;
    } else {
      const owner = item.createdBy as { username?: string } | null | undefined;
      record.authorName = owner?.username || UNKNOWN_AUTHOR;
    }
  }
  return items;
}
