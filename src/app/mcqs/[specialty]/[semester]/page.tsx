import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ specialty: string; semester: string }>;
}

export default async function SemesterPage({ params }: Props) {
  const { specialty, semester } = await params;
  permanentRedirect(`/mcqs?s=${encodeURIComponent(specialty)}&sem=${encodeURIComponent(semester)}`);
}
