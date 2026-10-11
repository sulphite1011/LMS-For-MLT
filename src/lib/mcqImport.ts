/**
 * Turns an uploaded MCQ file into structured questions for the native quiz player.
 *
 * Accepted inputs (tried in this order):
 *  1. A JSON file / JSON text:  [ {...}, ... ]   or   { "questions": [ {...}, ... ] }
 *  2. An HTML page that carries its questions as data:
 *       - <script type="application/json"> ... </script>
 *       - a JS array/object literal assigned in a <script>:  const questions = [ ... ];
 *     (the literal is converted to JSON and parsed; nothing from the file is ever executed)
 *
 * A page that only has hard-coded markup (no data) cannot be converted; the caller then keeps the
 * file as an HTML page and the unit is shown in the sandboxed iframe exactly as before.
 *
 * Each question may use any of the usual key names; they are normalised to NormalizedQuestion.
 */

export interface NormalizedQuestion {
  q: string;
  options: string[];
  /** Index into `options` of the correct option. */
  answer: number;
  explanation?: string;
}

export const MCQ_MAX_QUESTIONS = 500;
const MAX_OPTIONS = 8;

const Q_KEYS = ["q", "question", "text", "prompt", "stem", "title", "statement"];
const OPT_KEYS = ["options", "choices", "answers", "opts", "alternatives", "option"];
const ANS_KEYS = ["answer", "correct", "correctIndex", "correctAnswer", "correct_answer", "ans", "right", "key", "correctOption", "correct_option"];
const EXP_KEYS = ["explanation", "exp", "explain", "rationale", "reason", "why", "feedback", "solution"];

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    // case-insensitive
    const found = Object.keys(obj).find((x) => x.toLowerCase() === k.toLowerCase());
    if (found && obj[found] !== undefined && obj[found] !== null) return obj[found];
  }
  return undefined;
}

const clean = (v: unknown, max: number): string =>
  String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Strips a leading "A.", "B)", "(c)" style label from an option. */
const stripLabel = (s: string) => s.replace(/^\(?[A-Ha-h][.)]\s+/, "");

function resolveAnswer(raw: unknown, options: string[]): number | null {
  if (typeof raw === "boolean") return null;
  if (typeof raw === "number" && Number.isInteger(raw)) {
    if (raw >= 0 && raw < options.length) return raw; // 0-based
    return null;
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (/^[A-Ha-h]$/.test(s)) {
      const i = s.toUpperCase().charCodeAt(0) - 65;
      return i < options.length ? i : null;
    }
    if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10);
      // numeric strings are ambiguous; treat as 0-based (same as numbers)
      return n >= 0 && n < options.length ? n : null;
    }
    const norm = clean(s, 500).toLowerCase();
    const i = options.findIndex((o) => o.toLowerCase() === norm || stripLabel(o).toLowerCase() === stripLabel(norm));
    return i >= 0 ? i : null;
  }
  return null;
}

function normalizeOne(item: unknown): NormalizedQuestion | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const obj = item as Record<string, unknown>;

  const q = clean(pick(obj, Q_KEYS), 1000);
  let rawOptions = pick(obj, OPT_KEYS);
  if (rawOptions && !Array.isArray(rawOptions) && typeof rawOptions === "object") {
    // { A: "...", B: "..." }
    rawOptions = Object.keys(rawOptions as object)
      .sort()
      .map((k) => (rawOptions as Record<string, unknown>)[k]);
  }
  if (!q || !Array.isArray(rawOptions)) return null;

  const options = rawOptions
    .map((o) => {
      if (o && typeof o === "object") {
        const rec = o as Record<string, unknown>;
        return clean(pick(rec, ["text", "label", "value", "option"]), 500);
      }
      return clean(o, 500);
    })
    .filter(Boolean);
  if (options.length < 2 || options.length > MAX_OPTIONS) return null;

  let answer = resolveAnswer(pick(obj, ANS_KEYS), options);
  if (answer === null && Array.isArray(rawOptions)) {
    // option objects flagged as correct: { text, correct: true }
    const flagged = rawOptions.findIndex(
      (o) => o && typeof o === "object" && ((o as Record<string, unknown>).correct === true || (o as Record<string, unknown>).isCorrect === true)
    );
    if (flagged >= 0 && flagged < options.length) answer = flagged;
  }
  if (answer === null) return null;

  const explanation = clean(pick(obj, EXP_KEYS), 2000);
  return {
    q,
    options: options.map((o) => stripLabel(o)),
    answer,
    ...(explanation ? { explanation } : {}),
  };
}

function normalizeList(data: unknown): NormalizedQuestion[] {
  let list: unknown = data;
  if (list && !Array.isArray(list) && typeof list === "object") {
    const obj = list as Record<string, unknown>;
    list = obj.questions ?? obj.mcqs ?? obj.items ?? obj.data ?? obj.quiz ?? list;
  }
  if (!Array.isArray(list)) return [];
  const out: NormalizedQuestion[] = [];
  for (const item of list) {
    const n = normalizeOne(item);
    if (n) out.push(n);
    if (out.length >= MCQ_MAX_QUESTIONS) break;
  }
  return out;
}

