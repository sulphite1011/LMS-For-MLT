import { MetadataRoute } from "next";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";

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
    const resources = await Resource.find({})
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

  return [...staticRoutes, ...resourceRoutes];
}
