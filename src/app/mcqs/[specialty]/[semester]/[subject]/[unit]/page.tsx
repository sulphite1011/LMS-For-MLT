import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { McqHero, McqFooter } from "@/components/mcq/McqHero";
import { ShareButton } from "@/components/ShareButton";
import { McqPlayer } from "@/components/mcq/McqPlayer";
import { McqMarkComplete } from "@/components/mcq/McqMarkComplete";
import { getSpecialtyBySlug, getSubjectBySlug, getUnitBySlug, getUnitsForSubject, getUnitQuestions, MCQ_FREE_PREVIEW, ordinal, parseSemester } from "@/lib/mcq";

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
  const hubHref = `/mcqs?s=${encodeURIComponent(specialty.slug)}&sem=${semester}&sub=${encodeURIComponent(subject.slug)}`;
  const path = `${subjectPath}/${unit.slug}`;
  const version = unit.updatedAt ? new Date(unit.updatedAt).getTime() : 0;
  // fetched in parallel so the page does not wait on them one after another
  const [questions, siblings] = await Promise.all([
    unit.questionCount ? getUnitQuestions(unit._id) : Promise.resolve([]),
    getUnitsForSubject(subject._id).catch(() => []),
  ]);
  const idx = siblings.findIndex((u) => String(u._id) === String(unit._id));
  const next = idx >= 0 ? siblings.slice(idx + 1).find((u) => u.hasPage) : undefined;
  const frameSrc = `/api/mcq/units/${unit._id}/html?v=${version}`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <McqHero
        compact
        title={unit.name}
        crumbs={[
          { label: "MCQs", href: "/mcqs" },
          { label: subject.name, href: hubHref },
          { label: unit.name },
        ]}
        sharePath={path}
        shareText={`${unit.name} MCQs — ${subject.name}, ${specialty.name} ${ordinal(semester)} semester`}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Link
            href={hubHref}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All {subject.name} units
          </Link>

          {unit.hasPage && (
            <div className="flex items-center gap-2">
              {questions.length === 0 && (
              <a
                href={frameSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white hover:bg-teal/5 text-gray-700 hover:text-teal border border-gray-200 hover:border-teal/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open full page
              </a>
              )}
              <ShareButton path={path} title={`${unit.name} MCQs`} variant="light" />
            </div>
          )}
        </div>

        {questions.length > 0 ? (
          <McqPlayer
            unitId={unit._id}
            unitName={unit.name}
            questions={questions.slice(0, MCQ_FREE_PREVIEW)}
            totalCount={questions.length}
            backHref={hubHref}
          />
        ) : unit.hasPage ? (
          <div className="space-y-4">
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
          <McqMarkComplete unitId={unit._id} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700">MCQs coming soon</h3>
            <p className="text-gray-400 text-sm mt-1">The MCQs for this unit haven&apos;t been uploaded yet.</p>
          </div>
        )}

        {next && (
          <Link
            href={`${subjectPath}/${next.slug}`}
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-white border border-gray-200 hover:border-teal/40 hover:shadow-sm px-5 py-4 transition-all"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wide text-teal">Up next</span>
              <span className="block font-semibold text-gray-800 truncate">{next.name}</span>
            </span>
            <ArrowRight className="w-5 h-5 text-teal shrink-0" />
          </Link>
        )}
      </main>
      <McqFooter />
    </div>
  );
}
