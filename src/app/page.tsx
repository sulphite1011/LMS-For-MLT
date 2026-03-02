"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Mail, ArrowRight, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
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
  averageRating?: number | string;
  totalRatings?: number;
}

export default function HomePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
      setSubjects([]);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(fetchResources, 300);
    return () => clearTimeout(debounce);
  }, [fetchResources]);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0A1929] via-[#132F4C] to-[#0A1929] overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#14b8a6]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#14b8a6]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#14b8a6]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6"
            >
              <Sparkles className="w-4 h-4 text-[#14b8a6]" />
              <span className="text-sm text-gray-300">
                Medical Laboratory Technology Resources
              </span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight">
              Hamad&apos;s{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14b8a6] to-[#5eead4]">
                MLT Study Hub
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
            >
              Your complete Medical Laboratory Technology resource library.
              Access notes, videos, PDFs, quizzes and more &mdash; all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href="#resources"
                className="inline-flex items-center justify-center gap-2 bg-[#14b8a6] hover:bg-[#0d9488] text-white px-8 py-3.5 rounded-full font-semibold text-base transition-all glow-teal shadow-lg shadow-[#14b8a6]/25"
              >
                <BookOpen className="w-5 h-5" />
                Browse Resources
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="mailto:hamadkhadimdgkmc@gmail.com?subject=Admin Access Request - Hamad's LMS"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-full font-semibold text-base transition-all border border-white/10"
              >
                <Mail className="w-5 h-5" />
                Request Admin Access
              </a>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16"
          >
            {[
              { label: "Resources", value: resources.length || "..." },
              { label: "Subjects", value: subjects.length || "..." },
              { label: "Free Access", value: "100%" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

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
                    resource.fileData?.fileType === "image"
                  }
                  averageRating={resource.averageRating}
                  totalRatings={resource.totalRatings}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0A1929] text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#14b8a6] rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">
              Hamad&apos;s <span className="text-[#14b8a6]">LMS</span>
            </span>
          </div>
          <p className="text-sm mb-4">
            Medical Laboratory Technology Study Resources
          </p>
          <p className="text-xs text-gray-500">
            Want to contribute?{" "}
            <a
              href="mailto:hamadkhadimdgkmc@gmail.com"
              className="text-[#14b8a6] hover:underline"
            >
              hamadkhadimdgkmc@gmail.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
