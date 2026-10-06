import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Comment from "@/models/Comment";
import mongoose from "mongoose";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Rating stats computed inside MongoDB instead of loading every rated comment.
 * Same semantics as before: only comments with rating > 0 count; average = sum / count;
 * distribution is a per-star count (1-5 always present).
 */
async function getRatingStats(resourceId: string) {
  const groups: { _id: number; count: number }[] = await Comment.aggregate([
    { $match: { resourceId: new mongoose.Types.ObjectId(resourceId), rating: { $exists: true, $gt: 0 } } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRatings = 0;
  let sum = 0;
  for (const g of groups) {
    totalRatings += g.count;
    sum += g._id * g.count;
    distribution[g._id] = (distribution[g._id] || 0) + g.count;
  }
  const averageRating = totalRatings > 0 ? sum / totalRatings : 0;
  return { totalRatings, averageRating, distribution };
}

/**
 * GET /api/resources/[id]/rate
 * Returns the current user's rating for a resource
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    await dbConnect();

    // Get overall rating stats (+ distribution)
    const { totalRatings, averageRating, distribution } = await getRatingStats(id);

    // Current user's rating (if logged in)
    let userRating = 0;
    if (user) {
      const existing = await Comment.findOne({
        resourceId: new mongoose.Types.ObjectId(id),
        userId: user.clerkId,
        rating: { $exists: true, $gt: 0 },
      });
      userRating = existing?.rating || 0;
    }

    return NextResponse.json({
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings,
      distribution,
      userRating,
    });
  } catch (error) {
    console.error("GET /api/resources/[id]/rate error:", error);
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
  }
}

/**
 * POST /api/resources/[id]/rate
 * Submit or update standalone rating (no comment required)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser({ includeAvatar: true });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating } = await req.json();
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    await dbConnect();

    // Upsert: update existing rating comment or create a new one (content-less)
    await Comment.findOneAndUpdate(
      {
        resourceId: new mongoose.Types.ObjectId(id),
        userId: user.clerkId,
        // Find an existing standalone rating (has rating, empty or no content)
      },
      {
        $set: {
          resourceId: new mongoose.Types.ObjectId(id),
          userId: user.clerkId,
          userName: user.username,
          userImage: user.customAvatar || user.userImage || "/images/default-avatar.png",
          rating,
        },
        $setOnInsert: {
          content: "",
          likes: [],
          replies: [],
        },
      },
      { upsert: true, new: true }
    );

    // Return updated stats
    const { totalRatings, averageRating } = await getRatingStats(id);
    revalidatePath(`/resource/${id}`);

    return NextResponse.json({
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings,
      userRating: rating,
    });
  } catch (error) {
    console.error("POST /api/resources/[id]/rate error:", error);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
