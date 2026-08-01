import type { OptionKey, Question } from "./neet";

export type ExamTiming = "timed" | "untimed";

export interface ExamSession {
  title: string;
  mode: "practice" | "mock";
  timing: ExamTiming;
  durationSeconds: number;
  questions: Question[];
}

export interface ExamSubmission {
  title: string;
  timing?: ExamTiming;
  autoSubmitted?: boolean;
  questions: Question[];
  answers: Record<string, OptionKey | null>;
  marked: Record<string, boolean>;
  visited: Record<string, boolean>;
  timePerQuestion: Record<string, number>;
  totalTimeSeconds: number;
  submittedAt: string;
}

const SESSION_KEY = "neet-cbt-session";
const RESULT_KEY = "neet-cbt-result";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

export const examStore = {
  setSession: (session: ExamSession) => write(SESSION_KEY, session),
  getSession: () => read<ExamSession>(SESSION_KEY),
  clearSession: () => window.sessionStorage.removeItem(SESSION_KEY),
  setResult: (result: ExamSubmission) => write(RESULT_KEY, result),
  getResult: () => read<ExamSubmission>(RESULT_KEY),
};

export interface ScoreSummary {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  maxScore: number;
  percentage: number;
}

export function summarize(result: ExamSubmission): ScoreSummary {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  for (const q of result.questions) {
    const a = result.answers[q.id] ?? null;
    if (!a) unanswered++;
    else if (a === q.correct_answer) correct++;
    else wrong++;
  }
  const total = result.questions.length;
  const maxScore = total * 4;
  const score = correct * 4 - wrong;
  return {
    total,
    correct,
    wrong,
    unanswered,
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0,
  };
}

export interface SubjectScore {
  subject: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  maxScore: number;
}

export function summarizeBySubject(result: ExamSubmission): SubjectScore[] {
  const map = new Map<string, SubjectScore>();
  for (const q of result.questions) {
    const key = q.subject;
    const entry =
      map.get(key) ??
      { subject: key, total: 0, correct: 0, wrong: 0, unanswered: 0, score: 0, maxScore: 0 };
    entry.total++;
    entry.maxScore += 4;
    const a = result.answers[q.id] ?? null;
    if (!a) entry.unanswered++;
    else if (a === q.correct_answer) entry.correct++;
    else entry.wrong++;
    entry.score = entry.correct * 4 - entry.wrong;
    map.set(key, entry);
  }
  return [...map.values()];
}
