import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Comment from "@/models/Comment";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, AppErrors } from "@/lib/api-errors";
import { mergeSingleCommentUserInfo } from "@/lib/comments";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) throw AppErrors.Unauthorized();

    const { action, content, replyIndex, parentReplyId, mentionedUser } = await req.json();
    await dbConnect();

    const comment = await Comment.findById(id);
    if (!comment) {
      throw AppErrors.NotFound("Comment not found");
    }

    if (action === "like") {
      if (typeof replyIndex === "number") {
        // Like a reply
        const reply = comment.replies[replyIndex];
        if (!reply) throw AppErrors.NotFound("Reply not found");

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
      const merged = await mergeSingleCommentUserInfo(comment);
      return NextResponse.json(merged);
    } else if (action === "reply") {
      if (!content) {
        throw AppErrors.BadRequest("Reply content is required");
      }
      // Add the new reply to the comment
      comment.replies.push({
        userId: user.clerkId,
        userName: user.userHandle || user.username || "User",
        userImage: user.userImage,
        content,
        parentReplyId,
        mentionedUser,
        likes: [],
        createdAt: new Date()
      });

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
        throw AppErrors.BadRequest("Reply index is required");
      }

      const reply = comment.replies[replyIndex];
      if (!reply) throw AppErrors.NotFound("Reply not found");

      // Only owner of reply or super admin can delete
      const isOwner = reply.userId === user.clerkId;
      const isSuperAdmin = user.role === "superAdmin";

      if (!isOwner && !isSuperAdmin) {
        throw AppErrors.Forbidden();
      }

      comment.replies.splice(replyIndex, 1);
      await comment.save();
    } else {
      throw AppErrors.BadRequest("Invalid action");
    }

    const mergedComment = await mergeSingleCommentUserInfo(comment.toObject());
    return NextResponse.json(mergedComment);
  } catch (error) {
    return handleApiError(error);
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

    const isOwner = comment.userId === user.clerkId;
    const isSuperAdmin = user.role === "superAdmin";

    if (!isOwner && !isSuperAdmin) {
      throw AppErrors.Forbidden();
    }

    await Comment.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
