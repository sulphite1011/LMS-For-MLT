import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ specialty: string }>;
}

// The hub at /mcqs now handles specialty → semester → subject → unit in one page.
export default async function SpecialtyPage({ params }: Props) {
  const { specialty } = await params;
  permanentRedirect(`/mcqs?s=${encodeURIComponent(specialty)}`);
}
