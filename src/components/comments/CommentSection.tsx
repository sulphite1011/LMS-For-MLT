"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Star, Send, Loader2, Check } from "lucide-react";
import { useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { CommentItem } from "./CommentItem";
import toast from "react-hot-toast";

interface Comment {
  _id: string;
  userName: string;
  userImage?: string;
  content: string;
  rating?: number;
  likes: string[];
  replies: any[];
  createdAt: string;
  userId: string;
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  userRating: number;
  distribution: Record<number, number>;
}

export function CommentSection({ resourceId, resourceAuthorId }: { resourceId: string; resourceAuthorId?: string }) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Separate rating state
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchRatingStats();
  }, [resourceId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatingStats = async () => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/rate`);
      if (res.ok) setRatingStats(await res.json());
    } catch (error) {
      console.error("Failed to fetch ratings", error);
    }
  };

  const handleRatingSubmit = async (rating: number) => {
    if (!user) { toast.error("Please sign in to rate"); return; }
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        const data = await res.json();
        setRatingStats(prev => prev ? { ...prev, ...data } : data);
        setRatingSubmitted(true);
        toast.success(ratingStats?.userRating ? "Rating updated!" : "Thank you for rating!");
        setTimeout(() => setRatingSubmitted(false), 3000);
      }
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments([newComment, ...comments]);
        setContent("");
        toast.success("Comment posted!");
      } else {
        toast.error("Failed to post comment");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string, replyIndex?: number) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", replyIndex: typeof replyIndex === "number" ? replyIndex : undefined }),
      });
      if (res.ok) {
        const updatedComment = await res.json();
        setComments(comments.map(c => c._id === commentId ? updatedComment : c));
      }
    } catch (error) {
      console.error("Like failed", error);
    }
  };

  const handleDelete = async (commentId: string, replyIndex?: number) => {
    const isReply = typeof replyIndex === "number";
    if (!window.confirm(`Delete this ${isReply ? "reply" : "comment"}?`)) return;

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: isReply ? "PATCH" : "DELETE",
        headers: isReply ? { "Content-Type": "application/json" } : undefined,
        body: isReply ? JSON.stringify({ action: "delete_reply", replyIndex }) : undefined,
      });

      if (res.ok) {
        if (isReply) {
          const updatedComment = await res.json();
          setComments(comments.map(c => c._id === commentId ? updatedComment : c));
          toast.success("Reply deleted");
        } else {
          setComments(comments.filter(c => c._id !== commentId));
          toast.success("Comment deleted");
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleReply = async (commentId: string, replyContent: string, parentReplyId?: string, mentionedUser?: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", content: replyContent, parentReplyId, mentionedUser }),
      });
      if (res.ok) {
        const updatedComment = await res.json();
        setComments(comments.map(c => c._id === commentId ? updatedComment : c));
        toast.success("Reply posted!");
      }
    } catch {
      toast.error("Failed to post reply");
    }
  };

  const displayRating = hoverRating || (ratingStats?.userRating ?? 0);

  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal" /> Discussion
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {comments.filter(c => c.content).length} {comments.filter(c => c.content).length === 1 ? "comment" : "comments"} on this resource
          </p>
        </div>

        {ratingStats && ratingStats.totalRatings > 0 && (
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= Math.round(ratingStats.averageRating) ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}`} />
              ))}
            </div>
            <span className="text-lg font-bold text-slate-800">{ratingStats.averageRating}</span>
            <span className="text-xs text-slate-500">({ratingStats.totalRatings} {ratingStats.totalRatings === 1 ? "rating" : "ratings"})</span>
          </div>
        )}
      </div>

      {/* ── RATING CARD (separate from comment) ── */}
      <SignedIn>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
          <h3 className="font-semibold text-slate-900 text-lg mb-1 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" /> Rate this Resource
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {ratingStats?.userRating ? (
              <>Your current rating: <span className="font-semibold text-yellow-500">{ratingStats.userRating}/5 ★</span> — click to update</>
            ) : "How would you rate this resource?"}
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleRatingSubmit(star)}
                disabled={submittingRating}
                className="transition-transform hover:scale-110 disabled:opacity-50 focus:outline-none"
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <Star className={`w-8 h-8 transition-colors ${star <= displayRating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 hover:text-yellow-300"}`} />
              </button>
            ))}
            {submittingRating && <Loader2 className="w-5 h-5 animate-spin text-teal ml-2" />}
            {ratingSubmitted && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 text-teal text-sm font-medium ml-2">
                <Check className="w-4 h-4" /> Saved!
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {["1", "2", "3", "4", "5"].map(star => (
              <span key={star} className="text-xs text-slate-400" style={{ width: "2rem", textAlign: "center" }}>{star}★</span>
            ))}
          </div>
        </motion.div>
      </SignedIn>

      {/* ── COMMENT CARD (no rating) ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
        <SignedIn>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <img
                src={user?.imageUrl || "/images/default-avatar.png"}
                alt={user?.username || "User"}
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-50"
                onError={e => (e.currentTarget.src = "/images/default-avatar.png")}
              />
              <div>
                <span className="text-sm font-semibold text-slate-900">{user?.fullName || user?.username}</span>
                <p className="text-xs text-slate-500">Leave a comment</p>
              </div>
            </div>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share your thoughts about this resource..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal/5 focus:border-teal/50 transition-all min-h-[120px] resize-none"
              required
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="w-full sm:w-auto bg-teal hover:bg-teal-dark disabled:opacity-50 text-white font-semibold px-6 md:px-8 py-3 rounded-2xl shadow-lg shadow-teal/10 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" />Post Comment</>}
              </button>
            </div>
          </form>
        </SignedIn>

        <SignedOut>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Join the discussion</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-[240px]">Sign in to rate this resource and share your thoughts.</p>
            <SignInButton mode="modal">
              <button className="bg-teal text-white px-8 py-3 rounded-2xl font-semibold hover:bg-teal-dark transition-all">
                Sign In to Comment
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>

      {/* ── COMMENTS LIST ── */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal animate-spin" />
            <p className="text-slate-400 text-sm mt-4">Loading comments...</p>
          </div>
        ) : comments.filter(c => c.content).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 italic">No comments yet. Be the first to start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {comments.filter(c => c.content).map(comment => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  onLike={handleLike}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  resourceAuthorId={resourceAuthorId}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
