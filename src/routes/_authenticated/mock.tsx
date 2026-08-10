import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BookOpen, ListChecks, Atom } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { sampleQuestions, useChapterList, useQuestionCount } from "@/lib/questions";
import {
  FULL_MOCK_PER_SUBJECT,
  SUBJECTS,
  shuffle,
  type Question,
  type Subject,
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

/** NEET Model Exam: full paper, 180-minute timer. */
const NEET_MODEL_MINUTES = 180;

type MockKind = "neet" | "subject" | "chapter";

export const Route = createFileRoute("/_authenticated/mock")({
  head: () => ({
    meta: [
      { title: "Mock Tests — NEET 2027 CBT" },
      {
        name: "description",
        content:
          "Attempt a full NEET Model Exam (Physics, Chemistry and Biology, 180 minutes), a subject-wise mock test or a chapter-wise mock test.",
      },
      { property: "og:title", content: "Mock Tests — NEET 2027 CBT" },
      {
        property: "og:description",
        content: "NEET Model Exam, subject-wise and chapter-wise mock tests in an NTA-style CBT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MockTests,
});

function MockTests() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<MockKind>("neet");
  const [timing, setTiming] = useState<ExamTiming>("timed");
  const [subject, setSubject] = useState<Subject>("Physics");
  const [chapter, setChapter] = useState<string>("");
  const [count, setCount] = useState(45);
  const [minutes, setMinutes] = useState(60);
  const [starting, setStarting] = useState(false);

  const { data: chapterRows = [] } = useChapterList(subject);
  const chapters = useMemo(() => chapterRows.map((c) => c.chapter), [chapterRows]);

  const { data: bankCount = 0 } = useQuestionCount({});
  const { data: subjectCount = 0 } = useQuestionCount({ subject });
  const { data: chapterCount = 0 } = useQuestionCount(
    chapter ? { subject, chapter } : { subject },
  );

  async function startNeetModel() {
    setStarting(true);
    try {
      const perSubject = await Promise.all(
        SUBJECTS.map((s) => sampleQuestions({ subject: s }, FULL_MOCK_PER_SUBJECT)),
      );
      const picked = shuffle(perSubject.flat());
      if (picked.length === 0) return toast.error("Add questions to the bank first");
      examStore.setSession({
        title: `NEET Model Exam (${timing === "timed" ? "Timed" : "Untimed"}) — ${picked.length} questions`,
        mode: "mock",
        timing,
        durationSeconds: NEET_MODEL_MINUTES * 60,
        questions: picked,
      });
      navigate({ to: "/exam" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the model exam");
    } finally {
      setStarting(false);
    }
  }

  async function startFiltered() {
    setStarting(true);
    try {
      const filters =
        kind === "chapter" && chapter ? { subject, chapter } : { subject };
      const picked: Question[] = await sampleQuestions(filters, Math.min(count, 500));
      if (picked.length === 0) return toast.error("No questions match this selection");
      const label =
        kind === "chapter"
          ? `Chapter-wise Mock — ${subject} · ${chapter || "All chapters"}`
          : `Subject-wise Mock — ${subject}`;
      examStore.setSession({
        title: `${label} (${timing === "timed" ? "Timed" : "Untimed"})`,
        mode: "mock",
        timing,
        durationSeconds: Math.max(1, minutes) * 60,
        questions: picked,
      });
      navigate({ to: "/exam" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the mock test");
    } finally {
      setStarting(false);
    }
  }

  const tabs: { key: MockKind; label: string; icon: typeof Atom }[] = [
    { key: "neet", label: "NEET Model Exam", icon: ListChecks },
    { key: "subject", label: "Subject-wise", icon: Atom },
    { key: "chapter", label: "Chapter-wise", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Mock Tests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full NEET model paper, or focused mock tests by subject or chapter. +4 / −1 marking.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={kind === t.key}
              onClick={() => setKind(t.key)}
              className={
                "flex items-center gap-2 rounded-sm border p-3 text-left text-sm font-semibold transition-colors " +
                (kind === t.key
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-muted/60")
              }
            >
              <t.icon className="size-4 text-primary" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="exam-surface mt-5 space-y-4 rounded-md p-5">
          {kind === "neet" ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Pattern</dt>
                  <dd className="text-lg font-semibold">
                    {FULL_MOCK_PER_SUBJECT * SUBJECTS.length} questions
                  </dd>
                  <dd className="text-xs text-muted-foreground">
                    Physics + Chemistry + Biology (Botany &amp; Zoology)
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="text-lg font-semibold">
                    {timing === "timed" ? `${NEET_MODEL_MINUTES} min` : "No limit"}
                  </dd>
                  <dd className="text-xs text-muted-foreground">
                    {bankCount.toLocaleString()} questions in bank
                  </dd>
                </div>
              </dl>
              <TimingChoice value={timing} onChange={setTiming} />
              <Button
                className="w-full"
                disabled={starting}
                onClick={() => void startNeetModel()}
              >
                {starting ? "Preparing…" : "Start NEET Model Exam"}
              </Button>
            </>
          ) : (
            <>
              <Field label="Subject">
                <Select
                  value={subject}
                  onValueChange={(v) => {
                    setSubject(v as Subject);
                    setChapter("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {kind === "chapter" && (
                <Field label="Chapter">
                  <Select value={chapter} onValueChange={setChapter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
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
                {(kind === "chapter" ? chapterCount : subjectCount).toLocaleString()} questions
                available in this selection.
              </p>

              <Button
                className="w-full"
                disabled={starting || (kind === "chapter" && !chapter)}
                onClick={() => void startFiltered()}
              >
                {starting
                  ? "Preparing…"
                  : kind === "chapter"
                    ? "Start Chapter-wise Mock Test"
                    : "Start Subject-wise Mock Test"}
              </Button>
            </>
          )}
        </div>
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

function TimingChoice({
  value,
  onChange,
}: {
  value: ExamTiming;
  onChange: (v: ExamTiming) => void;
}) {
  const options: { key: ExamTiming; title: string; desc: string }[] = [
    { key: "timed", title: "Timed Test", desc: "Countdown timer, auto-submit at 0:00." },
    { key: "untimed", title: "Untimed Test", desc: "No timer; total & per-question time recorded." },
  ];
  return (
    <div className="space-y-1.5">
      <Label>Test mode</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={value === o.key}
            onClick={() => onChange(o.key)}
            className={
              "rounded-sm border p-3 text-left transition-colors " +
              (value === o.key
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border hover:bg-muted/60")
            }
          >
            <span className="block text-sm font-semibold">{o.title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
