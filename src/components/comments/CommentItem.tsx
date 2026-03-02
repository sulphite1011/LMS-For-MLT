"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, Reply, Send, Star, Trash2, AtSign, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

interface Reply {
  _id?: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  likes: string[];
  parentReplyId?: string;
  mentionedUser?: string;
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
  onReply: (id: string, content: string, parentReplyId?: string, mentionedUser?: string) => void;
  onDelete: (id: string, replyIndex?: number) => void;
  resourceAuthorId?: string;
  allCommenters?: string[]; // for @mention autocomplete
}

const DEFAULT_AVATAR = "/images/default-avatar.png";

// Get unique commenter usernames from all replies + main comment
function getMentionSuggestions(comment: Comment, excludeUser: string): string[] {
  const names = new Set<string>();
  names.add(comment.userName);
  comment.replies.forEach(r => names.add(r.userName));
  names.delete(excludeUser);
  return Array.from(names);
}

export function CommentItem({
  comment,
  onLike,
  onReply,
  onDelete,
  resourceAuthorId,
  allCommenters = [],
}: CommentItemProps) {
  const { user: currentUser } = useUser();
  const isSuperAdmin = currentUser?.primaryEmailAddress?.emailAddress === "hamadkhadimdgkmc@gmail.com";
  const isAuthor = currentUser?.id === comment.userId;
  const isResourceAuthor = comment.userId === resourceAuthorId;
  const canDelete = isAuthor || isSuperAdmin;

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [replyingToReply, setReplyingToReply] = useState<{ replyId: string; userName: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const hasLiked = currentUser && comment.likes?.includes(currentUser.id);

  const mentionSuggestions = getMentionSuggestions(comment, currentUser?.username || "");
  const filteredSuggestions = mentionSuggestions.filter(name =>
    name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleLike = async () => {
    if (!currentUser) { toast.error("Please sign in to like"); return; }
    setIsLiking(true);
    await onLike(comment._id);
    setIsLiking(false);
  };

  const handleReplyLike = async (idx: number) => {
    if (!currentUser) { toast.error("Please sign in to like"); return; }
    await onLike(comment._id, idx);
  };

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    onReply(
      comment._id,
      replyContent,
      replyingToReply?.replyId || undefined,
      replyingToReply?.userName || undefined
    );
    setReplyContent("");
    setShowReplyInput(false);
    setReplyingToReply(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReplyContent(val);
    // Detect @mention trigger
    const atIdx = val.lastIndexOf("@");
    if (atIdx !== -1 && atIdx === val.length - 1) {
      setMentionSearch("");
      setShowMentions(true);
    } else if (atIdx !== -1 && val.length > atIdx) {
      const query = val.slice(atIdx + 1);
      if (!query.includes(" ")) {
        setMentionSearch(query);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const atIdx = replyContent.lastIndexOf("@");
    const newContent = replyContent.slice(0, atIdx) + `@${name} `;
    setReplyContent(newContent);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const startReplyToReply = (reply: Reply, idx: number) => {
    setReplyingToReply({ replyId: String(idx), userName: reply.userName });
    setReplyContent(`@${reply.userName} `);
    setShowReplyInput(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Group replies: direct replies and nested replies
  const directReplies = comment.replies.filter(r => !r.parentReplyId);
  const nestedReplies = comment.replies.filter(r => r.parentReplyId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 group"
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          <img
            src={comment.userImage || DEFAULT_AVATAR}
            alt={comment.userName}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-slate-50 shadow-sm"
            onError={e => (e.currentTarget.src = DEFAULT_AVATAR)}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-slate-800 text-base truncate">{comment.userName}</h4>
                {isResourceAuthor && (
                  <span className="bg-teal/10 text-teal text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-teal/20">Author</span>
                )}
                {comment.rating && !isResourceAuthor && (
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < (comment.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] md:text-xs text-slate-400 whitespace-nowrap">{formatDistanceToNow(new Date(comment.createdAt))}</span>
              {canDelete && (
                <button onClick={() => onDelete(comment._id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title="Delete comment">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {comment.content && (
            <p className="text-slate-600 leading-relaxed mb-3 text-base whitespace-pre-wrap">{comment.content}</p>
          )}

          <div className="flex items-center gap-4">
            <button onClick={handleLike} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${hasLiked ? "text-teal" : "text-slate-400 hover:text-teal"}`}>
              <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? "fill-teal" : ""}`} />
              {(comment.likes?.length || 0) > 0 && <span>{comment.likes.length}</span>}
              <span>{hasLiked ? "Liked" : "Like"}</span>
            </button>
            <button onClick={() => { setShowReplyInput(!showReplyInput); setReplyingToReply(null); setReplyContent(""); }} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-teal transition-colors">
              <Reply className="w-3.5 h-3.5" /> Reply
            </button>
          </div>

          {/* Reply input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
                {replyingToReply && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                    <CornerDownRight className="w-3.5 h-3.5 text-teal" />
                    Replying to <span className="font-semibold text-teal">@{replyingToReply.userName}</span>
                    <button onClick={() => { setReplyingToReply(null); setReplyContent(""); }} className="ml-2 text-slate-400 hover:text-red-400">×</button>
                  </div>
                )}
                <div className="relative flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={replyContent}
                      onChange={handleInputChange}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReplySubmit(); } }}
                      placeholder="Write a reply... (use @ to mention)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pr-8 text-sm focus:outline-none focus:border-teal/50 min-w-0"
                    />
                    <AtSign className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                    {/* Mention dropdown */}
                    {showMentions && filteredSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 min-w-[160px]">
                        {filteredSuggestions.map(name => (
                          <button key={name} onMouseDown={e => { e.preventDefault(); insertMention(name); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <AtSign className="w-3 h-3 text-teal" />{name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={handleReplySubmit} disabled={!replyContent.trim()} className="p-2.5 bg-teal text-white rounded-xl disabled:opacity-50 hover:bg-teal-dark transition-colors shrink-0 shadow-lg shadow-teal/10">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies (flat + threaded) */}
          {comment.replies?.length > 0 && (
            <div className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
              {comment.replies.map((reply, idx) => {
                const replyHasLiked = currentUser && reply.likes?.includes(currentUser.id);
                const canDeleteReply = currentUser?.id === reply.userId || isSuperAdmin;
                const parentReply = reply.parentReplyId
                  ? comment.replies[parseInt(reply.parentReplyId)]
                  : null;

                return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group/reply">
                    <div className="shrink-0">
                      <img
                        src={reply.userImage || DEFAULT_AVATAR}
                        alt={reply.userName}
                        className="w-8 h-8 rounded-full object-cover border-2 border-slate-50"
                        onError={e => (e.currentTarget.src = DEFAULT_AVATAR)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{reply.userName}</span>
                          {reply.userId === resourceAuthorId && (
                            <span className="bg-teal/10 text-teal text-[9px] font-bold px-1 py-0.5 rounded border border-teal/20">Author</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(reply.createdAt))}</span>
                          {canDeleteReply && (
                            <button onClick={() => onDelete(comment._id, idx)} className="p-1 opacity-0 group-hover/reply:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Quote parent if reply-to-reply */}
                      {reply.parentReplyId && parentReply && (
                        <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-2 py-1 mb-1 border-l-2 border-slate-200 truncate">
                          @{parentReply.userName}: {parentReply.content.slice(0, 60)}{parentReply.content.length > 60 ? "..." : ""}
                        </div>
                      )}
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {reply.mentionedUser && !reply.content.startsWith(`@${reply.mentionedUser}`) && (
                          <span className="text-teal font-medium">@{reply.mentionedUser} </span>
                        )}
                        {reply.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button onClick={() => handleReplyLike(idx)} className={`flex items-center gap-1 text-xs font-medium transition-colors ${replyHasLiked ? "text-teal" : "text-slate-400 hover:text-teal"}`}>
                          <ThumbsUp className={`w-3 h-3 ${replyHasLiked ? "fill-teal" : ""}`} />
                          {(reply.likes?.length || 0) > 0 && <span>{reply.likes.length}</span>}
                          {replyHasLiked ? "Liked" : "Like"}
                        </button>
                        <button onClick={() => startReplyToReply(reply, idx)} className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-teal transition-colors">
                          <Reply className="w-3 h-3" /> Reply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
