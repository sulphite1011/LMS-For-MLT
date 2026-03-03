// This page renders on every request (dynamic) because it queries MongoDB directly.
// This is scoped to just this page — other pages are NOT affected.
// On Vercel, responses are still cached at the CDN edge for 30s via Cache-Control headers.
export const dynamic = "force-dynamic";

// No "use client" — this is a Server Component.
// It fetches initial data server-side so the page renders with content immediately,
// improving LCP and enabling crawlers to see actual resources.
import { BookOpen, Mail, ArrowRight, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import HomeClient from "./HomeClient";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Subject from "@/models/Subject";
import Comment from "@/models/Comment";
import User from "@/models/User"; // Required for .populate("createdBy")
import mongoose from "mongoose";

// Fetch initial resources server-side (bypasses API round-trip, runs at the edge)
async function getInitialData() {
  try {
    await dbConnect();

    const [resources, subjects] = await Promise.all([
      Resource.find({})
        .select("-fileData.fileContent -bannerImageData -files.fileContent")
        .populate("subjectId", "name")
        .populate("createdBy", "clerkId")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Subject.find({}).sort({ name: 1 }).lean(),
    ]);

    // Batch rating aggregation (same as API)
    const resourceIds = resources.map((r) => new mongoose.Types.ObjectId(String(r._id)));
    const ratingStats = await Comment.aggregate([
      { $match: { resourceId: { $in: resourceIds }, rating: { $exists: true, $gt: 0 } } },
      { $group: { _id: "$resourceId", averageRating: { $avg: "$rating" }, totalRatings: { $sum: 1 } } },
    ]);

    const resourcesWithRatings = resources.map((resource) => {
      const stats = ratingStats.find((s) => String(s._id) === String(resource._id));
      return {
        ...resource,
        averageRating: stats ? Number(stats.averageRating.toFixed(1)) : 0,
        totalRatings: stats ? stats.totalRatings : 0,
      };
    });

    return {
      resources: JSON.parse(JSON.stringify(resourcesWithRatings)),
      subjects: JSON.parse(JSON.stringify(subjects)),
    };
  } catch (error) {
    console.error("[Homepage] Failed to fetch initial data:", error);
    return { resources: [], subjects: [] };
  }
}

// Revalidate every 60 seconds (ISR) — so page is rebuilt with fresh data periodically
export const revalidate = 60;

export default async function HomePage() {
  const { resources, subjects } = await getInitialData();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-navy via-navy-light to-navy overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
          <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6 animate-in zoom-in-95 duration-500 delay-200 fill-mode-both">
              <Sparkles className="w-4 h-4 text-teal" />
              <span className="text-sm text-gray-300">
                Medical Laboratory Technology Resources
              </span>
            </div>

            {/* Single h1 per page for correct heading hierarchy */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight">
              Hamad&apos;s{" "}
              <span className="text-teal-400 bg-clip-text bg-linear-to-r from-teal to-teal-light">
                MLT Study Hub
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-in fade-in duration-700 delay-300 fill-mode-both">
              Your complete Medical Laboratory Technology resource library.
              Access notes, videos, PDFs, quizzes and more &mdash; all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
              <a
                href="#resources"
                className="inline-flex items-center justify-center gap-2 bg-teal hover:bg-teal-dark text-white px-8 py-3.5 rounded-full font-semibold text-base transition-all glow-teal shadow-lg shadow-teal/25"
              >
                <BookOpen className="w-5 h-5" />
                Browse Resources
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={`mailto:hamadkhadimdgkmc@gmail.com?subject=Admin Access Request - Hamad's LMS`}
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-full font-semibold text-base transition-all border border-white/10"
              >
                <Mail className="w-5 h-5" />
                Request Admin Access
              </a>
            </div>
          </div>

          {/* Stats — rendered server-side with real counts */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700 fill-mode-both">
            {[
              { label: "Resources", value: resources.length },
              { label: "Subjects", value: subjects.length },
              { label: "Free Access", value: "100%" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive client section: search, filter, grid */}
      <HomeClient
        initialResources={resources}
        initialSubjects={subjects}
        currentUser={null}
      />

      {/* Footer */}
      <footer className="bg-navy text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">
              Hamad&apos;s <span className="text-teal">LMS</span>
            </span>
          </div>
          <p className="text-sm mb-4">
            Medical Laboratory Technology Study Resources
          </p>
          <p className="text-xs text-gray-500">
            Want to contribute?{" "}
            <a
              href="mailto:hamadkhadimdgkmc@gmail.com"
              className="text-teal hover:underline"
            >
              hamadkhadimdgkmc@gmail.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
