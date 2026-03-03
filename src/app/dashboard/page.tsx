"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  User as UserIcon, Heart, Bookmark, MessageSquare, Edit3, Save, X,
  Camera, Loader2, BookOpen, Star, ChevronRight, ExternalLink,
  FileText, Play, Award, Activity
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ResourceCard } from "@/components/ResourceCard";
import { useAuthState } from "@/contexts/AuthContext";
import { formatDistanceToNow, getAvatar } from "@/lib/utils";
import type { Metadata } from "next";

interface UserProfile {
  _id: string;
  clerkId: string;
  username: string;
  userImage?: string;
  customAvatar?: string;
  bio?: string;
  role: string;
  favoriteResources: string[];
  likedResources: string[];
  createdAt: string;
}

interface Resource {
  _id: string;
  title: string;
  description?: string;
  resourceType: string;
  bannerImageUrl?: string;
  subjectId: { name: string };
  fileData?: { fileType: string };
  averageRating?: number;
  totalRatings?: number;
}

interface ActivityComment {
  _id: string;
  content: string;
  createdAt: string;
  resourceId: { _id: string; title: string; resourceType: string; subjectId: { name: string } } | null;
}

const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "favorites", label: "Favorites", icon: Bookmark },
  { id: "liked", label: "Liked", icon: Heart },
  { id: "activity", label: "Activity", icon: Activity },
];

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { userImage: authImage } = useAuthState();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [favorites, setFavorites] = useState<Resource[]>([]);
  const [liked, setLiked] = useState<Resource[]>([]);
  const [activity, setActivity] = useState<ActivityComment[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Avatar upload
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const onAvatarDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("Avatar must be under 2MB"); return; }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps: getAvatarRootProps, getInputProps: getAvatarInputProps } = useDropzone({
    onDrop: onAvatarDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
  });

  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetchProfile();
    }
  }, [isLoaded, !!clerkUser]);

  console.log("[Dashboard] Render state:", { isLoaded, hasClerkUser: !!clerkUser, hasProfile: !!profile, editMode });

  useEffect(() => {
    if (activeTab === "favorites" || activeTab === "liked") fetchCollections();
    if (activeTab === "activity") fetchActivity();
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      console.log("[Dashboard] Fetching profile...");
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        console.log("[Dashboard] Profile fetched:", data);
        setProfile(data);
      } else {
        console.error("[Dashboard] Profile fetch failed:", res.status);
      }
    } catch (err) {
      console.error("[Dashboard] Profile fetch error:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const res = await fetch("/api/users/me/favorites");
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
        setLiked(data.liked || []);
      }
    } catch { } finally {
      setLoadingCollections(false);
    }
  };

  const fetchActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch("/api/users/me/activity");
      if (res.ok) {
        const data = await res.json();
        setActivity(data.comments || []);
      }
    } catch { } finally {
      setLoadingActivity(false);
    }
  };

  const { updateUser } = useAuthState();

  const favoriteIds = new Set(favorites.map(f => f._id));
  const likedIds = new Set(liked.map(l => l._id));

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let customAvatar: string | undefined;

      if (avatarFile) {
        // Convert to base64 using FileReader (browser-safe)
        customAvatar = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(avatarFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          bio: editBio,
          ...(customAvatar ? { customAvatar } : {}),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);

        // Update global auth state so Navbar etc updates immediately
        updateUser({
          username: updated.username,
          userImage: updated.userImage || updated.customAvatar || authImage,
        });

        setEditMode(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        toast.success("Profile updated!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    console.log("[Dashboard] startEdit called. Profile:", profile, "ClerkUser:", clerkUser?.username);
    setEditUsername(profile?.username || clerkUser?.username || "");
    setEditBio(profile?.bio || "");
    setAvatarPreview(null);
    setAvatarFile(null);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  const displayAvatar = avatarPreview ||
    getAvatar(profile?.customAvatar || profile?.userImage || authImage);

  if (!isLoaded) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-teal" />
        </div>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <UserIcon className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Sign in to view your dashboard</h2>
          <p className="text-slate-500 mb-6">Access your profile, favorites, and activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-linear-to-br from-navy via-navy-light to-teal/20 pt-20 pb-0 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #14b8a6 0%, transparent 60%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 60%)" }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-0 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6">
            {/* Avatar */}
            <div className="relative">
              <div className={`relative ${editMode ? "cursor-pointer" : ""}`} {...(editMode ? getAvatarRootProps() : {})}>
                {editMode && <input {...getAvatarInputProps()} />}
                <img
                  src={displayAvatar}
                  alt={profile?.username || "User"}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white/20 shadow-xl"
                  onError={e => (e.currentTarget.src = "/images/default-avatar.png")}
                />
                {editMode && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                )}
              </div>
              {/* Role badge */}
              {profile?.role !== "user" && (
                <div className="absolute -bottom-1 -right-1 bg-teal text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white capitalize">
                  {profile?.role}
                </div>
              )}
            </div>

            {/* User info */}
            <div className="flex-1 text-center sm:text-left">
              {editMode ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="relative">
                      <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-xl font-bold w-full placeholder:text-white/50 focus:outline-none focus:border-teal/60" placeholder="Username" maxLength={30} />
                    </div>
                    <p className="text-[10px] text-white/40 px-1 italic flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Note: Username can only be changed once every 30 days.
                    </p>
                  </div>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell us about yourself..." rows={2} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm w-full placeholder:text-white/40 focus:outline-none focus:border-teal/60 resize-none" maxLength={300} />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile?.username || clerkUser.username}</h1>
                  <p className="text-white/60 text-sm mt-0.5">{clerkUser.primaryEmailAddress?.emailAddress}</p>
                  {profile?.bio && <p className="text-white/80 text-sm mt-2 max-w-md">{profile.bio}</p>}
                  <p className="text-white/40 text-xs mt-2 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Award className="w-3.5 h-3.5" />
                    Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Edit button */}
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all text-sm">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-teal text-white rounded-xl hover:bg-teal-dark transition-all text-sm font-medium disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    console.log("[Dashboard] Edit Profile button clicked");
                    startEdit();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all text-sm"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-6 py-3 border-t border-white/10 text-center sm:text-left">
            <div>
              <p className="text-white font-bold">{profile?.favoriteResources?.length ?? 0}</p>
              <p className="text-white/50 text-xs">Favorites</p>
            </div>
            <div>
              <p className="text-white font-bold">{profile?.likedResources?.length ?? 0}</p>
              <p className="text-white/50 text-xs">Liked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="sticky top-16 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto hide-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${activeTab === tab.id ? "border-teal text-teal" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4 text-lg">Account Information</h3>
                <dl className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <dt className="text-sm text-slate-500 sm:w-32 shrink-0">Username</dt>
                    <dd className="text-sm font-medium text-slate-900">{profile?.username}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <dt className="text-sm text-slate-500 sm:w-32 shrink-0">Email</dt>
                    <dd className="text-sm font-medium text-slate-900">{clerkUser.primaryEmailAddress?.emailAddress}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <dt className="text-sm text-slate-500 sm:w-32 shrink-0">Role</dt>
                    <dd className="text-sm font-medium text-slate-900 capitalize">{profile?.role}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <dt className="text-sm text-slate-500 sm:w-32 shrink-0">Bio</dt>
                    <dd className="text-sm font-medium text-slate-900">{profile?.bio || <span className="text-slate-400 italic">No bio yet</span>}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <dt className="text-sm text-slate-500 sm:w-32 shrink-0">Joined</dt>
                    <dd className="text-sm font-medium text-slate-900">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-linear-to-br from-teal/5 to-teal/10 rounded-2xl p-6 border border-teal/20">
                <h3 className="font-semibold text-teal text-sm mb-2">How to edit your profile</h3>
                <p className="text-slate-600 text-sm">Click the <strong className="text-slate-800">Edit Profile</strong> button at the top to update your username, bio, and profile picture.</p>
              </div>
            </motion.div>
          )}

          {/* Favorites Tab */}
          {activeTab === "favorites" && (
            <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadingCollections ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-teal animate-spin" />
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-16">
                  <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-1">No favorites yet</h3>
                  <p className="text-slate-400 text-sm">Browse resources and use the bookmark button to save your favorites here.</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-500 text-sm mb-4">{favorites.length} saved resource{favorites.length !== 1 ? "s" : ""}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map(r => (
                      <ResourceCard
                        key={r._id}
                        _id={r._id}
                        title={r.title}
                        description={r.description}
                        resourceType={r.resourceType as any}
                        bannerImageUrl={r.bannerImageUrl}
                        subjectName={r.subjectId?.name || "Unknown"}
                        hasFile={r.fileData?.fileType === "pdf"}
                        averageRating={r.averageRating}
                        totalRatings={r.totalRatings}
                        isFavorite={true}
                        isLiked={likedIds.has(r._id)}
                        onFavoriteToggle={(_id, action) => {
                          if (action === "removed") setFavorites(prev => prev.filter(f => f._id !== _id));
                        }}
                        onLikeToggle={(_id, action) => {
                          if (action === "added") setLiked(prev => [...prev, r as any]);
                          else setLiked(prev => prev.filter(l => l._id !== _id));
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Liked Tab */}
          {activeTab === "liked" && (
            <motion.div key="liked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadingCollections ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-teal animate-spin" />
                </div>
              ) : liked.length === 0 ? (
                <div className="text-center py-16">
                  <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-1">No liked resources yet</h3>
                  <p className="text-slate-400 text-sm">Like resources to find them easily here.</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-500 text-sm mb-4">{liked.length} liked resource{liked.length !== 1 ? "s" : ""}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liked.map(r => (
                      <ResourceCard
                        key={r._id}
                        _id={r._id}
                        title={r.title}
                        description={r.description}
                        resourceType={r.resourceType as any}
                        bannerImageUrl={r.bannerImageUrl}
                        subjectName={r.subjectId?.name || "Unknown"}
                        hasFile={r.fileData?.fileType === "pdf"}
                        averageRating={r.averageRating}
                        totalRatings={r.totalRatings}
                        isFavorite={favoriteIds.has(r._id)}
                        isLiked={true}
                        onFavoriteToggle={(_id, action) => {
                          if (action === "added") setFavorites(prev => [...prev, r as any]);
                          else setFavorites(prev => prev.filter(f => f._id !== _id));
                        }}
                        onLikeToggle={(_id, action) => {
                          if (action === "removed") setLiked(prev => prev.filter(l => l._id !== _id));
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadingActivity ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-teal animate-spin" />
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-1">No comments yet</h3>
                  <p className="text-slate-400 text-sm">Join the discussion on any resource to see your activity here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-500 text-sm">{activity.length} comment{activity.length !== 1 ? "s" : ""}</p>
                  {activity.map(comment => (
                    <div key={comment._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-teal/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {comment.resourceId && (
                            <a href={`/resource/${comment.resourceId._id}`} className="flex items-center gap-2 text-teal hover:underline text-sm font-medium mb-2 w-fit">
                              <BookOpen className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{comment.resourceId.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          )}
                          <p className="text-slate-700 text-sm leading-relaxed line-clamp-3">{comment.content}</p>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{formatDistanceToNow(new Date(comment.createdAt))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
