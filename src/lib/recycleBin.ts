import mongoose from "mongoose";
import Resource from "@/models/Resource";
import Comment from "@/models/Comment";

/** How long a deleted resource stays in the recycle bin before it is removed for good. */
export const RECYCLE_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Select string that keeps the recycle-bin fields out of public payloads. */
export const HIDE_DELETED_FIELDS = "-deletedAt -deletedBy";

/** Whole days left before `deletedAt` + 30 days (never below 0). */
export function daysLeft(deletedAt: Date | string): number {
  const expires = new Date(deletedAt).getTime() + RECYCLE_RETENTION_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((expires - Date.now()) / DAY_MS));
}

/**
 * Permanently removes resources that have been in the recycle bin for more than 30 days
 * (and their comments). Safe to call any time; it only touches already-expired items.
 * Called by the daily cron route and lazily whenever a recycle bin is listed.
 */
export async function purgeExpiredResources(): Promise<number> {
  const cutoff = new Date(Date.now() - RECYCLE_RETENTION_DAYS * DAY_MS);
  const expired = await Resource.find({ deletedAt: { $lte: cutoff } }).select("_id").lean();
  if (expired.length === 0) return 0;
  const ids = expired.map((r) => new mongoose.Types.ObjectId(String(r._id)));
  await Comment.deleteMany({ resourceId: { $in: ids } });
  const result = await Resource.deleteMany({ _id: { $in: ids }, deletedAt: { $lte: cutoff } });
  return result.deletedCount ?? 0;
}
