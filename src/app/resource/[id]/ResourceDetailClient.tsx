"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SignInButton, useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Play,
  Calendar,
  Star,
  Lock,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ResourceCard } from "@/components/ResourceCard";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { getYoutubeEmbedUrl } from "@/lib/utils";
import { RESOURCE_TYPE_BG, type ResourceType } from "@/types";

// Dynamically import CommentSection — it's heavy and below the fold.
// This reduces the initial JS bundle sent to the user.
const CommentSection = dynamic(
  () => import("@/components/comments/CommentSection").then(m => m.CommentSection),
  { ssr: false, loading: () => <div className="h-32 rounded-2xl bg-gray-100 animate-pulse mt-8" /> }
);

interface Subject {
  _id: string;
  name: string;
}

interface FileEntry {
  fileType: string;
  fileName?: string;
  fileSize?: number;
  externalLink?: string;
  label?: string;
}

interface ExternalLink {
  label: string;
  url: string;
}

interface Resource {
  _id: string;
  title: string;
  description?: string;
  resourceType: ResourceType;
  bannerImageUrl?: string;
  subjectId: Subject;
  fileData?: FileEntry; // legacy single file
  files?: FileEntry[];  // new multiple files
  externalLinks?: ExternalLink[]; // new multiple external links
  youtubeUrls: string[];
  createdAt: string;
  createdBy: { _id: string; clerkId: string };
  averageRating?: number | string;
  totalRatings?: number;
}

