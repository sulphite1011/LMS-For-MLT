"use client";

import { Share2 } from "lucide-react";
import toast from "react-hot-toast";

interface ShareButtonProps {
  /** Site-relative path to share, e.g. "/mcqs/mlt/3". The current origin is added in the browser. */
  path: string;
  title: string;
  text?: string;
  /** "hero" = glass pill for the navy hero; "light" = outlined button for white backgrounds. */
  variant?: "hero" | "light";
  className?: string;
}

/**
 * Shares a page link using the device's native share sheet when available (mobile),
 * otherwise copies the link to the clipboard.
 */
export function ShareButton({ path, title, text, variant = "hero", className = "" }: ShareButtonProps) {
  const handleShare = async () => {
    const url = `${window.location.origin}${path}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // The user closed the share sheet — nothing else to do.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Any other failure: fall through to copying the link.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const styles =
    variant === "hero"
      ? "bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm"
      : "bg-white hover:bg-teal/5 text-gray-700 hover:text-teal border border-gray-200 hover:border-teal/30";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Share ${title}`}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all ${styles} ${className}`}
    >
      <Share2 className="w-4 h-4" />
      Share
    </button>
  );
}
