import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { McqHero, McqFooter } from "@/components/mcq/McqHero";
import { McqCard } from "@/components/mcq/McqCard";
import { getSpecialtyBySlug, getSemesterStats, ordinal } from "@/lib/mcq";

export const revalidate = 60;

interface Props {
  params: Promise<{ specialty: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { specialty: slug } = await params;
  const specialty = await getSpecialtyBySlug(slug).catch(() => null);
  if (!specialty) return { title: "MCQs | Hamad's MLT Study Hub", robots: { index: false } };

  const title = `${specialty.name} MCQs | Hamad's MLT Study Hub`;
  const description = `Practice ${specialty.fullName || specialty.name} MCQs — choose a semester and subject.`;
  return {
    title,
    description,
    alternates: { canonical: `/mcqs/${specialty.slug}` },
    openGraph: { title, description, url: `/mcqs/${specialty.slug}`, type: "website" },
  };
}

export default async function SpecialtyPage({ params }: Props) {
  const { specialty: slug } = await params;
  const specialty = await getSpecialtyBySlug(slug);
  if (!specialty) notFound();

  const stats = await getSemesterStats(specialty._id);
  const semesters = Array.from({ length: specialty.semesterCount }, (_, i) => i + 1);

  return (
    <div className="min-h-screen">
      <Navbar />
      <McqHero
        title={`${specialty.name} MCQs`}
        subtitle={specialty.fullName || specialty.description || "Choose your semester."}
        crumbs={[{ label: "Home", href: "/" }, { label: "MCQs", href: "/mcqs" }, { label: specialty.name }]}
        sharePath={`/mcqs/${specialty.slug}`}
        shareText={`${specialty.name} MCQs — choose your semester and subject`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-xl font-bold text-text-primary mb-6">Select a semester</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {semesters.map((n) => {
            const row = stats.get(n);
            return (
              <McqCard
                key={n}
                href={`/mcqs/${specialty.slug}/${n}`}
                title={`${ordinal(n)} Semester`}
                description={row ? undefined : "No subjects added yet"}
                icon={<span className="text-lg font-bold">{n}</span>}
                meta={[
                  <><BookOpen key="s" className="w-3 h-3" />{row?.subjects ?? 0} {(row?.subjects ?? 0) === 1 ? "subject" : "subjects"}</>,
                ]}
              />
            );
          })}
        </div>
      </main>
      <McqFooter />
    </div>
  );
}
