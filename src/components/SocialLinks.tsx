import { Facebook, Github, Instagram, Linkedin, Mail, MessageCircle, Youtube } from "lucide-react";
import { SOCIAL_LINKS, type SocialLink } from "@/lib/socialLinks";

const ICONS: Record<SocialLink["id"], React.ReactNode> = {
  whatsapp: <MessageCircle className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  github: <Github className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
};

/** Footer row of social icons + the WhatsApp Channel button. Links with an empty url are skipped. */
export function SocialLinks() {
  const links = SOCIAL_LINKS.filter((l) => l.url.trim());
  if (links.length === 0) return null;
  const whatsapp = links.find((l) => l.id === "whatsapp");
  const icons = links.filter((l) => l.id !== "whatsapp");

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
      {whatsapp && (
        <a
          href={whatsapp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          {ICONS.whatsapp}
          Join our WhatsApp Channel
        </a>
      )}
      {icons.map((l) => (
        <a
          key={l.id}
          href={l.url}
          target={l.url.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-teal text-gray-300 hover:text-white flex items-center justify-center transition-colors"
        >
          {ICONS[l.id]}
        </a>
      ))}
    </div>
  );
}
