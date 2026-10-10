import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { McqHero, McqFooter } from "@/components/mcq/McqHero";
import { ShareButton } from "@/components/ShareButton";
import { getSpecialtyBySlug, getSubjectBySlug, getUnitBySlug, ordinal, parseSemester } from "@/lib/mcq";

export const revalidate = 60;

interface Props {
  params: Promise<{ specialty: string; semester: string; subject: string; unit: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { specialty: slug, semester: sem, subject: subjectSlug, unit: unitSlug } = await params;
  const specialty = await getSpecialtyBySlug(slug).catch(() => null);
  const semester = specialty ? parseSemester(sem, specialty.semesterCount) : null;
  const subject = specialty && semester ? await getSubjectBySlug(specialty._id, semester, subjectSlug).catch(() => null) : null;
  const unit = subject ? await getUnitBySlug(subject._id, unitSlug).catch(() => null) : null;
  if (!specialty || !semester || !subject || !unit) return { title: "MCQs | Hamad's MLT Study Hub", robots: { index: false } };

  const title = `${unit.name} MCQs — ${subject.name}, ${specialty.name} ${ordinal(semester)} Semester | Hamad's MLT Study Hub`;
  const description =
    unit.description || `Practice ${unit.name} MCQs of ${subject.name} for ${specialty.name}, ${ordinal(semester)} semester.`;
  const url = `/mcqs/${specialty.slug}/${semester}/${subject.slug}/${unit.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article" } };
}

export default async function UnitMcqPage({ params }: Props) {
  const { specialty: slug, semester: sem, subject: subjectSlug, unit: unitSlug } = await params;
  const specialty = await getSpecialtyBySlug(slug);
  if (!specialty) notFound();
  const semester = parseSemester(sem, specialty.semesterCount);
  if (!semester) notFound();
  const subject = await getSubjectBySlug(specialty._id, semester, subjectSlug);
  if (!subject) notFound();
  const unit = await getUnitBySlug(subject._id, unitSlug);
  if (!unit) notFound();

  const base = `/mcqs/${specialty.slug}`;
  const subjectPath = `${base}/${semester}/${subject.slug}`;
  const path = `${subjectPath}/${unit.slug}`;
  const version = unit.updatedAt ? new Date(unit.updatedAt).getTime() : 0;
  const frameSrc = `/api/mcq/units/${unit._id}/html?v=${version}`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <McqHero
        title={unit.name}
        subtitle={unit.description || `${subject.name} · ${specialty.name} · ${ordinal(semester)} Semester`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "MCQs", href: "/mcqs" },
          { label: specialty.name, href: base },
          { label: `${ordinal(semester)} Semester`, href: `${base}/${semester}` },
          { label: subject.name, href: subjectPath },
          { label: unit.name },
        ]}
        sharePath={path}
        shareText={`${unit.name} MCQs — ${subject.name}, ${specialty.name} ${ordinal(semester)} semester`}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Link
            href={subjectPath}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {subject.name} units
          </Link>

          {unit.hasPage && (
            <div className="flex items-center gap-2">
              <a
                href={frameSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white hover:bg-teal/5 text-gray-700 hover:text-teal border border-gray-200 hover:border-teal/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open full page
              </a>
              <ShareButton path={path} title={`${unit.name} MCQs`} variant="light" />
            </div>
          )}
        </div>

        {unit.hasPage ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/*
              The uploaded page is untrusted HTML. It is sandboxed twice: this attribute (no allow-same-origin)
              and a Content-Security-Policy sandbox header on the response.
            */}
            <iframe
              src={frameSrc}
              title={`${unit.name} MCQs`}
              sandbox="allow-scripts allow-popups allow-forms allow-modals"
              referrerPolicy="no-referrer"
              loading="lazy"
              className="mcq-frame w-full h-[75vh] min-h-[480px] border-0 bg-white"
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700">MCQs coming soon</h3>
            <p className="text-gray-400 text-sm mt-1">The MCQs for this unit haven&apos;t been uploaded yet.</p>
          </div>
        )}
      </main>
      <McqFooter />
    </div>
  );
}
