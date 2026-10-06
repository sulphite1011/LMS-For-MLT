import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Comment from "@/models/Comment";
import "@/models/Subject"; // registers the model used by .populate("subjectId")
import "@/models/User"; // registers the model used by .populate("createdBy")
import { getBannerUrlMap, applyBannerUrls } from "@/lib/banner";

/**
 * Shared server-side reads for a single resource page. Used by both the resource detail
 * page (server component) and GET /api/resources/[id], so they can't drift apart and the
 * page no longer has to call its own public API over HTTP.
 */

const LIST_SELECT =
  "-fileData.fileContent -bannerImageData -files.fileContent -bannerImageUrl";

/** Full resource detail (same shape GET /api/resources/[id] has always returned), or null if not found. */
export async function fetchResourceDetail(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  await dbConnect();

  const resource = await Resource.findById(id)
    // bannerImageUrl may hold a large base64 data URI; it is replaced by a small URL below.
    .select(LIST_SELECT)
    .populate("subjectId", "name")
    .populate("createdBy", "clerkId")
    .lean();

  if (!resource) return null;

  // Rating stats computed inside MongoDB (every comment that has a `rating` field counts;
  // average = sum / count rounded to 1 decimal).
  const [ratingAgg, bannerUrls] = await Promise.all([
    Comment.aggregate([
      { $match: { resourceId: new mongoose.Types.ObjectId(id), rating: { $exists: true } } },
      { $group: { _id: null, total: { $sum: 1 }, sum: { $sum: { $ifNull: ["$rating", 0] } } } },
    ]),
    getBannerUrlMap([id]),
  ]);
  const totalRatings: number = ratingAgg[0]?.total ?? 0;
  const averageRating = totalRatings > 0 ? (ratingAgg[0].sum / totalRatings).toFixed(1) : 0;

  return {
    ...resource,
    bannerImageUrl: bannerUrls.get(String(resource._id)) ?? "",
    averageRating: Number(averageRating),
    totalRatings,
  };
}

/** Up to 4 newest resources in the same subject, excluding the current one (what the page used to fetch via /api/resources?subject=…&limit=4). */
export async function fetchRelatedResources(subjectId: string, excludeId: string) {
  if (!mongoose.isValidObjectId(subjectId)) return [];
  await dbConnect();

  const resources = await Resource.find({ subjectId })
    .select(LIST_SELECT)
    .populate("subjectId", "name")
    .populate("createdBy", "clerkId")
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();

  const bannerUrls = await getBannerUrlMap(resources.map((r) => r._id as unknown as string));
  applyBannerUrls(resources, bannerUrls);

  return resources.filter((r) => String(r._id) !== excludeId);
}
