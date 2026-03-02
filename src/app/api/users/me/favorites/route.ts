import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Resource from "@/models/Resource";
import mongoose from "mongoose";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/users/me/favorites
 * Returns the current user's favorite resources
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ clerkId: authUser.clerkId }).lean();
    if (!user) return NextResponse.json({ favorites: [], liked: [] });

    const [favorites, liked] = await Promise.all([
      Resource.find({ _id: { $in: user.favoriteResources } })
        .select("-fileData.fileContent -bannerImageData -files.fileContent")
        .populate("subjectId", "name")
        .lean(),
      Resource.find({ _id: { $in: user.likedResources } })
        .select("-fileData.fileContent -bannerImageData -files.fileContent")
        .populate("subjectId", "name")
        .lean(),
    ]);

    return NextResponse.json({ favorites, liked });
  } catch (error) {
    console.error("GET /api/users/me/favorites error:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

/**
 * POST /api/users/me/favorites
 * Body: { resourceId, type: "favorite" | "like" }
 * Toggle favorite or like a resource
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId, type } = await req.json();
    if (!resourceId || !["favorite", "like"].includes(type)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await dbConnect();

    const field = type === "favorite" ? "favoriteResources" : "likedResources";
    const objectId = new mongoose.Types.ObjectId(resourceId);

    const user = await User.findOne({ clerkId: authUser.clerkId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const arr = user[field] as mongoose.Types.ObjectId[];
    const existingIndex = arr.findIndex(id => id.toString() === resourceId);

    let action: "added" | "removed";
    if (existingIndex === -1) {
      arr.push(objectId);
      action = "added";
    } else {
      arr.splice(existingIndex, 1);
      action = "removed";
    }

    await user.save();

    return NextResponse.json({ action, [field]: user[field] });
  } catch (error) {
    console.error("POST /api/users/me/favorites error:", error);
    return NextResponse.json({ error: "Failed to update favorites" }, { status: 500 });
  }
}
