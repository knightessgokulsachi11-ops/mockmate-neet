export const SUBJECTS = ["Physics", "Chemistry", "Botany", "Zoology"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const OPTION_KEYS = ["A", "B", "C", "D"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export interface Question {
  id: string;
  subject: Subject;
  chapter: string;
  major_topic: string;
  difficulty: Difficulty;
  is_pyq: boolean;
  question_text: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: OptionKey;
  explanation: string;
  created_at?: string;
}

export type QuestionStatus =
  | "not-visited"
  | "not-answered"
  | "answered"
  | "review"
  | "answered-review";

export const MARK_CORRECT = 4;
export const MARK_WRONG = -1;

/** Full mock: 180 questions, 200 minutes (NEET pattern). */
export const FULL_MOCK_PER_SUBJECT = 45;
export const FULL_MOCK_MINUTES = 200;

export function optionText(q: Question, key: OptionKey): string {
  switch (key) {
    case "A":
      return q.option_a;
    case "B":
      return q.option_b;
    case "C":
      return q.option_c;
    case "D":
      return q.option_d;
  }
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}m ${String(rest).padStart(2, "0")}s`;
}

export function statusOf(
  visited: boolean,
  answer: OptionKey | null,
  marked: boolean,
): QuestionStatus {
  if (answer && marked) return "answered-review";
  if (marked) return "review";
  if (answer) return "answered";
  if (visited) return "not-answered";
  return "not-visited";
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const subjectColorClass: Record<Subject, string> = {
  Physics: "text-subject-physics",
  Chemistry: "text-subject-chemistry",
  Botany: "text-subject-botany",
  Zoology: "text-subject-zoology",
};
