import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function generatePassword(length = 12): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

export const MAX_FILE_SIZE = parseInt(
  process.env.MAX_FILE_SIZE || "10485760",
  10
);

export function formatDistanceToNow(date: Date | string): string {
  const diff = (new Date(date).getTime() - new Date().getTime()) / 1000;
  const absDiff = Math.abs(diff);

  if (absDiff < 60) return "just now";

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });

  if (absDiff < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (absDiff < 2592000) return rtf.format(Math.round(diff / 86400), "day");
  if (absDiff < 31536000) return rtf.format(Math.round(diff / 2592000), "month");
  return rtf.format(Math.round(diff / 31536000), "year");
}

export function generateHandle(base: string): string {
  // Clean the base - remove spaces, special chars, lowercase
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  return clean || "user";
}

export function getAvatar(imageUrl?: string | null): string {
  if (!imageUrl || imageUrl.length < 10) return "/images/default-avatar.png";

  // Clerk's default/initials URLs often contain these patterns
  const isDefault =
    imageUrl.includes("default-user") ||
    imageUrl.includes("avatar_placeholder") ||
    imageUrl.includes("initials") ||
    // Sometimes they look like https://img.clerk.com/hex-code
    (imageUrl.includes("clerk.com") && !imageUrl.includes("?")); // Real images usually have query params or specific paths

  if (isDefault) {
    return "/images/default-avatar.png";
  }
  return imageUrl;
}
