import { MCQ_HTML_MAX_BYTES, validateHtmlText } from "@/lib/mcq";
import { importQuestions, isDataFile } from "@/lib/mcqImport";

export interface UploadPatch {
  htmlContent: string | undefined;
  htmlFileName: string;
  htmlSize: number;
  hasPage: true;
  questions: unknown[] | undefined;
  questionCount: number;
}

export type UploadOutcome =
  | { ok: true; patch: UploadPatch; source: "json" | "html-data" | "none"; count: number }
  | { ok: false; error: string };

/**
 * Reads an uploaded MCQ file (an .html page or a .json question file) and returns the fields to
 * store. HTML pages are always kept (iframe fallback); questions are added when they can be read.
 */
export async function processMcqUpload(file: File): Promise<UploadOutcome> {
  if (file.size > MCQ_HTML_MAX_BYTES) return { ok: false, error: "File is too large (max 4 MB)" };
  const text = await file.text();

  if (isDataFile(text)) {
    const result = importQuestions(text);
    if (!result.questions.length) {
      return {
        ok: false,
        error:
          'No valid questions found in this data file. Each question needs a question text, 2-8 options and a correct answer (e.g. {"q":"…","options":["…","…"],"answer":0}).',
      };
    }
    return {
      ok: true,
      source: "json",
      count: result.questions.length,
      patch: {
        htmlContent: undefined,
        htmlFileName: file.name,
        htmlSize: file.size,
        hasPage: true,
        questions: result.questions,
        questionCount: result.questions.length,
      },
    };
  }

  const problem = validateHtmlText(text);
  if (problem) return { ok: false, error: problem };
  const result = importQuestions(text);
  return {
    ok: true,
    source: result.source,
    count: result.questions.length,
    patch: {
      htmlContent: text,
      htmlFileName: file.name,
      htmlSize: file.size,
      hasPage: true,
      questions: result.questions.length ? result.questions : undefined,
      questionCount: result.questions.length,
    },
  };
}
