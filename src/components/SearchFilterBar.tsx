"use client";

import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { type ResourceType } from "@/types";

const resourceTypes: ResourceType[] = [
  "Notes",
  "Video",
  "PDF",
  "Reference",
  "Quiz",
];

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeType: string | null;
  onTypeChange: (type: string | null) => void;
  activeSubject: string | null;
  onSubjectChange: (subject: string | null) => void;
  subjects: { _id: string; name: string }[];
}

export function SearchFilterBar({
  search,
  onSearchChange,
  activeType,
  onTypeChange,
  activeSubject,
  onSubjectChange,
  subjects,
}: SearchFilterBarProps) {
  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-3">
        {/* Search */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-10 py-3 rounded-full bg-gray-50 border border-gray-200 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm transition-all"
            suppressHydrationWarning
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Rows */}
        <div className="space-y-4">
          {/* Type Filters Section */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold ml-1">By Content Type</span>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              <FilterChip
                label="All Types"
                active={activeType === null}
                onClick={() => onTypeChange(null)}
              />
              {resourceTypes.map((type) => (
                <FilterChip
                  key={type}
                  label={type}
                  active={activeType === type}
                  onClick={() =>
                    onTypeChange(activeType === type ? null : type)
                  }
                />
              ))}
            </div>
          </div>

          {/* Subject Filters Section */}
          {Array.isArray(subjects) && subjects.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold ml-1">By Subject</span>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <FilterChip
                  label="All Subjects"
                  active={activeSubject === null}
                  onClick={() => onSubjectChange(null)}
                />
                {subjects.map((subject) => (
                  <FilterChip
                    key={subject._id}
                    label={subject.name}
                    active={activeSubject === subject._id}
                    onClick={() =>
                      onSubjectChange(
                        activeSubject === subject._id ? null : subject._id
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${active
        ? "bg-teal text-white shadow-md"
        : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-teal hover:text-teal"
        }`}
      whileTap={{ scale: 0.95 }}
      suppressHydrationWarning
    >
      {label}
      {active && (
        <motion.div
          layoutId="activeFilter"
          className="absolute inset-0 bg-teal rounded-full -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
