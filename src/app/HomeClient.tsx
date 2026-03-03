"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ResourceCard } from "@/components/ResourceCard";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { EmptyState } from "@/components/EmptyState";
import { ResourceGridSkeleton } from "@/components/ui/Skeleton";

interface Subject {
  _id: string;
  name: string;
}

interface Resource {
  _id: string;
  title: string;
  description?: string;
  resourceType: "Notes" | "Video" | "PDF" | "Reference" | "Quiz";
  bannerImageUrl?: string;
  subjectId: Subject;
  fileData?: { fileType: string; fileName?: string };
  files?: Array<{ fileType: string; fileName?: string }>;
  averageRating?: number | string;
  totalRatings?: number;
  createdBy?: { clerkId: string };
}

interface HomeClientProps {
  initialResources: Resource[];
  initialSubjects: Subject[];
  currentUser: any;
}

export default function HomeClient({
  initialResources,
  initialSubjects,
  currentUser,
}: HomeClientProps) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [subjects] = useState<Subject[]>(initialSubjects);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeType) params.set("type", activeType);
      if (activeSubject) params.set("subject", activeSubject);

      const res = await fetch(`/api/resources?${params}`);
      const data = await res.json();
      setResources(data.resources || []);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoading(false);
    }
  }, [search, activeType, activeSubject]);

  // Only re-fetch when filters change (not on mount — we have initial data)
  useEffect(() => {
    if (!search && !activeType && !activeSubject) return;
    fetchResources();
  }, [fetchResources, search, activeType, activeSubject]);

  return (
    <>
      {/* Search & Filter */}
      <div id="resources">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          activeType={activeType}
          onTypeChange={setActiveType}
          activeSubject={activeSubject}
          onSubjectChange={setActiveSubject}
          subjects={subjects}
        />
      </div>

      {/* Resource Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <ResourceGridSkeleton />
        ) : resources.length === 0 ? (
          <EmptyState
            type={
              search || activeType || activeSubject
                ? "no-results"
                : "no-resources"
            }
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.06 },
              },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {resources.map((resource) => (
              <motion.div
                key={resource._id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <ResourceCard
                  _id={resource._id}
                  title={resource.title}
                  description={resource.description}
                  resourceType={resource.resourceType}
                  bannerImageUrl={resource.bannerImageUrl}
                  subjectName={resource.subjectId?.name || "Unknown Subject"}
                  hasFile={
                    resource.fileData?.fileType === "pdf" ||
                    resource.fileData?.fileType === "image" ||
                    (resource.files && resource.files.length > 0)
                  }
                  resourceAuthorId={resource.createdBy?.clerkId}
                  averageRating={resource.averageRating}
                  totalRatings={resource.totalRatings}
                  isFavorite={currentUser?.favoriteResources?.includes(resource._id)}
                  isLiked={currentUser?.likedResources?.includes(resource._id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </>
  );
}
