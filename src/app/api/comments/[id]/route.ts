import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Comment from "@/models/Comment";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, content } = await req.json();
    await dbConnect();

    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (action === "like") {
      const index = comment.likes.indexOf(user.clerkId);
      if (index === -1) {
        comment.likes.push(user.clerkId);
      } else {
        comment.likes.splice(index, 1);
      }
      await comment.save();
    } else if (action === "reply") {
      if (!content) {
        return NextResponse.json({ error: "Reply content is required" }, { status: 400 });
      }
      comment.replies.push({
        userId: user.clerkId,
        userName: user.username,
        userImage: user.userImage,
        content,
        createdAt: new Date(),
      });
      await comment.save();
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error("[Comment Action Error]:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