/** Converts a JS array/object literal to JSON text (no evaluation). Returns null if it cannot. */
export function literalToJson(src: string): string | null {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    // comments
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) return null;
      i = end + 2;
      continue;
    }
    // strings: ', ", `
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let s = "";
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\") {
          const nx = src[i + 1];
          if (nx === "n") s += "\n";
          else if (nx === "t") s += "\t";
          else if (nx === "r") s += "\r";
          else if (nx === "u" && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) {
            s += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
            i += 4;
          } else if (nx === "\n") {
            /* line continuation */
          } else s += nx ?? "";
          i += 2;
          continue;
        }
        if (quote === "`" && src[i] === "$" && src[i + 1] === "{") return null; // template expression
        s += src[i];
        i++;
      }
      if (i >= n) return null;
      i++;
      out += JSON.stringify(s);
      continue;
    }
    // bare identifiers: object keys or true/false/null
    if (/[A-Za-z_$]/.test(c)) {
      let id = "";
      while (i < n && /[\w$]/.test(src[i])) id += src[i++];
      let j = i;
      while (j < n && /\s/.test(src[j])) j++;
      if (src[j] === ":") out += JSON.stringify(id);
      else if (id === "true" || id === "false" || id === "null") out += id;
      else if (id === "undefined") out += "null";
      else return null; // variable reference / function call: not plain data
      continue;
    }
    // trailing commas
    if (c === ",") {
      let j = i + 1;
      while (j < n && /\s/.test(src[j])) j++;
      if (src[j] === "]" || src[j] === "}") {
        i++;
        continue;
      }
    }
    if (/[\[\]{}:,\-+.\d eE\s]/.test(c)) {
      out += c;
      i++;
      continue;
    }
    return null;
  }
  return out;
}

/** Finds the balanced literal that starts at `start` (which must point at "[" or "{"). */
function sliceBalanced(src: string, start: number): string | null {
  const open = src[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function extractFromScripts(html: string): NormalizedQuestion[] {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  let best: NormalizedQuestion[] = [];

  // A plain .js / .txt data file (no <script> tags): scan the whole text as one script body.
  const blocks: { attrs: string; body: string }[] = [];
  while ((m = re.exec(html))) blocks.push({ attrs: m[1] || "", body: m[2] || "" });
  if (!blocks.length && !/<\s*(!doctype|html|body|head)\b/i.test(html)) blocks.push({ attrs: "", body: html });

  for (const { attrs, body } of blocks) {
    if (!body.trim()) continue;

    if (/type\s*=\s*["']?application\/(ld\+)?json/i.test(attrs)) {
      const found = normalizeList(tryParse(body.trim()));
      if (found.length > best.length) best = found;
      continue;
    }

    // `name = [` / `name = {` / `name: [` assignments; try each candidate literal
    const assign = /(?:^|[\s;,(])(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*[:=]\s*(?=[\[{])/g;
    let a: RegExpExecArray | null;
    while ((a = assign.exec(body))) {
      const start = a.index + a[0].length;
      const lit = sliceBalanced(body, start);
      if (!lit || lit.length < 20) continue;
      const json = literalToJson(lit);
      if (!json) continue;
      const found = normalizeList(tryParse(json));
      if (found.length > best.length) best = found;
    }
  }
  return best;
}

export interface ImportResult {
  /** "json" | "html-data" | "none" */
  source: "json" | "html-data" | "none";
  questions: NormalizedQuestion[];
}

export function importQuestions(text: string): ImportResult {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let parsed = tryParse(trimmed);
    if (parsed === undefined) {
      // JS-style literal (unquoted keys, single quotes, trailing commas)
      const asJson = literalToJson(trimmed.replace(/;\s*$/, ""));
      if (asJson) parsed = tryParse(asJson);
    }
    if (parsed !== undefined) {
      const questions = normalizeList(parsed);
      if (questions.length) return { source: "json", questions };
    }
  }
  const questions = extractFromScripts(text);
  if (questions.length) return { source: "html-data", questions };
  return { source: "none", questions: [] };
}

/** True when the text is JSON (so it is a data file, not an HTML page). */
export function looksLikeJson(text: string): boolean {
  const t = text.trim();
  return (t.startsWith("[") || t.startsWith("{")) && tryParse(t) !== undefined;
}

/** True when the text is a pure data file (JSON / JS literal / `const QUESTIONS = [...]`) rather than an HTML page. */
export function isDataFile(text: string): boolean {
  return looksLikeJson(text) || !/<\s*(!doctype|html|body|head|script|div|main|section)\b/i.test(text);
}
