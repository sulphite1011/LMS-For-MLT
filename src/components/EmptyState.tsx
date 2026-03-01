"use client";

import { motion } from "framer-motion";
import { FileX, SearchX } from "lucide-react";

interface EmptyStateProps {
  type?: "no-resources" | "no-results";
  message?: string;
}

export function EmptyState({
  type = "no-resources",
  message,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
        {type === "no-results" ? (
          <SearchX className="w-10 h-10 text-gray-300" />
        ) : (
          <FileX className="w-10 h-10 text-gray-300" />
        )}
      </div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        {type === "no-results" ? "No results found" : "No resources yet"}
      </h3>
      <p className="text-gray-400 text-center max-w-md">
        {message ||
          (type === "no-results"
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Resources will appear here once they are added. Check back soon!")}
      </p>
    </motion.div>
  );
}
