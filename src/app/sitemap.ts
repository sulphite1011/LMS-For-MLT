import { MetadataRoute } from "next";

const BASE_URL = "https://lms-for-mlt.vercel.app";

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

  // Dynamic resource pages — fetch from our own API
  let resourceRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${BASE_URL}/api/resources?limit=1000`, {
      next: { revalidate: 3600 }, // Re-fetch every hour
    });
    if (res.ok) {
      const data = await res.json();
      const resources: { _id: string; updatedAt?: string; createdAt?: string }[] =
        data.resources || [];

      resourceRoutes = resources.map((resource) => ({
        url: `${BASE_URL}/resource/${resource._id}`,
        lastModified: resource.updatedAt
          ? new Date(resource.updatedAt)
          : resource.createdAt
            ? new Date(resource.createdAt)
            : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error("[sitemap] Failed to fetch resources:", error);
  }

  return [...staticRoutes, ...resourceRoutes];
}
