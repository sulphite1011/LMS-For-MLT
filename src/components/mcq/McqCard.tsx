import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface McqCardProps {
  href: string;
  title: string;
  description?: string;
  icon: ReactNode;
  /** Small pills shown at the bottom of the card. */
  meta?: ReactNode[];
}

/** Card used for specialties, semesters and subjects — same style as the resource cards. */
export function McqCard({ href, title, description, icon, meta = [] }: McqCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-navy to-navy-light flex items-center justify-center text-teal mb-4 group-hover:scale-105 transition-transform duration-300">
          {icon}
        </div>

        <h3 className="font-semibold text-lg text-text-primary group-hover:text-teal transition-colors">{title}</h3>

        {description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>}

        <div className="mt-auto pt-5 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {meta.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-100 px-2.5 py-1 rounded-full">
                {item}
              </span>
            ))}
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal group-hover:translate-x-1 transition-all shrink-0" />
        </div>
      </div>
    </Link>
  );
}
