import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { McqHero, McqFooter, McqEmpty } from "@/components/mcq/McqHero";
import { McqBrowser } from "@/components/mcq/McqBrowser";
import { getMcqCatalog } from "@/lib/mcq";

// Cached and refreshed in the background; admin changes call revalidatePath("/mcqs", "layout").
export const revalidate = 60;

export const metadata: Metadata = {
  title: "MCQ Practice | Hamad's MLT Study Hub",
  description: "Practice MCQs for MLT, MIT, OTT and more — pick a subject and start in two taps.",
  alternates: { canonical: "/mcqs" },
  openGraph: {
    title: "MCQ Practice | Hamad's MLT Study Hub",
    description: "Practice MCQs for MLT, MIT, OTT and more — pick a subject and start in two taps.",
    url: "/mcqs",
    type: "website",
  },
};

export default async function McqsPage() {
  let catalog: Awaited<ReturnType<typeof getMcqCatalog>> = [];
  try {
    catalog = await getMcqCatalog();
  } catch (error) {
    console.error("[MCQs] Failed to load catalog:", error);
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <McqHero
        compact
        title="MCQ Practice"
        crumbs={[{ label: "Home", href: "/" }, { label: "MCQs" }]}
        sharePath="/mcqs"
        shareText="Practice MCQs by specialty, semester and subject"
      />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {catalog.length === 0 ? (
          <McqEmpty title="No MCQs yet" message="MCQ pages will appear here once they are added. Check back soon!" />
        ) : (
          <McqBrowser catalog={catalog} />
        )}
      </main>
      <McqFooter />
    </div>
  );
}
