import mongoose from "mongoose";
import Resource from "@/models/Resource";

/**
 * Banner helpers.
 *
 * Existing uploads store the banner as a base64 data URI inside
 * `Resource.bannerImageUrl`. Returning that string from list/detail APIs makes
 * every payload (and the homepage HTML) huge and uncacheable. Instead, list/detail
 * reads exclude the field from the query and swap it for a small URL that points to
 * `/api/resources/[id]/banner`, which serves the real image bytes with long-lived
 * cache headers. External http(s) banner URLs are passed through untouched.
 *
 * Nothing is migrated: the stored data is never modified by these helpers.
 */

/** Matches this app's own banner route (relative or absolute), e.g. when an edit form echoes it back. */
export function isOwnBannerRoute(value: unknown, resourceId?: string): boolean {
  if (typeof value !== "string") return false;
  const idPart = resourceId
    ? resourceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "[a-f0-9]{24}";
  return new RegExp(`^(https?://[^/]+)?/api/resources/${idPart}/banner(\\?.*)?$`, "i").test(value.trim());
}

/**
 * For the given resource ids, compute the banner URL to return to clients — entirely
 * inside MongoDB, so base64 image data never leaves the database for list reads.
 *  - data: URI  -> /api/resources/<id>/banner?v=<updatedAt ms>
 *  - anything else (http(s) URL, relative path, empty) -> returned as stored
 */
export async function getBannerUrlMap(
  ids: Array<string | mongoose.Types.ObjectId>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(String(id)));

  const rows: Array<{ _id: mongoose.Types.ObjectId; banner?: string | null }> =
    await Resource.aggregate([
      { $match: { _id: { $in: objectIds } } },
      {
        $project: {
          banner: {
            $let: {
              vars: { b: { $ifNull: ["$bannerImageUrl", ""] } },
              in: {
                $cond: [
                  { $eq: [{ $toLower: { $substrCP: ["$$b", 0, 5] } }, "data:"] },
                  {
                    $concat: [
                      "/api/resources/",
                      { $toString: "$_id" },
                      "/banner?v=",
                      { $toString: { $toLong: { $ifNull: ["$updatedAt", { $ifNull: ["$createdAt", 0] }] } } },
                    ],
                  },
                  "$$b",
                ],
              },
            },
          },
        },
      },
    ]);

  for (const row of rows) {
    map.set(String(row._id), row.banner || "");
  }
  return map;
}

/** Sets `bannerImageUrl` on each (lean) resource object from the map. Mutates and returns the same array. */
export function applyBannerUrls<T extends { _id: unknown; bannerImageUrl?: string }>(
  resources: T[],
  map: Map<string, string>
): T[] {
  for (const r of resources) {
    (r as { bannerImageUrl?: string }).bannerImageUrl = map.get(String(r._id)) ?? "";
  }
  return resources;
}

/** Parses a stored `data:` URI into bytes + mime type. Returns null if it isn't a valid base64 image data URI. */
export function parseDataUri(value: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+)((?:;[^;,]+)*?);base64,/i.exec(value);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (!mime.startsWith("image/")) return null;
  const buffer = Buffer.from(value.slice(match[0].length), "base64");
  if (buffer.length === 0) return null;
  return { mime, buffer };
}
