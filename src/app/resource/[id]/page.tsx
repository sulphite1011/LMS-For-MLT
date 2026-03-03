import { Metadata } from "next";
import ResourceDetailClient from "./ResourceDetailClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://lms-for-mlt.vercel.app');

interface Props {
  params: Promise<{ id: string }>;
}

import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Subject from "@/models/Subject"; // Required for populate
import User from "@/models/User"; // Required for populate
import mongoose from "mongoose";

// Server-side: fetch resource data directly from DB
async function getResource(id: string) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    await dbConnect();
    const resource = await Resource.findById(id)
      .populate("subjectId", "name")
      .populate("createdBy", "clerkId")
      .lean();

    if (!resource) return null;

    // Convert ObjectIds to strings for serialization
    return JSON.parse(JSON.stringify(resource));
  } catch (err) {
    console.error("[SSR getResource] Error:", err);
    return null;
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
        images: [{ url: resource.bannerImageUrl, alt: resource.title }],
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
    image: resource.bannerImageUrl ?? `${BASE_URL}/images/default-avatar.png`,
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
      <ResourceDetailClient id={id} />
    </>
  );
}
