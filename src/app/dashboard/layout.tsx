import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Manage your profile, favorites, liked resources, and view your activity on Hamad's MLT Study Hub.",
  robots: { index: false, follow: false }, // Dashboard is private
};

export { default } from "./page";
