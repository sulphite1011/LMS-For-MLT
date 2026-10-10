import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, ListChecks } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { McqHero, McqFooter, McqEmpty } from "@/components/mcq/McqHero";
import { McqCard } from "@/components/mcq/McqCard";
import { getSpecialtyBySlug, getSubjectBySlug, getUnitsForSubject, ordinal, parseSemester } from "@/lib/mcq";

export const revalidate = 60;

interface Props {
  params: Promise<{ specialty: string; semester: string; subject: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { specialty: slug, semester: sem, subject: subjectSlug } = await params;
  const specialty = await getSpecialtyBySlug(slug).catch(() => null);
  const semester = specialty ? parseSemester(sem, specialty.semesterCount) : null;
  const subject = specialty && semester ? await getSubjectBySlug(specialty._id, semester, subjectSlug).catch(() => null) : null;
  if (!specialty || !semester || !subject) return { title: "MCQs | Hamad's MLT Study Hub", robots: { index: false } };

  const title = `${subject.name} Units — ${specialty.name} ${ordinal(semester)} Semester MCQs | Hamad's MLT Study Hub`;
  const description =
    subject.description || `Choose a unit of ${subject.name} to practice MCQs for ${specialty.name}, ${ordinal(semester)} semester.`;
  const url = `/mcqs/${specialty.slug}/${semester}/${subject.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function SubjectUnitsPage({ params }: Props) {
  const { specialty: slug, semester: sem, subject: subjectSlug } = await params;
  const specialty = await getSpecialtyBySlug(slug);
  if (!specialty) notFound();
  const semester = parseSemester(sem, specialty.semesterCount);
  if (!semester) notFound();
  const subject = await getSubjectBySlug(specialty._id, semester, subjectSlug);
  if (!subject) notFound();

  const units = await getUnitsForSubject(subject._id);
  const base = `/mcqs/${specialty.slug}`;
  const path = `${base}/${semester}/${subject.slug}`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <McqHero
        title={subject.name}
        subtitle={subject.description || `${specialty.name} · ${ordinal(semester)} Semester — choose a unit.`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "MCQs", href: "/mcqs" },
          { label: specialty.name, href: base },
          { label: `${ordinal(semester)} Semester`, href: `${base}/${semester}` },
          { label: subject.name },
        ]}
        sharePath={path}
        shareText={`${subject.name} units — ${specialty.name} ${ordinal(semester)} semester MCQs`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href={`${base}/${semester}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {ordinal(semester)} semester subjects
        </Link>

        <h2 className="text-xl font-bold text-text-primary mb-6">Select a unit</h2>
        {units.length === 0 ? (
          <McqEmpty title="No units yet" message="Units for this subject will appear here once they are added." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {units.map((unit) => (
              <McqCard
                key={unit._id}
                href={`${path}/${unit.slug}`}
                title={unit.name}
                description={unit.description}
                icon={<ListChecks className="w-6 h-6" />}
                meta={[
                  unit.hasPage ? (
                    <><CheckCircle2 key="ok" className="w-3 h-3 text-teal" />MCQs available</>
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
