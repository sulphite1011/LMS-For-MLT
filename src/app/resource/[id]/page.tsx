import { Metadata } from "next";
import ResourceDetailClient from "./ResourceDetailClient";

const BASE_URL = "https://lms-for-mlt.vercel.app";

interface Props {
  params: Promise<{ id: string }>;
}

// Server-side: fetch resource metadata for SEO
async function getResource(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/resources/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
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
