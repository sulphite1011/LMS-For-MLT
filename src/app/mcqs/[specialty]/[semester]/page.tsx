import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, FileQuestion, Layers } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { McqHero, McqFooter, McqEmpty } from "@/components/mcq/McqHero";
import { McqCard } from "@/components/mcq/McqCard";
import { getSpecialtyBySlug, getSubjectsForSemester, ordinal, parseSemester } from "@/lib/mcq";

export const revalidate = 60;

interface Props {
  params: Promise<{ specialty: string; semester: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { specialty: slug, semester: sem } = await params;
  const specialty = await getSpecialtyBySlug(slug).catch(() => null);
  const semester = specialty ? parseSemester(sem, specialty.semesterCount) : null;
  if (!specialty || !semester) return { title: "MCQs | Hamad's MLT Study Hub", robots: { index: false } };

  const title = `${specialty.name} ${ordinal(semester)} Semester MCQs | Hamad's MLT Study Hub`;
  const description = `Practice ${specialty.name} ${ordinal(semester)} semester MCQs — choose a subject.`;
  const url = `/mcqs/${specialty.slug}/${semester}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function SemesterPage({ params }: Props) {
  const { specialty: slug, semester: sem } = await params;
  const specialty = await getSpecialtyBySlug(slug);
  if (!specialty) notFound();
  const semester = parseSemester(sem, specialty.semesterCount);
  if (!semester) notFound();

  const subjects = await getSubjectsForSemester(specialty._id, semester);
  const base = `/mcqs/${specialty.slug}`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <McqHero
        title={`${specialty.name} — ${ordinal(semester)} Semester`}
        subtitle="Choose a subject to see its units."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "MCQs", href: "/mcqs" },
          { label: specialty.name, href: base },
          { label: `${ordinal(semester)} Semester` },
        ]}
        sharePath={`${base}/${semester}`}
        shareText={`${specialty.name} ${ordinal(semester)} semester MCQs`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-xl font-bold text-text-primary mb-6">Select a subject</h2>
        {subjects.length === 0 ? (
          <McqEmpty title="No subjects yet" message="Subjects for this semester will appear here once they are added." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <McqCard
                key={subject._id}
                href={`${base}/${semester}/${subject.slug}`}
                title={subject.name}
                description={subject.description}
                icon={<FileQuestion className="w-6 h-6" />}
                meta={[
                  subject.unitCount > 0 ? (
                    <><Layers key="units" className="w-3 h-3 text-teal" />{subject.unitCount} unit{subject.unitCount === 1 ? "" : "s"}</>
                  ) : (
                    <><Clock key="soon" className="w-3 h-3" />Coming soon</>
                  ),
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
