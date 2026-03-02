"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Star, Send, Loader2 } from "lucide-react";
import { useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { StarRating } from "@/components/ui/StarRating";
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
}

export function CommentSection({ resourceId }: { resourceId: string }) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [resourceId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
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
        body: JSON.stringify({ content, rating: rating || undefined }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments([newComment, ...comments]);
        setContent("");
        setRating(0);
        toast.success("Comment posted!");
      } else {
        toast.error("Failed to post comment");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like" }),
      });
      if (res.ok) {
        const updatedComment = await res.json();
        setComments(comments.map(c => c._id === commentId ? updatedComment : c));
      }
    } catch (error) {
      console.error("Like failed", error);
    }
  };

  const handleReply = async (commentId: string, replyContent: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", content: replyContent }),
      });
      if (res.ok) {
        const updatedComment = await res.json();
        setComments(comments.map(c => c._id === commentId ? updatedComment : c));
        toast.success("Reply posted!");
      }
    } catch (error) {
      toast.error("Failed to post reply");
    }
  };

  const ratedComments = comments.filter(c => c.rating);
  const totalRatings = ratedComments.length;
  const averageRating = totalRatings > 0
    ? (ratedComments.reduce((acc, c) => acc + (c.rating || 0), 0) / totalRatings).toFixed(1)
    : 0;

  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal" />
            Discussion & Reviews
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'} on this resource
          </p>
        </div>

        {totalRatings > 0 && (
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-1 text-yellow-500 font-bold text-lg">
              <Star className="w-5 h-5 fill-current" />
              {averageRating}
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="text-xs text-slate-500 font-medium">
              {totalRatings} {totalRatings === 1 ? 'Rating' : 'Ratings'}
            </div>
          </div>
        )}
      </div>

      {/* Post Comment Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
        <SignedIn>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={user?.imageUrl}
                alt={user?.username || "User"}
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-50"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900">
                  {user?.fullName || user?.username}
                </span>
                <p className="text-xs text-slate-500">Rate this resource (optional)</p>
              </div>
            </div>

            <div className="mb-4">
              <StarRating rating={rating} onRatingChange={setRating} interactive />
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you think about this resource?"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal/5 focus:border-teal/50 transition-all min-h-[120px] resize-none"
              required
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="bg-teal hover:bg-teal-dark disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg shadow-teal/10 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Post Comment
                    <Send className="w-4 h-4" />
                  </>
                )}
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
            <p className="text-slate-500 text-sm mb-6 max-w-[240px]">
              Sign in to rate this resource and share your thoughts with others.
            </p>
            <SignInButton mode="modal">
              <button className="bg-teal text-white px-8 py-3 rounded-2xl font-semibold hover:bg-teal-dark transition-all">
                Sign In to Comment
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>

      {/* List of Comments */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal animate-spin" />
            <p className="text-slate-400 text-sm mt-4">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 italic">No comments yet. Be the first to start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  onLike={handleLike}
                  onReply={handleReply}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
