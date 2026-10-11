import type { Metadata } from "next";
import { GraduationCap, Layers, ListChecks } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { McqHero, McqFooter, McqEmpty } from "@/components/mcq/McqHero";
import { McqCard } from "@/components/mcq/McqCard";
import { getSpecialties } from "@/lib/mcq";

// Cached and refreshed in the background; admin changes call revalidatePath("/mcqs", "layout").
export const revalidate = 60;

export const metadata: Metadata = {
  title: "MCQs by Specialty | Hamad's MLT Study Hub",
  description:
    "Practice MCQs for MLT, MIT, OTT and more — choose your specialty, semester and subject.",
  alternates: { canonical: "/mcqs" },
  openGraph: {
    title: "MCQs by Specialty | Hamad's MLT Study Hub",
    description: "Practice MCQs for MLT, MIT, OTT and more — choose your specialty, semester and subject.",
    url: "/mcqs",
    type: "website",
  },
};

export default async function McqsPage() {
  let specialties: Awaited<ReturnType<typeof getSpecialties>> = [];
  try {
    specialties = await getSpecialties();
  } catch (error) {
    console.error("[MCQs] Failed to load specialties:", error);
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <McqHero
        title="MCQs"
        subtitle="Choose your specialty, then your semester and subject, to practice MCQs."
        crumbs={[{ label: "Home", href: "/" }, { label: "MCQs" }]}
        sharePath="/mcqs"
        shareText="Practice MCQs by specialty, semester and subject"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-xl font-bold text-text-primary mb-6">Select a specialty</h2>
        {specialties.length === 0 ? (
          <McqEmpty title="No specialties yet" message="Specialties will appear here once they are added. Check back soon!" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialties.map((s) => (
              <McqCard
                key={s._id}
                href={`/mcqs/${s.slug}`}
                title={s.name}
                description={s.fullName || s.description}
                icon={<GraduationCap className="w-6 h-6" />}
                meta={[
                  <><Layers key="sem" className="w-3 h-3" />{s.semesterCount} semesters</>,
                  <><ListChecks key="pages" className="w-3 h-3" />{s.pageCount} MCQ {s.pageCount === 1 ? "page" : "pages"}</>,
                ]}
              />
            ))}
          </div>
        )}
      </main>
      <McqFooter />
    </div>
  );
}
