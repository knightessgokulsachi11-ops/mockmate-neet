import type { OptionKey, Question } from "./neet";

export interface ExamSession {
  title: string;
  mode: "practice" | "mock";
  durationSeconds: number;
  questions: Question[];
}

export interface ExamSubmission {
  title: string;
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
