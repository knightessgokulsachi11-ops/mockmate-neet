/**
 * Parse MCQs out of plain text (PDF text layer or OCR output).
 * Pure text parsing — no AI. A chunk that cannot be parsed is skipped on its
 * own; every other question on the page/document is still kept.
 */

export interface ParsedQuestion {
  /** Printed question number, when one was found. */
  number: number | null;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 1 | 2 | 3 | 4 | null;
  explanation: string;
  /** True when the question references a diagram/table/structure. */
  hasVisual: boolean;
  /** Character offset of the chunk inside the text that was parsed. */
  offset: number;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  /** Chunks that could not be parsed (kept for reporting only). */
  failed: number;
}

/** Content that plain text cannot represent faithfully — keep the page image. */
const COMPLEX_HINTS =
  /(figure|fig\.|diagram|graph|circuit|match the|list\s*-?\s*i{1,2}\b|column\s*-?\s*i\b|as shown|following (?:circuit|structure|reaction|graph|diagram|table)|structure of|table below|given below)/i;

/** Option markers: 1) 1. (1) A) A. (A) — must be followed by content. */
const OPTION_RE = /(?:^|[\s(])\(?\s*([1-4]|[a-dA-D])\s*[).\]:]\s+(?=\S)/g;

const ANSWER_RE =
  /(?:ans(?:wer)?|correct\s*(?:option|answer))\s*[:.\-]?\s*\(?\s*([1-4]|[a-dA-D])\s*\)?/i;

const OPTION_INDEX: Record<string, 1 | 2 | 3 | 4> = {
  "1": 1, "2": 2, "3": 3, "4": 4,
  a: 1, b: 2, c: 3, d: 4, A: 1, B: 2, C: 3, D: 4,
};

function clean(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** Question starts: "1.", "1)", "Q1", "Q1.", "Question 1", "Q.1" */
const QUESTION_START_RE =
  /(?:^|\n)[ \t]*(?:(?:Q(?:ues|uestion)?)\s*\.?\s*)?(\d{1,4})\s*[).\].:\-]?[ \t]+(?=\S)/g;

interface Chunk {
  number: number;
  text: string;
  offset: number;
}

function splitQuestions(text: string): Chunk[] {
  const marks: { index: number; end: number; num: number }[] = [];
  QUESTION_START_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = QUESTION_START_RE.exec(text))) {
    const start = m.index + (text[m.index] === "\n" ? 1 : 0);
    marks.push({ index: start, end: m.index + m[0].length, num: Number(m[1]) });
  }
  return marks.map((mk, i) => ({
    number: mk.num,
    offset: mk.index,
    text: text.slice(mk.index, marks[i + 1]?.index ?? text.length),
  }));
}

function parseChunk(chunk: Chunk): ParsedQuestion | null {
  const body = chunk.text.replace(
    /^[ \t]*(?:(?:Q(?:ues|uestion)?)\s*\.?\s*)?\d{1,4}\s*[).\].:\-]?[ \t]+/,
    "",
  );

  OPTION_RE.lastIndex = 0;
  const hits: { key: string; start: number; textStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = OPTION_RE.exec(body))) {
    hits.push({ key: m[1]!, start: m.index, textStart: m.index + m[0].length });
    OPTION_RE.lastIndex = m.index + m[0].length;
  }

  // Keep the first strictly increasing 1/2/3/4 (or a/b/c/d) run.
  const numeric = ["1", "2", "3", "4"];
  const alpha = ["a", "b", "c", "d"];
  const pick: typeof hits = [];
  for (const hit of hits) {
    if (pick.length > 3) break;
    const k = hit.key.toLowerCase();
    if (k === numeric[pick.length] || k === alpha[pick.length]) pick.push(hit);
  }
  if (pick.length < 4) return null;

  const questionText = clean(body.slice(0, pick[0]!.start));
  if (questionText.length < 5) return null;

  const opts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const end = i < 3 ? pick[i + 1]!.start : body.length;
    opts.push(clean(body.slice(pick[i]!.textStart, end)));
  }

  const tail = body.slice(pick[3]!.textStart);
  const ansMatch = tail.match(ANSWER_RE) ?? body.match(ANSWER_RE);
  const correct = ansMatch ? (OPTION_INDEX[ansMatch[1]!] ?? null) : null;

  // Trim a trailing answer/solution block out of the last option.
  const lastSplit = opts[3]!.search(/\b(ans(?:wer)?|sol(?:ution)?|explanation)\b/i);
  let explanation = "";
  if (lastSplit > 0) {
    explanation = clean(opts[3]!.slice(lastSplit).replace(ANSWER_RE, ""));
    opts[3] = clean(opts[3]!.slice(0, lastSplit));
  }
  if (opts.some((o) => o.length === 0)) return null;

  return {
    number: chunk.number,
    question_text: questionText,
    option_a: opts[0]!,
    option_b: opts[1]!,
    option_c: opts[2]!,
    option_d: opts[3]!,
    correct_option: correct,
    explanation,
    hasVisual: COMPLEX_HINTS.test(chunk.text),
    offset: chunk.offset,
  };
}

export function parseQuestionsFromText(text: string): ParseResult {
  const trimmed = (text ?? "").replace(/\r/g, "").trim();
  if (trimmed.length < 20) return { questions: [], failed: 0 };

  const chunks = splitQuestions(trimmed);
  if (!chunks.length) return { questions: [], failed: 0 };

  const questions: ParsedQuestion[] = [];
  let failed = 0;
  for (const chunk of chunks) {
    const parsed = parseChunk(chunk);
    if (parsed) questions.push(parsed);
    else failed++;
  }
  return { questions, failed };
}
