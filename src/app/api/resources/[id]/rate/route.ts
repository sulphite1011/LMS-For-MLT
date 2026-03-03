import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Comment from "@/models/Comment";
import mongoose from "mongoose";
import { getAuthUser } from "@/lib/auth";

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

    // Get overall rating stats
    const ratedComments = await Comment.find({
      resourceId: new mongoose.Types.ObjectId(id),
      rating: { $exists: true, $gt: 0 },
    });

    const totalRatings = ratedComments.length;
    const averageRating = totalRatings > 0
      ? (ratedComments.reduce((acc, c) => acc + (c.rating || 0), 0) / totalRatings)
      : 0;

    // Distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratedComments.forEach(c => {
      if (c.rating) distribution[c.rating] = (distribution[c.rating] || 0) + 1;
    });

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
    const user = await getAuthUser();

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
    const ratedComments = await Comment.find({
      resourceId: new mongoose.Types.ObjectId(id),
      rating: { $exists: true, $gt: 0 },
    });

    const totalRatings = ratedComments.length;
    const averageRating = totalRatings > 0
      ? (ratedComments.reduce((acc, c) => acc + (c.rating || 0), 0) / totalRatings)
      : 0;

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
