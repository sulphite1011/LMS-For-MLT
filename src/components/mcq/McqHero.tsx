import { SocialLinks } from "@/components/SocialLinks";
import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";

export interface Crumb {
  label: string;
  href?: string;
}

interface McqHeroProps {
  title: string;
  subtitle?: string;
  crumbs: Crumb[];
  /** Site-relative path of this page (used by the Share button). */
  sharePath: string;
  shareText?: string;
}

/** Navy hero used by every page of the MCQs section — same look as the homepage hero. */
export function McqHero({ title, subtitle, crumbs, sharePath, shareText }: McqHeroProps) {
  return (
    <section className="relative bg-linear-to-br from-navy via-navy-light to-navy overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-1 text-xs sm:text-sm text-gray-400 mb-6">
            {crumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-200">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-5">
            <ListChecks className="w-4 h-4 text-teal" />
            <span className="text-sm text-gray-300">MCQ Practice</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">{title}</h1>

          {subtitle && (
            <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto mb-8">{subtitle}</p>
          )}

          <ShareButton path={sharePath} title={title} text={shareText ?? `${title} — Hamad's MLT Study Hub`} />
        </div>
      </div>
    </section>
  );
}

/** Empty state in the same style as the site's other empty states. */
export function McqEmpty({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
        <ListChecks className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-400 text-center max-w-md">{message}</p>
    </div>
  );
}

/** Same footer as the homepage. */
export function McqFooter() {
  return (
    <footer className="bg-navy text-gray-400 py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-sm mb-4">Medical Laboratory Technology Study Resources</p>
        <SocialLinks />
        <p className="text-xs text-gray-500">
          Want to contribute?{" "}
          <a href="mailto:hamadkhadimdgkmc@gmail.com" className="text-teal hover:underline">
            hamadkhadimdgkmc@gmail.com
          </a>
        </p>
      </div>
    </footer>
  );
}
