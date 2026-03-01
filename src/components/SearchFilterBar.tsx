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
            className="w-full pl-12 pr-10 py-3 rounded-full bg-gray-50 border border-gray-200 focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm transition-all"
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

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {/* Type Filters */}
          <div className="flex gap-2 flex-shrink-0">
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

          {/* Divider */}
          {Array.isArray(subjects) && subjects.length > 0 && (
            <div className="w-px bg-gray-200 flex-shrink-0 mx-1" />
          )}

          {/* Subject Filters */}
          <div className="flex gap-2 flex-shrink-0">
            {Array.isArray(subjects) && subjects.map((subject) => (
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
      className={`relative px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
        active
          ? "bg-[#14b8a6] text-white shadow-md"
          : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6]"
      }`}
      whileTap={{ scale: 0.95 }}
    >
      {label}
      {active && (
        <motion.div
          layoutId="activeFilter"
          className="absolute inset-0 bg-[#14b8a6] rounded-full -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
