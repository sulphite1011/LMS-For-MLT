"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, Reply, MessageSquare, MoreVertical, Send, Star, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

interface Reply {
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  likes: string[];
  createdAt: string;
}

interface Comment {
  _id: string;
  userName: string;
  userImage?: string;
  content: string;
  rating?: number;
  likes: string[];
  replies: Reply[];
  createdAt: string;
  resourceId?: string;
  userId: string;
}

interface CommentItemProps {
  comment: Comment;
  onLike: (id: string, replyIndex?: number) => void;
  onReply: (id: string, content: string) => void;
  onDelete: (id: string, replyIndex?: number) => void;
  isReply?: boolean;
  replyIndex?: number;
  parentId?: string;
  resourceAuthorId?: string;
}

const DEFAULT_AVATAR = "/images/default-avatar.png";

export function CommentItem({
  comment,
  onLike,
  onReply,
  onDelete,
  isReply = false,
  replyIndex,
  parentId,
  resourceAuthorId
}: CommentItemProps) {
  const { user: currentUser } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin/superAdmin (simplified check, real check should be from Clerk metadata/token)
  // But for UI purpose, we can check email or role if available in public metadata
  // However, the superAdmin email is known: hamadkhadimdgkmc@gmail.com
  const isSuperAdmin = currentUser?.primaryEmailAddress?.emailAddress === "hamadkhadimdgkmc@gmail.com";
  const isAuthor = currentUser?.id === comment.userId;
  const isResourceAuthor = comment.userId === resourceAuthorId;
  const canDelete = isAuthor || isSuperAdmin;
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  const currentTarget = isReply ? comment : comment; // The comment prop passed in the map IS the reply object for replies
  const hasLiked = currentUser && comment.likes?.includes(currentUser.id);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please sign in to like comments");
      return;
    }
    setIsLiking(true);
    if (isReply && parentId && typeof replyIndex === "number") {
      await onLike(parentId, replyIndex);
    } else {
      await onLike(comment._id);
    }
    setIsLiking(false);
  };

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    onReply(comment._id, replyContent);
    setReplyContent("");
    setShowReplyInput(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group ${isReply
        ? "ml-6 md:ml-12 mt-4"
        : "bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100"}`}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          <img
            src={comment.userImage || DEFAULT_AVATAR}
            alt={comment.userName}
            className={`${isReply ? "w-8 h-8" : "w-10 h-10 md:w-12 md:h-12"} rounded-full object-cover border-2 border-slate-50 shadow-sm`}
            onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex flex-col mb-1">
              <div className="flex items-center gap-2">
                <h4 className={`font-semibold text-slate-800 truncate ${isReply ? "text-sm" : "text-base"}`}>
                  {comment.userName}
                </h4>
                {isResourceAuthor && (
                  <span className="bg-teal/10 text-teal text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-teal/20">
                    Author
                  </span>
                )}
              </div>
              {comment.rating && !isReply && !isResourceAuthor && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < (comment.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs text-slate-400 whitespace-nowrap">
                {formatDistanceToNow(new Date(comment.createdAt))}
              </span>
              {canDelete && (
                <button
                  onClick={() => onDelete(isReply && parentId ? parentId : comment._id, isReply ? replyIndex : undefined)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  title={isReply ? "Delete reply" : "Delete comment"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className={`text-slate-600 leading-relaxed mb-3 ${isReply ? "text-sm" : "text-base"}`}>
            {comment.content}
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${hasLiked ? "text-teal" : "text-slate-400 hover:text-teal"
                }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? "fill-teal" : ""}`} />
              {(comment.likes?.length || 0) > 0 && <span>{comment.likes.length}</span>}
              <span>{hasLiked ? "Liked" : "Like"}</span>
            </button>

            {!isReply && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-teal transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}
          </div>

          {/* Reply Input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4"
              >
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-teal/50 min-w-0"
                  />
                  <button
                    onClick={handleReplySubmit}
                    disabled={!replyContent.trim()}
                    className="p-2.5 bg-teal text-white rounded-xl disabled:opacity-50 hover:bg-teal-dark transition-colors shrink-0 shadow-lg shadow-teal/10"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested Replies */}
          {!isReply && comment.replies?.length > 0 && (
            <div className="mt-2 space-y-4">
              {comment.replies.map((reply, idx) => (
                <CommentItem
                  key={idx}
                  comment={{
                    _id: `${comment._id}-reply-${idx}`,
                    ...reply,
                    likes: (reply as any).likes || [],
                    replies: [],
                    rating: undefined,
                  } as any}
                  onLike={onLike}
                  onReply={onReply}
                  onDelete={onDelete}
                  isReply={true}
                  replyIndex={idx}
                  parentId={comment._id}
                  resourceAuthorId={resourceAuthorId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
