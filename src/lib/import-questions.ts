/** Browser-side parsing of large question datasets (CSV / Excel / JSON) into QuestionInput rows. */
import { DIFFICULTIES, OPTION_KEYS, SUBJECTS, type Question } from "./neet";
import type { QuestionInput } from "./questions";

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ImportParseResult {
  rows: QuestionInput[];
  issues: ImportIssue[];
  total: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const FIELD_ALIASES: Record<string, string[]> = {
  question_text: ["questiontext", "question", "q", "questions", "statement"],
  option_a: ["optiona", "option1", "opta", "a", "1"],
  option_b: ["optionb", "option2", "optb", "b", "2"],
  option_c: ["optionc", "option3", "optc", "c", "3"],
  option_d: ["optiond", "option4", "optd", "d", "4"],
  correct_answer: ["correctanswer", "answer", "correctoption", "correct", "ans", "key"],
  explanation: ["explanation", "solution", "reason"],
  subject: ["subject"],
  chapter: ["chapter", "unit"],
  major_topic: ["majortopic", "topic", "subtopic"],
  difficulty: ["difficulty", "level"],
  is_pyq: ["ispyq", "pyq", "previousyear"],
  image_url: ["imageurl", "image", "img"],
};

function pick(record: Record<string, unknown>, field: string): string {
  const aliases = FIELD_ALIASES[field] ?? [field];
  for (const key of Object.keys(record)) {
    if (aliases.includes(norm(key))) {
      const v = record[key];
      if (v === null || v === undefined) return "";
      return String(v).trim();
    }
  }
  return "";
}

function toAnswer(raw: string): Question["correct_answer"] | null {
  const v = raw.trim().toUpperCase();
  if ((OPTION_KEYS as readonly string[]).includes(v)) return v as Question["correct_answer"];
  const n = Number(v);
  if (n >= 1 && n <= 4) return OPTION_KEYS[n - 1];
  return null;
}

export function normaliseRecord(record: Record<string, unknown>, index: number) {
  const question_text = pick(record, "question_text");
  const option_a = pick(record, "option_a");
  const option_b = pick(record, "option_b");
  const option_c = pick(record, "option_c");
  const option_d = pick(record, "option_d");
  const answer = toAnswer(pick(record, "correct_answer"));

  const missing: string[] = [];
  if (!question_text) missing.push("question");
  if (!option_a || !option_b || !option_c || !option_d) missing.push("all four options");
  if (!answer) missing.push("correct answer (1-4 or A-D)");
  if (missing.length) {
    return { error: { row: index + 1, message: `Missing ${missing.join(", ")}` } as ImportIssue };
  }

  const subjectRaw = pick(record, "subject");
  const subject =
    (SUBJECTS as readonly string[]).find((s) => norm(s) === norm(subjectRaw)) ?? "Physics";
  const diffRaw = pick(record, "difficulty");
  const difficulty =
    (DIFFICULTIES as readonly string[]).find((d) => norm(d) === norm(diffRaw)) ?? "Medium";
  const pyqRaw = norm(pick(record, "is_pyq"));
  const image = pick(record, "image_url");

  const row = {
    subject,
    chapter: pick(record, "chapter") || "General",
    major_topic: pick(record, "major_topic"),
    difficulty,
    is_pyq: ["true", "yes", "1", "y", "pyq"].includes(pyqRaw),
    question_text,
    image_url: image ? image : null,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer: answer,
    explanation: pick(record, "explanation"),
  } as unknown as QuestionInput;

  return { row };
}

export function recordsToRows(records: Record<string, unknown>[]): ImportParseResult {
  const rows: QuestionInput[] = [];
  const issues: ImportIssue[] = [];
  records.forEach((rec, i) => {
    const res = normaliseRecord(rec, i);
    if (res.error) {
      if (issues.length < 50) issues.push(res.error);
    } else if (res.row) {
      rows.push(res.row);
    }
  });
  return { rows, issues, total: records.length };
}

/** Minimal RFC-4180 CSV splitter for one text chunk. */
function parseCsvText(text: string): string[][] {
  const out: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      out.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    out.push(row);
  }
  return out;
}

/**
 * Streams a large CSV file in 4 MB slices so memory stays flat and progress is reported.
 */
export async function parseCsvFileStreaming(
  file: File,
  onProgress: (pct: number) => void,
): Promise<Record<string, unknown>[]> {
  const CHUNK = 4 * 1024 * 1024;
  const decoder = new TextDecoder();
  let header: string[] | null = null;
  let carry = "";
  const records: Record<string, unknown>[] = [];

  for (let offset = 0; offset < file.size; offset += CHUNK) {
    const slice = file.slice(offset, Math.min(offset + CHUNK, file.size));
    const isLast = offset + CHUNK >= file.size;
    const text = carry + decoder.decode(await slice.arrayBuffer(), { stream: !isLast });
    const lastBreak = isLast ? text.length : text.lastIndexOf("\n") + 1;
    carry = isLast ? "" : text.slice(lastBreak);
    const rows = parseCsvText(text.slice(0, lastBreak)).filter((r) => r.some((c) => c !== ""));
    for (const r of rows) {
      if (!header) {
        header = r.map((h) => h.trim());
        continue;
      }
      const rec: Record<string, unknown> = {};
      header.forEach((h, i) => (rec[h] = r[i] ?? ""));
      records.push(rec);
    }
    onProgress(Math.round(((offset + CHUNK) / file.size) * 100));
  }
  onProgress(100);
  return records;
}

export async function parseJsonFile(file: File): Promise<Record<string, unknown>[]> {
  const parsed = JSON.parse(await file.text()) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : ((parsed as { questions?: unknown[] })?.questions ?? []);
  if (!Array.isArray(list)) throw new Error("JSON must be an array of question objects.");
  return list as Record<string, unknown>[];
}

export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("That workbook has no sheets.");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

export const IMPORT_TEMPLATE_HEADERS = [
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_answer",
  "explanation",
  "subject",
  "chapter",
  "major_topic",
  "difficulty",
  "is_pyq",
];
