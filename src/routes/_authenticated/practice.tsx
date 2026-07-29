import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { useQuestions, uniqueValues } from "@/lib/questions";
import {
  DIFFICULTIES,
  FULL_MOCK_MINUTES,
  FULL_MOCK_PER_SUBJECT,
  SUBJECTS,
  shuffle,
  type Question,
} from "@/lib/neet";
import { examStore, type ExamTiming } from "@/lib/exam-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODES = ["subject", "chapter", "topic", "difficulty", "pyq", "mock", "custom"] as const;
type Mode = (typeof MODES)[number];

const MODE_TITLES: Record<Mode, string> = {
  subject: "Subject-wise Practice",
  chapter: "Chapter-wise Practice",
  topic: "Major Topic-wise Practice",
  difficulty: "Difficulty-wise Practice",
  pyq: "PYQ Practice",
  mock: "Full Mock Test",
  custom: "Custom Practice",
};

const ANY = "__any__";

export const Route = createFileRoute("/_authenticated/practice")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (MODES.includes(search.mode as Mode) ? (search.mode as Mode) : "custom") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "Build a practice test — NEET 2027 CBT" },
      {
        name: "description",
        content:
          "Select subject, chapter, major topic, difficulty, question count and timer to generate a NEET CBT practice test.",
      },
      { property: "og:title", content: "Build a practice test — NEET 2027 CBT" },
      {
        property: "og:description",
        content: "Generate NEET practice tests from your own question bank.",
      },
    ],
  }),
  component: PracticeBuilder,
});

function PracticeBuilder() {
  const { mode } = Route.useSearch() as { mode: Mode };
  const navigate = useNavigate();
  const { data: questions = [], isLoading } = useQuestions();

  const [subject, setSubject] = useState<string>(ANY);
  const [chapter, setChapter] = useState<string>(ANY);
  const [topic, setTopic] = useState<string>(ANY);
  const [difficulty, setDifficulty] = useState<string>(ANY);
  const [pyqOnly, setPyqOnly] = useState(mode === "pyq");
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(20);
  const [timing, setTiming] = useState<ExamTiming>("timed");

  const scoped = useMemo(
    () => (subject === ANY ? questions : questions.filter((q) => q.subject === subject)),
    [questions, subject],
  );
  const chapters = useMemo(() => uniqueValues(scoped, "chapter"), [scoped]);
  const topics = useMemo(
    () =>
      uniqueValues(
        chapter === ANY ? scoped : scoped.filter((q) => q.chapter === chapter),
        "major_topic",
      ),
    [scoped, chapter],
  );

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (subject !== ANY && q.subject !== subject) return false;
      if (chapter !== ANY && q.chapter !== chapter) return false;
      if (topic !== ANY && q.major_topic !== topic) return false;
      if (difficulty !== ANY && q.difficulty !== difficulty) return false;
      if (pyqOnly && !q.is_pyq) return false;
      return true;
    });
  }, [questions, subject, chapter, topic, difficulty, pyqOnly]);

  function startPractice() {
    if (filtered.length === 0) return toast.error("No questions match these filters");
    const picked = shuffle(filtered).slice(0, Math.min(count, filtered.length));
    examStore.setSession({
      title: `${MODE_TITLES[mode]} — ${timing === "timed" ? "Timed" : "Untimed"}`,
      mode: "practice",
      timing,
      durationSeconds: Math.max(1, minutes) * 60,
      questions: picked,
    });
    navigate({ to: "/exam" });
  }

  function startMock() {
    const picked: Question[] = [];
    for (const s of SUBJECTS) {
      const pool = questions.filter((q) => q.subject === s);
      picked.push(...shuffle(pool).slice(0, FULL_MOCK_PER_SUBJECT));
    }
    if (picked.length === 0) return toast.error("Add questions to the bank first");
    examStore.setSession({
      title: `Full Mock Test (${timing === "timed" ? "Timed" : "Untimed"}) — ${picked.length} questions`,
      mode: "mock",
      timing,
      durationSeconds: FULL_MOCK_MINUTES * 60,
      questions: picked,
    });
    navigate({ to: "/exam" });
  }

  const showSubject = ["subject", "chapter", "topic", "custom", "difficulty", "pyq"].includes(mode);
  const showChapter = ["chapter", "topic", "custom"].includes(mode);
  const showTopic = ["topic", "custom"].includes(mode);
  const showDifficulty = ["difficulty", "custom"].includes(mode);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">{MODE_TITLES[mode]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "mock"
            ? `${FULL_MOCK_PER_SUBJECT} questions per subject · ${FULL_MOCK_MINUTES} minutes · +4 / −1 marking.`
            : "Choose your filters, then generate the test."}
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading question bank…</p>
        ) : mode === "mock" ? (
          <div className="exam-surface mt-6 rounded-md p-5">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Questions in bank</dt>
                <dd className="text-lg font-semibold">{questions.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="text-lg font-semibold">
                  {timing === "timed" ? `${FULL_MOCK_MINUTES} min` : "No limit"}
                </dd>
              </div>
            </dl>
            <div className="mt-5">
              <TimingChoice value={timing} onChange={setTiming} />
            </div>
            <Button className="mt-5 w-full" onClick={startMock}>
              Start Full Mock Test
            </Button>
          </div>
        ) : (
          <div className="exam-surface mt-6 space-y-4 rounded-md p-5">
            {showSubject && (
              <Field label="Subject">
                <Select
                  value={subject}
                  onValueChange={(v) => {
                    setSubject(v);
                    setChapter(ANY);
                    setTopic(ANY);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All subjects</SelectItem>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {showChapter && (
              <Field label="Chapter">
                <Select
                  value={chapter}
                  onValueChange={(v) => {
                    setChapter(v);
                    setTopic(ANY);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All chapters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All chapters</SelectItem>
                    {chapters.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {showTopic && (
              <Field label="Major topic">
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="All topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All topics</SelectItem>
                    {topics.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {showDifficulty && (
              <Field label="Difficulty">
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any difficulty</SelectItem>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {mode === "custom" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pyqOnly}
                  onChange={(e) => setPyqOnly(e.target.checked)}
                  className="size-4 accent-[var(--primary)]"
                />
                Previous year questions only
              </label>
            )}

            <TimingChoice value={timing} onChange={setTiming} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number of questions">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </Field>
              {timing === "timed" && (
                <Field label="Timer (minutes)">
                  <Input
                    type="number"
                    min={1}
                    max={300}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                  />
                </Field>
              )}
            </div>


            <p className="text-sm text-muted-foreground">
              {filtered.length} matching question{filtered.length === 1 ? "" : "s"} available.
            </p>
            <Button className="w-full" onClick={startPractice} disabled={filtered.length === 0}>
              Generate practice test
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
