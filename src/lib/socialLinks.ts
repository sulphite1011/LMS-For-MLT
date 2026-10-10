/**
 * Social / contact links shown in the site footer (see components/SocialLinks.tsx).
 * A link is only shown when its `url` is filled in — add the real address between the quotes.
 */
export interface SocialLink {
  id: "whatsapp" | "instagram" | "facebook" | "youtube" | "linkedin" | "github" | "email";
  label: string;
  url: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  // Paste your WhatsApp Channel link here, e.g. "https://whatsapp.com/channel/XXXXXXXX"
  { id: "whatsapp", label: "WhatsApp Channel", url: "" },
  { id: "instagram", label: "Instagram", url: "" },
  { id: "facebook", label: "Facebook", url: "" },
  { id: "youtube", label: "YouTube", url: "" },
  { id: "linkedin", label: "LinkedIn", url: "" },
  { id: "github", label: "GitHub", url: "https://github.com/sulphite1011/LMS-For-MLT" },
  { id: "email", label: "Email", url: "mailto:hamadkhadimdgkmc@gmail.com" },
];
