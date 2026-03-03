"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}

export function StarRating({ rating, onRatingChange, interactive = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          whileHover={interactive ? { scale: 1.2 } : {}}
          whileTap={interactive ? { scale: 0.9 } : {}}
          onClick={() => interactive && onRatingChange?.(star)}
          className={`focus:outline-none transition-colors ${interactive ? "cursor-pointer" : "cursor-default"
            }`}
          type="button"
        >
          <Star
            className={`w-5 h-5 ${star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 fill-transparent"
              }`}
          />
        </motion.button>
      ))}
    </div>
  );
}