export default function ResourceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [resource, setResource] = useState<Resource | null>(null);
  const [related, setRelated] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { isLoaded: userLoaded, user: clerkUser } = useUser();

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const res = await fetch(`/api/resources/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setResource(data);

        // Fetch related
        if (data.subjectId?._id) {
          const relRes = await fetch(
            `/api/resources?subject=${data.subjectId._id}&limit=4`
          );
          const relData = await relRes.json();
          setRelated(
            (relData.resources || []).filter(
              (r: Resource) => r._id !== data._id
            )
          );
        }

        // Fetch user profile for favorites/likes
        const userRes = await fetch("/api/users/me");
        if (userRes.ok) setCurrentUser(await userRes.json());
      } catch (err) {
        console.error("Failed to fetch resource:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <FileText className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Resource Not Found
          </h2>
          <p className="text-gray-400 mb-6">
            The resource you are looking for does not exist.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-teal text-white px-6 py-2.5 rounded-full font-medium hover:bg-teal-dark transition-colors"
            suppressHydrationWarning
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const embedUrl =
    resource.youtubeUrls?.[activeVideo]
      ? getYoutubeEmbedUrl(resource.youtubeUrls[activeVideo])
      : null;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-64 md:h-80 bg-linear-to-br from-navy to-navy-light overflow-hidden"
      >
        {resource.bannerImageUrl && (
          <Image
            src={resource.bannerImageUrl}
            alt={resource.title}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-navy via-navy/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 max-w-7xl mx-auto">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 w-fit transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </motion.button>
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`${RESOURCE_TYPE_BG[resource.resourceType]} text-white text-xs font-medium px-3 py-1 rounded-full`}
            >
              {resource.resourceType}
            </span>
            <span className="text-gray-400 text-sm flex items-center gap-1.5 border-l border-white/20 pl-3">
              <BookOpen className="w-3.5 h-3.5" />
              {resource.subjectId?.name}
            </span>
            {resource.totalRatings && resource.totalRatings > 0 && (
              <span className="text-yellow-400 text-sm font-semibold flex items-center gap-1.5 border-l border-white/20 pl-3">
                <Star className="w-4 h-4 fill-current" />
                {resource.averageRating}
                <span className="text-gray-400 font-normal">({resource.totalRatings})</span>
              </span>
            )}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl md:text-4xl font-bold text-white"
          >
            {resource.title}
          </motion.h1>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Left - Description */}
          <div className="lg:col-span-2 space-y-6">
            {resource.description && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text-primary mb-3">
                  Description
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {resource.description}
                </p>
              </div>
            )}

            {/* YouTube Videos */}
            {resource.youtubeUrls?.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Video Content
                </h2>
                {!userLoaded ? (
                  <div className="aspect-video rounded-xl bg-gray-100 animate-pulse" />
                ) : !clerkUser ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-6 text-center border border-white/5 relative group">
                    {resource.bannerImageUrl && (
                      <Image
                        src={resource.bannerImageUrl}
                        alt=""
                        fill
                        className="object-cover opacity-20 blur-sm"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/10 group-hover:scale-110 transition-transform">
                        <Lock className="w-6 h-6 text-teal" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">Video content is locked</h3>
                      <p className="text-slate-400 text-sm max-w-sm mb-6">
                        Sign in to your account to watch this study material and access all features.
                      </p>
                      <SignInButton mode="modal">
                        <button className="bg-teal hover:bg-teal-dark text-white px-8 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-teal/20">
                          Sign In to Watch
                        </button>
                      </SignInButton>
                    </div>
                  </div>
                ) : (
                  <>
                    {embedUrl && (
                      <div className="aspect-video rounded-xl overflow-hidden shadow-lg mb-4">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Video player"
                        />
                      </div>
                    )}
                    {resource.youtubeUrls.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                        {resource.youtubeUrls.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveVideo(i)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${i === activeVideo
                              ? "bg-teal text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            suppressHydrationWarning
                          >
                            <Play className="w-3.5 h-3.5" />
                            Video {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                Details
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Type</span>
                  <p className="font-medium text-gray-700">
                    {resource.resourceType}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Subject</span>
                  <p className="font-medium text-gray-700">
                    {resource.subjectId?.name}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Added
                  </span>
                  <p className="font-medium text-gray-700">
                    {new Date(resource.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {resource.fileData?.fileName && (
                  <div>
                    <span className="text-gray-400">File</span>
                    <p className="font-medium text-gray-700">
                      {resource.fileData.fileName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="space-y-4">
            {/* Multiple PDFs / Files */}
            {((resource.files && resource.files.length > 0) || resource.fileData) && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-text-primary mb-4">Access Material</h3>
                {!userLoaded ? (
                  <div className="h-20 bg-gray-50 animate-pulse rounded-xl" />
                ) : !clerkUser ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                      <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 mb-4">Study materials are restricted to members</p>
                      <SignInButton mode="modal">
                        <button className="w-full bg-teal hover:bg-teal-dark text-white py-2.5 rounded-lg font-medium transition-all text-sm shadow-md shadow-teal/10">
                          Sign In to View PDF
                        </button>
                      </SignInButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* New multiple files */}
                    {resource.files && resource.files.length > 0 ? (
                      resource.files.map((f, i) => (
                        <div key={i} className="space-y-2">
                          {f.label && <p className="text-xs text-gray-500 font-medium">{f.label || f.fileName}</p>}
                          <a
                            href={`/api/resources/${resource._id}/file?index=${i}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-teal hover:bg-teal-dark text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-teal/20 text-sm"
                            suppressHydrationWarning
                          >
                            <FileText className="w-4 h-4" />
                            {f.fileName ? `View ${f.fileName}` : `View PDF ${resource.files!.length > 1 ? i + 1 : ""}`}
                          </a>
                          <a
                            href={`/api/resources/${resource._id}/file?index=${i}`}
                            download
                            className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" /> Download
                          </a>
                        </div>
                      ))
                    ) : resource.fileData ? (
                      /* Legacy single file */
                      resource.fileData.fileType === "external" && resource.fileData.externalLink ? (
                        <a href={resource.fileData.externalLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-teal hover:bg-teal-dark text-white py-3.5 rounded-xl font-medium transition-colors shadow-lg shadow-teal/20" suppressHydrationWarning>
                          <ExternalLink className="w-5 h-5" /> Open External Link
                        </a>
                      ) : (
                        <div className="space-y-3">
                          <a href={`/api/resources/${resource._id}/file`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-teal hover:bg-teal-dark text-white py-3.5 rounded-xl font-medium transition-colors shadow-lg shadow-teal/20" suppressHydrationWarning>
                            <FileText className="w-5 h-5" /> View PDF
                          </a>
                          <a href={`/api/resources/${resource._id}/file`} download className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-colors">
                            <Download className="w-4 h-4" /> Download
                          </a>
                        </div>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* External Links (non-YouTube) */}
            {resource.externalLinks && resource.externalLinks.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-text-primary mb-3">External Links</h3>
                {!userLoaded ? (
                  <div className="h-20 bg-gray-50 animate-pulse rounded-xl" />
                ) : !clerkUser ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-3 italic">Links are hidden for guests</p>
                    <SignInButton mode="modal">
                      <button className="text-xs text-teal font-semibold hover:underline bg-teal/5 px-3 py-1.5 rounded-full">
                        Sign in to view links
                      </button>
                    </SignInButton>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resource.externalLinks.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full bg-gray-50 hover:bg-teal/5 border border-gray-200 hover:border-teal/30 text-gray-700 hover:text-teal py-2.5 px-4 rounded-xl font-medium transition-all text-sm">
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{link.label || "External Link"}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick links for videos */}
            {resource.youtubeUrls?.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-text-primary mb-3">
                  Video Links
                </h3>
                {!userLoaded ? (
                  <div className="h-10 bg-gray-50 animate-pulse rounded-xl" />
                ) : !clerkUser ? (
                  <p className="text-xs text-slate-400 italic">Sign in to access direct video links</p>
                ) : (
                  <div className="space-y-2">
                    {resource.youtubeUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal transition-colors py-1"
                      >
                        <Play className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Video {i + 1}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Comment Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <CommentSection resourceId={resource._id} resourceAuthorId={resource.createdBy?.clerkId} />
        </motion.div>

        {/* Related Resources */}
        {related.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">
              Related Resources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => (
                <ResourceCard
                  key={r._id}
                  _id={r._id}
                  title={r.title}
                  description={r.description}
                  resourceType={r.resourceType}
                  bannerImageUrl={r.bannerImageUrl}
                  subjectName={r.subjectId?.name || "Unknown"}
                  hasFile={
                    r.fileData?.fileType === "pdf" ||
                    r.fileData?.fileType === "image"
                  }
                  isFavorite={currentUser?.favoriteResources?.includes(r._id)}
                  isLiked={currentUser?.likedResources?.includes(r._id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
