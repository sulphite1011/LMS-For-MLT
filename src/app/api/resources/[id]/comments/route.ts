import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Comment from "@/models/Comment";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { mergeCommentUserInfo, mergeSingleCommentUserInfo } from "@/lib/comments";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    // Additive pagination. Without `limit` the response is exactly what it always was: the full
    // array (including standalone-rating entries with empty content). With `limit` (1-50) the
    // response is { comments, hasMore, nextCursor, total } and only contains real comments
    // (non-empty content — the same ones the UI shows). Rating statistics are NOT derived from
    // this endpoint; they come from /rate and are computed over all ratings in MongoDB.
    const limitParam = req.nextUrl.searchParams.get("limit");
    if (limitParam === null) {
      const comments = await Comment.find({ resourceId: id })
        .sort({ createdAt: -1 })
        .lean();

      const mergedComments = await mergeCommentUserInfo(comments);
      return NextResponse.json(mergedComments);
    }

    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50);
    const baseFilter = { resourceId: id, content: { $nin: ["", null] } };
    const filter: Record<string, unknown> = { ...baseFilter };

    // Cursor = "<createdAt ISO>_<_id>" of the last comment already loaded. Unlike page numbers it
    // stays correct when comments are added or deleted between requests.
    const before = req.nextUrl.searchParams.get("before");
    if (before) {
      const [iso, cursorId] = before.split("_");
      const cursorDate = new Date(iso);
      if (!isNaN(cursorDate.getTime()) && mongoose.isValidObjectId(cursorId)) {
        filter.$or = [
          { createdAt: { $lt: cursorDate } },
          { createdAt: cursorDate, _id: { $lt: new mongoose.Types.ObjectId(cursorId) } },
        ];
      }
    }

    const [page, total] = await Promise.all([
      Comment.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean(),
      before ? Promise.resolve(null) : Comment.countDocuments(baseFilter), // total only needed on the first page
    ]);

    const hasMore = page.length > limit;
    const pageComments = hasMore ? page.slice(0, limit) : page;
    const last = pageComments[pageComments.length - 1];
    const nextCursor = hasMore && last ? `${new Date(last.createdAt).toISOString()}_${String(last._id)}` : null;

    const mergedComments = await mergeCommentUserInfo(pageComments);
    return NextResponse.json({ comments: mergedComments, hasMore, nextCursor, total });
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
    const user = await getAuthUser({ includeAvatar: true });

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

    // A comment with a star rating changes the rating badge on the (cached) resource page.
    if (rating) revalidatePath(`/resource/${id}`);

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
