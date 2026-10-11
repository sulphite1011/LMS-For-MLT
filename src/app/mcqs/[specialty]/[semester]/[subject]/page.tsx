import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ specialty: string; semester: string; subject: string }>;
}

export default async function SubjectPage({ params }: Props) {
  const { specialty, semester, subject } = await params;
  permanentRedirect(
    `/mcqs?s=${encodeURIComponent(specialty)}&sem=${encodeURIComponent(semester)}&sub=${encodeURIComponent(subject)}`
  );
}
