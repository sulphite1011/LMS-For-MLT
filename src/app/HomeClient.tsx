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
  resourceType: string;
  bannerImageUrl?: string;
  subjectId: Subject;
  fileData?: { fileType: string; fileName?: string };
  files?: Array<{ fileType: string; fileName?: string }>;
  averageRating?: number | string;
  totalRatings?: number;
  semester?: number;
  createdBy?: { username: string; userHandle?: string; clerkId: string };
  viewsCount?: number;
  likesCount?: number;
  favoritesCount?: number;
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

  const [isFirstMount, setIsFirstMount] = useState(true);

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

  useEffect(() => {
    if (isFirstMount) {
      setIsFirstMount(false);
      return;
    }
    fetchResources();
  }, [fetchResources, search, activeType, activeSubject]);

  // Helper to group resources for the "All" view with Semester Segregation
  const getGroupedContent = () => {
    const groups: Record<string, Resource[]> = {};

    // Group by Semester (1-10)
    for (let s = 1; s <= 10; s++) {
      const semesterResources = resources.filter(r => r.semester === s);
      if (semesterResources.length === 0) continue;

      const semKey = `Semester ${s}`;
      groups[semKey] = semesterResources;

      // Sub-grouping within Semester (Optional: if we want to show specific sub-sections)
      // For now, let's keep it simple and just show the semester group
      // The user said "first line segregation... based on semester"
    }

    // Handle resources without a semester (Legacy/General)
    const generalResources = resources.filter(r => !r.semester);
    if (generalResources.length > 0) {
      groups["General / Other Resources"] = generalResources;
    }

    return groups;
  };

  return (
    <>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <ResourceGridSkeleton />
        ) : resources.length === 0 ? (
          <EmptyState
            type={search || activeType || activeSubject ? "no-results" : "no-resources"}
          />
        ) : (
          <div className="space-y-16">
            {!search && !activeType && !activeSubject ? (
              // Structured "All" View
              Object.entries(getGroupedContent()).map(([groupTitle, groupResources]) => (
                <section key={groupTitle} className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                      <div className={`w-1.5 h-6 rounded-full ${groupTitle.startsWith('Type') ? 'bg-teal' : 'bg-indigo-500'}`} />
                      {groupTitle.replace('Type: ', '').replace('Subject: ', '')}
                      <span className="text-xs font-normal text-gray-400 ml-2">({groupResources.length})</span>
                    </h2>
                    <button
                      onClick={() => {
                        if (groupTitle.startsWith('Type')) setActiveType(groupTitle.replace('Type: ', ''));
                        else setActiveSubject(subjects.find(s => s.name === groupTitle.replace('Subject: ', ''))?._id || null);
                      }}
                      className="text-xs font-semibold text-teal hover:underline"
                    >
                      View More
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groupResources.map((resource) => (
                      <ResourceItem key={resource._id} resource={resource} currentUser={currentUser} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              // Filtered Flat Grid
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {resources.map((resource) => (
                  <ResourceItem key={resource._id} resource={resource} currentUser={currentUser} />
                ))}
              </motion.div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function ResourceItem({ resource, currentUser }: { resource: Resource; currentUser: any }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      <ResourceCard
        _id={resource._id}
        title={resource.title}
        description={resource.description}
        resourceType={resource.resourceType as any}
        bannerImageUrl={resource.bannerImageUrl}
        subjectName={resource.subjectId?.name || "Unknown Subject"}
        hasFile={
          resource.fileData?.fileType === "pdf" ||
          resource.fileData?.fileType === "image" ||
          (resource.files && resource.files.length > 0)
        }
        createdBy={resource.createdBy}
        viewsCount={resource.viewsCount}
        likesCount={resource.likesCount}
        favoritesCount={resource.favoritesCount}
        averageRating={resource.averageRating}
        totalRatings={resource.totalRatings}
        isFavorite={currentUser?.favoriteResources?.includes(resource._id)}
        isLiked={currentUser?.likedResources?.includes(resource._id)}
      />
    </motion.div>
  );
}
