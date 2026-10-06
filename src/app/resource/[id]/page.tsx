import { cache } from "react";
import { Metadata } from "next";
import ResourceDetailClient from "./ResourceDetailClient";
import { fetchResourceDetail, fetchRelatedResources } from "@/lib/resources";

// Statically cached and refreshed in the background. Nothing user-specific is rendered here
// (favorites/likes are fetched by the client for signed-in users). Admin edits/deletes and new
// ratings/comments call revalidatePath() so they show up without waiting for this window.
export const revalidate = 60;

const BASE_URL = "https://lms-for-mlt.vercel.app";

interface Props {
  params: Promise<{ id: string }>;
}

// Banner URLs for uploaded images are relative (/api/resources/<id>/banner?v=...).
// Open Graph and JSON-LD consumers need absolute URLs.
function absoluteUrl(url?: string): string {
  if (!url) return "";
  return url.startsWith("/") ? `${BASE_URL}${url}` : url;
}

// Server-side: read the resource straight from MongoDB (no HTTP round-trip to our own API).
// React's cache() lets generateMetadata and the page share one read per request.
// Returns null when missing or on error; the client then falls back to fetching it itself.
const getResource = cache(async (id: string) => {
  try {
    const resource = await fetchResourceDetail(id);
    return resource ? JSON.parse(JSON.stringify(resource)) : null;
  } catch (error) {
    console.error("[ResourceDetailPage] Failed to load resource:", error);
    return null;
  }
});

async function getRelated(resource: { _id: string; subjectId?: { _id?: string } } | null) {
  if (!resource?.subjectId?._id) return [];
  try {
    const related = await fetchRelatedResources(String(resource.subjectId._id), String(resource._id));
    return JSON.parse(JSON.stringify(related));
  } catch (error) {
    console.error("[ResourceDetailPage] Failed to load related resources:", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resource = await getResource(id);

  if (!resource) {
    return {
      title: "Resource Not Found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${resource.title} — ${resource.subjectId?.name ?? "MLT"} ${resource.resourceType}`;
  const description =
    resource.description
      ? resource.description.slice(0, 160)
      : `${resource.resourceType} resource for ${resource.subjectId?.name ?? "Medical Laboratory Technology"}. Free MLT study material on Hamad's MLT Study Hub.`;

  const canonicalUrl = `${BASE_URL}/resource/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title,
      description,
      siteName: "Hamad's MLT Study Hub",
      publishedTime: resource.createdAt,
      section: resource.subjectId?.name ?? "MLT",
      ...(resource.bannerImageUrl && {
        images: [{ url: absoluteUrl(resource.bannerImageUrl), alt: resource.title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ResourceDetailPage({ params }: Props) {
  const { id } = await params;
  const resource = await getResource(id);
  const related = await getRelated(resource);

  // JSON-LD structured data for SEO
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: resource?.subjectId?.name ?? "Resources", item: `${BASE_URL}/?subject=${resource?.subjectId?._id ?? ""}` },
      { "@type": "ListItem", position: 3, name: resource?.title ?? "Resource", item: `${BASE_URL}/resource/${id}` },
    ],
  };

  const articleJsonLd = resource ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: resource.title,
    description: resource.description ?? "",
    image: absoluteUrl(resource.bannerImageUrl) || `${BASE_URL}/images/default-avatar.png`,
    datePublished: resource.createdAt,
    dateModified: resource.updatedAt ?? resource.createdAt,
    author: { "@type": "Organization", name: "Hamad's MLT Study Hub" },
    publisher: {
      "@type": "Organization",
      name: "Hamad's MLT Study Hub",
      url: BASE_URL,
    },
    keywords: ["MLT", resource.subjectId?.name ?? "Medical Lab", resource.resourceType],
    inLanguage: "en-US",
    isAccessibleForFree: true,
  } : null;

  return (
    <>
      {resource && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        </>
      )}
      {/* key={id}: remount when navigating between resources so initial data/state reset */}
      <ResourceDetailClient key={id} id={id} initialResource={resource} initialRelated={related} />
    </>
  );
}
