import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Comment from "@/models/Comment";
import { getAuthUser } from "@/lib/auth";
import { mergeSingleCommentUserInfo } from "@/lib/comments";

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

    const { action, content, replyIndex, parentReplyId, mentionedUser } = await req.json();
    await dbConnect();

    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (action === "like") {
      if (typeof replyIndex === "number") {
        // Like a reply
        const reply = comment.replies[replyIndex];
        if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });

        if (!reply.likes) reply.likes = [];
        const index = reply.likes.indexOf(user.clerkId);
        if (index === -1) {
          reply.likes.push(user.clerkId);
        } else {
          reply.likes.splice(index, 1);
        }
      } else {
        // Like main comment
        const index = comment.likes.indexOf(user.clerkId);
        if (index === -1) {
          comment.likes.push(user.clerkId);
        } else {
          comment.likes.splice(index, 1);
        }
      }
      await comment.save();
    } else if (action === "reply") {
      if (!content) {
        return NextResponse.json({ error: "Reply content is required" }, { status: 400 });
      }
      // Trigger Notification for the parent comment author
      try {
        if (comment.userId !== user.clerkId) {
          const { sendNotification } = await import("@/lib/notifications");
          await sendNotification({
            recipientId: comment.userId,
            type: "COMMENT_REPLY",
            title: "New Reply",
            message: `${user.userHandle || user.username} replied to your comment.`,
            link: `/resource/${comment.resourceId}`
          });
        }
      } catch (notifyError) {
        console.error("Failed to send reply notification:", notifyError);
      }

      await comment.save();
    } else if (action === "delete_reply") {
      if (typeof replyIndex !== "number") {
        return NextResponse.json({ error: "Reply index is required" }, { status: 400 });
      }

      const reply = comment.replies[replyIndex];
      if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });

      // Only owner of reply or super admin can delete
      const isOwner = reply.userId === user.clerkId;
      const isSuperAdmin = user.role === "superAdmin";

      if (!isOwner && !isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      comment.replies.splice(replyIndex, 1);
      await comment.save();
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const mergedComment = await mergeSingleCommentUserInfo(comment.toObject());
    return NextResponse.json(mergedComment);
  } catch (error: any) {
    console.error("[Comment Action Error]:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const comment = await Comment.findById(id);

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only author or super admin can delete
    const isOwner = comment.userId === user.clerkId;
    const isSuperAdmin = user.role === "superAdmin";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Comment.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Comment Delete Error]:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
