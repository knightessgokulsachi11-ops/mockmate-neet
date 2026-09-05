/**
 * Answer-key reader.
 * Scans the ENTIRE document text (all pages) for a printed answer key and maps
 * question number -> option index (1-4). No AI is involved.
 *
 * Supported entry shapes: "1-C", "1. C", "1) C", "1 : C", "Q1 C", "Q1: C",
 * "Question 1 - C", "(1) C", and numeric answers such as "1-3".
 */

const LETTER_TO_INDEX: Record<string, 1 | 2 | 3 | 4> = {
  a: 1, b: 2, c: 3, d: 4, "1": 1, "2": 2, "3": 3, "4": 4,
};

/** One "number → answer" pair inside a line. */
const PAIR_RE =
  /(?:^|[\s,;|])\(?(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,4})\)?\s*[-.):=:\s]\s*\(?([A-Da-d1-4])\)?(?=$|[\s,;|)])/g;

export type AnswerKey = Map<number, 1 | 2 | 3 | 4>;

export function parseAnswerKey(fullText: string): AnswerKey {
  const key: AnswerKey = new Map();
  const text = (fullText ?? "").replace(/\r/g, "");
  const lines = text.split("\n");

  let inKeySection = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/answer\s*key|answers?\s*[:\-]?\s*$|solutions?\s*key/i.test(line)) {
      inKeySection = true;
    }

    PAIR_RE.lastIndex = 0;
    const pairs: [number, 1 | 2 | 3 | 4][] = [];
    let m: RegExpExecArray | null;
    while ((m = PAIR_RE.exec(line))) {
      const num = Number(m[1]);
      const ans = LETTER_TO_INDEX[m[2]!.toLowerCase()];
      if (num > 0 && ans) pairs.push([num, ans]);
    }
    if (!pairs.length) continue;

    // A key row normally lists several pairs. A single pair only counts once we
    // are inside an explicit answer-key section, or the line is clearly an
    // "Answer: C" style statement attached to a question number.
    const isKeyRow = pairs.length >= 2 || (inKeySection && line.length < 60);
    if (!isKeyRow) continue;

    for (const [num, ans] of pairs) if (!key.has(num)) key.set(num, ans);
  }

  // "Q12 Answer: C" / "12. Ans - 3" statements anywhere in the document.
  const stmt =
    /(?:^|\n)\s*(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,4})\s*[).:\-]?[^\n]{0,80}?\bans(?:wer)?\b\s*[:.\-]?\s*\(?([A-Da-d1-4])\)?/gi;
  let s: RegExpExecArray | null;
  while ((s = stmt.exec(text))) {
    const num = Number(s[1]);
    const ans = LETTER_TO_INDEX[s[2]!.toLowerCase()];
    if (num > 0 && ans && !key.has(num)) key.set(num, ans);
  }

  return key;
}
