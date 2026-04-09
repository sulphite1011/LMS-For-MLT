import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Comment from "@/models/Comment";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import mongoose from "mongoose";

export async function GET() {
  try {
    const user = await requireAdmin();
    await dbConnect();

    // Filter by creator unless it's a Super Admin requesting global stats
    const filter = user.role === "superAdmin" ? {} : { createdBy: user._id };

    const [resources, ratingStats] = await Promise.all([
      Resource.find(filter).select("viewsCount"),
      Comment.aggregate([
        {
          $lookup: {
            from: "resources",
            localField: "resourceId",
            foreignField: "_id",
            as: "resource"
          }
        },
        { $unwind: "$resource" },
        {
          $match: user.role === "superAdmin"
            ? { rating: { $gt: 0 } }
            : { "resource.createdBy": user._id, rating: { $gt: 0 } }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalRatings: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      totalResources: resources.length,
      totalViews: resources.reduce((acc, r) => acc + (r.viewsCount || 0), 0),
      averageRating: ratingStats.length > 0 ? Number(ratingStats[0].averageRating.toFixed(1)) : 0,
      totalRatings: ratingStats.length > 0 ? ratingStats[0].totalRatings : 0
    };

    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
