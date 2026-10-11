import { MetadataRoute } from "next";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import McqSpecialty from "@/models/McqSpecialty";
import McqSubject from "@/models/McqSubject";
import McqUnit from "@/models/McqUnit";

const BASE_URL = "https://lms-for-mlt.vercel.app";

// Same cadence as the previous fetch-based version: rebuild the sitemap at most once an hour.
export const revalidate = 3600;

// Same cap as before (the old code requested ?limit=1000).
const MAX_RESOURCES = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/sign-in`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/sign-up`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic resource pages — query MongoDB directly for just the 3 fields the sitemap needs
  // (no banners, files, comments or populates).
  let resourceRoutes: MetadataRoute.Sitemap = [];
  try {
    await dbConnect();
    const resources = await Resource.find({ deletedAt: null })
      .select("_id updatedAt createdAt")
      .sort({ createdAt: -1 })
      .limit(MAX_RESOURCES)
      .lean();

    resourceRoutes = resources.map((resource) => ({
      url: `${BASE_URL}/resource/${String(resource._id)}`,
      lastModified: resource.updatedAt
        ? new Date(resource.updatedAt)
        : resource.createdAt
          ? new Date(resource.createdAt)
          : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error("[sitemap] Failed to fetch resources:", error);
  }

  // MCQ section: index, specialties, semesters that have subjects, subject pages and unit pages (no HTML is loaded).
  let mcqRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/mcqs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];
  try {
    const [specialties, subjects, units] = await Promise.all([
      McqSpecialty.find({}).select("slug").lean(),
      McqSubject.find({}).select("specialtyId semester slug updatedAt").limit(2000).lean(),
      McqUnit.find({}).select("subjectId slug updatedAt").limit(5000).lean(),
    ]);
    const subjectUrlById = new Map<string, string>();
    const slugById = new Map(specialties.map((s) => [String(s._id), s.slug] as const));

    for (const subject of subjects) {
      const specialtySlug = slugById.get(String(subject.specialtyId));
      if (!specialtySlug) continue;
      subjectUrlById.set(String(subject._id), `${BASE_URL}/mcqs/${specialtySlug}/${subject.semester}/${subject.slug}`);
    }
    for (const unit of units) {
      const subjectUrl = subjectUrlById.get(String(unit.subjectId));
      if (!subjectUrl) continue;
      mcqRoutes.push({
        url: `${subjectUrl}/${unit.slug}`,
        lastModified: unit.updatedAt ? new Date(unit.updatedAt) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("[sitemap] Failed to fetch MCQ pages:", error);
    mcqRoutes = mcqRoutes.slice(0, 1);
  }

  return [...staticRoutes, ...resourceRoutes, ...mcqRoutes];
}
