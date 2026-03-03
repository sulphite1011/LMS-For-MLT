import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Comment from "@/models/Comment";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { mergeCommentUserInfo, mergeSingleCommentUserInfo } from "@/lib/comments";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const comments = await Comment.find({ resourceId: id })
      .sort({ createdAt: -1 })
      .lean();

    const mergedComments = await mergeCommentUserInfo(comments);
    return NextResponse.json(mergedComments);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

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

    const { content, rating } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    await dbConnect();

    const newComment = await Comment.create({
      resourceId: new mongoose.Types.ObjectId(id),
      userId: user.clerkId,
      userName: user.userHandle || user.username,
      userImage: user.customAvatar || user.userImage || "/images/default-avatar.png",
      content,
      rating: rating || undefined,
      likes: [],
      replies: [],
    });

    const mergedComment = await mergeSingleCommentUserInfo(newComment.toObject());
    return NextResponse.json(mergedComment, { status: 201 });
  } catch (error: any) {
    console.error("[Post Comment Error]:", error);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
