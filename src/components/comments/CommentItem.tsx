"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, Reply, MessageSquare, MoreVertical, Send } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

interface Reply {
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
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
}

interface CommentItemProps {
  comment: Comment;
  onLike: (id: string) => void;
  onReply: (id: string, content: string) => void;
  isReply?: boolean;
}

const DEFAULT_AVATAR = "/images/default-avatar.png";

export function CommentItem({ comment, onLike, onReply, isReply = false }: CommentItemProps) {
  const { user: currentUser } = useUser();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  const hasLiked = currentUser && comment.likes.includes(currentUser.id);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please sign in to like comments");
      return;
    }
    setIsLiking(true);
    await onLike(comment._id);
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
            <h4 className={`font-semibold text-slate-800 truncate ${isReply ? "text-sm" : "text-base"}`}>
              {comment.userName}
            </h4>
            <span className="text-[10px] md:text-xs text-slate-400 whitespace-nowrap">
              {formatDistanceToNow(new Date(comment.createdAt))}
            </span>
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
              {comment.likes.length > 0 && <span>{comment.likes.length}</span>}
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
                    likes: [],
                    replies: [],
                    rating: undefined,
                  } as any}
                  onLike={() => { }} // Simple likes for now
                  onReply={() => { }}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
