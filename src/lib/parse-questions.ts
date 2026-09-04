/**
 * Parse MCQs out of plain text (PDF text layer or OCR output).
 * Anything that cannot be parsed with confidence is flagged so the caller can
 * fall back to AI extraction for that page only.
 */

export interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 1 | 2 | 3 | 4 | null;
  explanation: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  /** True when the page needs AI (complex visuals, or unparseable/unreliable text). */
  needsAi: boolean;
}

/** Content that plain text cannot represent faithfully. */
const COMPLEX_HINTS =
  /(figure|fig\.|diagram|graph|match the|list\s*-?\s*i{1,2}\b|column\s*-?\s*i\b|as shown in|following (?:circuit|structure|reaction|graph|diagram)|structure of the compound)/i;

const OPTION_RE =
  /(?:^|\s)[([]?\s*([1-4]|[aAbBcCdD])\s*[).\]]\s+(?=\S)/g;

const ANSWER_RE =
  /(?:ans(?:wer)?|correct\s*(?:option|answer))\s*[:.\-]?\s*[([]?\s*([1-4]|[aAbBcCdD])\s*[).\]]?/i;

const OPTION_INDEX: Record<string, number> = {
  "1": 1, "2": 2, "3": 3, "4": 4,
  a: 1, b: 2, c: 3, d: 4, A: 1, B: 2, C: 3, D: 4,
};

function clean(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** Split page text into per-question chunks using leading question numbers. */
function splitQuestions(text: string): string[] {
  const normalized = text.replace(/\r/g, "");
  const re = /(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,4})\s*[).\]]\s+/g;
  const marks: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized))) marks.push(m.index);
  if (marks.length < 1) return [];
  const chunks: string[] = [];
  for (let i = 0; i < marks.length; i++) {
    chunks.push(normalized.slice(marks[i], marks[i + 1] ?? normalized.length));
  }
  return chunks;
}

function parseChunk(chunk: string): ParsedQuestion | null {
  const body = chunk.replace(/^\s*(?:Q(?:uestion)?\.?\s*)?\d{1,4}\s*[).\]]\s+/, "");

  OPTION_RE.lastIndex = 0;
  const hits: { key: string; start: number; textStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = OPTION_RE.exec(body))) {
    hits.push({ key: m[1], start: m.index, textStart: m.index + m[0].length });
  }
  // Keep the first strictly increasing 1/2/3/4 (or a/b/c/d) run.
  const wanted = ["1", "2", "3", "4"];
  const alt = ["a", "b", "c", "d"];
  const pick: typeof hits = [];
  for (const hit of hits) {
    const next = pick.length;
    if (next > 3) break;
    const k = hit.key.toLowerCase();
    if (k === wanted[next] || k === alt[next]) pick.push(hit);
  }
  if (pick.length < 4) return null;

  const questionText = clean(body.slice(0, pick[0].start));
  if (questionText.length < 8) return null;

  const opts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const end = i < 3 ? pick[i + 1].start : body.length;
    opts.push(clean(body.slice(pick[i].textStart, end)));
  }
  const tail = body.slice(pick[3].textStart);
  const ansMatch = tail.match(ANSWER_RE) ?? body.match(ANSWER_RE);
  const correct = ansMatch ? (OPTION_INDEX[ansMatch[1]] as 1 | 2 | 3 | 4) : null;

  // Trim a trailing answer/solution block out of the last option.
  const lastSplit = opts[3].search(/\b(ans(?:wer)?|sol(?:ution)?|explanation)\b/i);
  let explanation = "";
  if (lastSplit > 0) {
    explanation = clean(opts[3].slice(lastSplit).replace(ANSWER_RE, ""));
    opts[3] = clean(opts[3].slice(0, lastSplit));
  }
  if (opts.some((o) => o.length === 0)) return null;

  return {
    question_text: questionText,
    option_a: opts[0],
    option_b: opts[1],
    option_c: opts[2],
    option_d: opts[3],
    correct_option: correct,
    explanation,
  };
}

export function parseQuestionsFromText(text: string): ParseResult {
  const trimmed = (text ?? "").trim();
  if (trimmed.length < 40) return { questions: [], needsAi: true };

  const chunks = splitQuestions(trimmed);
  if (!chunks.length) return { questions: [], needsAi: true };

  const questions: ParsedQuestion[] = [];
  let failed = 0;
  for (const chunk of chunks) {
    // Complex visual content is never reliable as plain text -> hand the page to AI.
    if (COMPLEX_HINTS.test(chunk)) return { questions: [], needsAi: true };
    const parsed = parseChunk(chunk);
    if (parsed && parsed.correct_option) questions.push(parsed);
    else failed++;
  }

  // If anything on the page failed, let AI redo the whole page so questions,
  // options and their related content stay correctly associated.
  if (!questions.length || failed > 0) return { questions: [], needsAi: true };
  return { questions, needsAi: false };
}
