"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, FileText, Video, FileCheck, HelpCircle, BookMarked, Star, Bookmark, Heart } from "lucide-react";
import { RESOURCE_TYPE_BG, type ResourceType } from "@/types";
import { useState, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

interface ResourceCardProps {
  _id: string;
  title: string;
  description?: string;
  resourceType: ResourceType;
  bannerImageUrl?: string;
  subjectName: string;
  hasFile?: boolean;
  averageRating?: number | string;
  totalRatings?: number;
  createdBy?: { username: string; userHandle?: string; clerkId: string };
  viewsCount?: number;
  likesCount?: number;
  favoritesCount?: number;
  isFavorite?: boolean;
  isLiked?: boolean;
  onFavoriteToggle?: (_id: string, action: "added" | "removed") => void;
  onLikeToggle?: (_id: string, action: "added" | "removed") => void;
}

const typeIcons: Record<ResourceType, React.ReactNode> = {
  Notes: <FileText className="w-3.5 h-3.5" />,
  Video: <Video className="w-3.5 h-3.5" />,
  PDF: <FileCheck className="w-3.5 h-3.5" />,
  Reference: <BookMarked className="w-3.5 h-3.5" />,
  Quiz: <HelpCircle className="w-3.5 h-3.5" />,
};

export function ResourceCard({
  _id, title, description, resourceType, bannerImageUrl,
  subjectName, hasFile, averageRating, totalRatings,
  createdBy, viewsCount = 0, likesCount = 0, favoritesCount = 0,
  isFavorite = false, isLiked = false,
  onFavoriteToggle, onLikeToggle,
}: ResourceCardProps) {
  const { user } = useUser();
  const [localFav, setLocalFav] = useState(isFavorite);
  const [localLike, setLocalLike] = useState(isLiked);
  const [loading, setLoading] = useState(false);

  // Sync props → local state when user data loads asynchronously
  useEffect(() => { setLocalLike(isLiked); }, [isLiked]);
  useEffect(() => { setLocalFav(isFavorite); }, [isFavorite]);

  const handleFav = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Sign in to save favorites"); return; }
    console.log("[ResourceCard] handleFav called. Current state:", localFav);
    setLocalFav(prev => !prev);
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: _id, type: "favorite" }),
      });
      if (!res.ok) {
        console.error("[ResourceCard] handleFav failed:", res.status);
        setLocalFav(prev => !prev);
        toast.error("Failed");
      }
      else {
        const data = await res.json();
        const finalAction = data.action as "added" | "removed";
        setLocalFav(finalAction === "added");
        toast.success(finalAction === "added" ? "Added to favorites" : "Removed from favorites");
        onFavoriteToggle?.(_id, finalAction);
      }
    } catch (err) {
      console.error("[ResourceCard] handleFav error:", err);
      setLocalFav(prev => !prev);
    } finally { setLoading(false); }
  }, [user, _id, localFav, onFavoriteToggle]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Sign in to like resources"); return; }
    console.log("[ResourceCard] handleLike called. Current state:", localLike);
    setLocalLike(prev => !prev);
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: _id, type: "like" }),
      });
      if (!res.ok) {
        console.error("[ResourceCard] handleLike failed:", res.status);
        setLocalLike(prev => !prev);
        toast.error("Failed");
      }
      else {
        const data = await res.json();
        const finalAction = data.action as "added" | "removed";
        setLocalLike(finalAction === "added");
        toast.success(finalAction === "added" ? "Liked!" : "Removed from liked");
        onLikeToggle?.(_id, finalAction);
      }
    } catch (err) {
      console.error("[ResourceCard] handleLike error:", err);
      setLocalLike(prev => !prev);
    } finally { setLoading(false); }
  }, [user, _id, localLike, onLikeToggle]);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group"
    >
      <Link href={`/resource/${_id}`}>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
          {/* Banner */}
          <div className="relative h-48 bg-linear-to-br from-navy to-navy-light overflow-hidden">
            {bannerImageUrl ? (
              <Image
                src={bannerImageUrl}
                alt={title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <BookOpen className="w-16 h-16 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />

            {/* Type badge */}
            <div className={`absolute top-3 left-3 ${RESOURCE_TYPE_BG[resourceType]} text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg`}>
              {typeIcons[resourceType]}{resourceType}
            </div>

            {/* Fav + Like buttons (top-right) */}
            {user && (
              <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                <button
                  onClick={handleLike}
                  disabled={loading}
                  title={localLike ? "Unlike" : "Like"}
                  className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm shadow transition-all ${localLike ? "bg-red-500 text-white" : "bg-white/80 text-gray-500 hover:text-red-500"}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${localLike ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={handleFav}
                  disabled={loading}
                  title={localFav ? "Remove from favorites" : "Add to favorites"}
                  className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm shadow transition-all ${localFav ? "bg-teal text-white" : "bg-white/80 text-gray-500 hover:text-teal"}`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${localFav ? "fill-current" : ""}`} />
                </button>
              </div>
            )}

            {hasFile && (
              <div className="absolute bottom-3 right-3 bg-white/90 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <FileCheck className="w-3 h-3" />PDF
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <span className="bg-teal text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                View Resource
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-teal" />
              <span className="text-xs font-medium text-teal">{subjectName}</span>
            </div>
            <h3 className="font-semibold text-text-primary text-base line-clamp-2 mb-2 group-hover:text-teal transition-colors">{title}</h3>
            {description && <p className="text-sm text-gray-500 line-clamp-2 flex-1">{description}</p>}

            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" /> {likesCount}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-gray-300" /> {viewsCount.toLocaleString()} views
                </span>
              </div>
              {createdBy && (
                <span className="flex items-center gap-1 truncate max-w-[150px]" title={`Created by ${createdBy.username}`}>
                  <svg className="w-3 h-3 text-teal shrink-0" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
                  <span className="font-bold text-teal truncate text-[11px]">{createdBy.username}</span>
                </span>
              )}
            </div>

            {totalRatings !== undefined && totalRatings > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-md">
                  <Star className="w-3 h-3 fill-current" />{averageRating}
                </div>
                <span className="text-gray-400 font-normal">({totalRatings})</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
