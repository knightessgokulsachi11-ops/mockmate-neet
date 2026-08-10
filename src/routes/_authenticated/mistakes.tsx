import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Target, Trash2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MathText } from "@/components/exam/math-text";
import {
  fetchQuestionsByIds,
  useClearMistake,
  useMistakes,
  useWeakAreas,
  type WeakArea,
} from "@/lib/mistakes";
import { sampleQuestions } from "@/lib/questions";
import { examStore, type ExamTiming } from "@/lib/exam-store";
import { shuffle, subjectColorClass, type Question, type Subject } from "@/lib/neet";

export const Route = createFileRoute("/_authenticated/mistakes")({
  head: () => ({
    meta: [
      { title: "My Mistakes & Weak Areas — NEET 2027 CBT" },
      {
        name: "description",
        content:
          "Every question you answered incorrectly, your weakest subjects, chapters and topics, and one-tap practice tests built from them.",
      },
      { property: "og:title", content: "My Mistakes & Weak Areas — NEET 2027 CBT" },
      {
        property: "og:description",
        content: "Review your incorrect NEET questions and practise your weak topics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MistakesPage,
});

function MistakesPage() {
  const navigate = useNavigate();
  const { data: mistakes = [], isLoading } = useMistakes(true);
  const { data: weakAreas = [] } = useWeakAreas();
  const clearMistake = useClearMistake();

  const [timing, setTiming] = useState<ExamTiming>("untimed");
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(20);
  const [starting, setStarting] = useState(false);

  const weakSubjects = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of weakAreas) map.set(a.subject, (map.get(a.subject) ?? 0) + a.mistakes);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [weakAreas]);

  const weakChapters = useMemo(() => {
    const map = new Map<string, { subject: Subject; chapter: string; mistakes: number }>();
    for (const a of weakAreas) {
      const key = `${a.subject}::${a.chapter}`;
      const e = map.get(key) ?? { subject: a.subject, chapter: a.chapter, mistakes: 0 };
      e.mistakes += a.mistakes;
      map.set(key, e);
    }
    return [...map.values()].sort((a, b) => b.mistakes - a.mistakes).slice(0, 10);
  }, [weakAreas]);

  const weakTopics = useMemo(
    () => weakAreas.filter((a) => a.major_topic).slice(0, 10),
    [weakAreas],
  );

  function launch(title: string, questions: Question[]) {
    examStore.setSession({
      title: `${title} (${timing === "timed" ? "Timed" : "Untimed"})`,
      mode: "practice",
      timing,
      durationSeconds: Math.max(1, minutes) * 60,
      questions,
    });
    navigate({ to: "/exam" });
  }

  async function practiceMistakes() {
    setStarting(true);
    try {
      const ids = shuffle(mistakes.map((m) => m.question_id)).slice(0, Math.min(count, 200));
      const questions = shuffle(await fetchQuestionsByIds(ids));
      if (questions.length === 0) return toast.error("No mistake questions available");
      launch(`Mistakes Practice — ${questions.length} questions`, questions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the test");
    } finally {
      setStarting(false);
    }
  }

  async function practiceArea(area: { subject: Subject; chapter: string; major_topic?: string }) {
    setStarting(true);
    try {
      const questions = await sampleQuestions(
        {
          subject: area.subject,
          chapter: area.chapter,
          ...(area.major_topic ? { topic: area.major_topic } : {}),
        },
        Math.min(count, 200),
      );
      if (questions.length === 0) return toast.error("No questions available for this area");
      launch(
        `Weak Area Practice — ${area.subject} · ${area.chapter}${area.major_topic ? ` · ${area.major_topic}` : ""}`,
        questions,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the test");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">My Mistakes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every question you answered wrong is collected here. Questions you later answer correctly
          drop off the list automatically.
        </p>

        <div className="exam-surface mt-5 space-y-4 rounded-md p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Test mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["timed", "untimed"] as ExamTiming[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={timing === t}
                    onClick={() => setTiming(t)}
                    className={
                      "rounded-sm border px-3 py-2 text-sm font-semibold capitalize transition-colors " +
                      (timing === t
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border hover:bg-muted/60")
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Number of questions</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>
            {timing === "timed" && (
              <div className="space-y-1.5">
                <Label>Timer (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          <Button
            className="w-full"
            disabled={starting || mistakes.length === 0}
            onClick={() => void practiceMistakes()}
          >
            {starting ? "Preparing…" : `Practice my mistakes (${mistakes.length} saved)`}
          </Button>
        </div>

        <section className="exam-surface mt-5 rounded-md p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Target className="size-4 text-primary" /> Weak areas
          </h2>
          {weakAreas.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No mistakes recorded yet — attempt a test to build this report.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Weak subjects
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {weakSubjects.map(([s, n]) => (
                    <span
                      key={s}
                      className={`rounded-sm border border-border px-2 py-1 text-sm font-semibold ${subjectColorClass[s as Subject] ?? ""}`}
                    >
                      {s} · {n}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Weak chapters
                </p>
                <ul className="mt-1 space-y-2">
                  {weakChapters.map((c) => (
                    <li
                      key={`${c.subject}-${c.chapter}`}
                      className="flex items-center justify-between gap-3 rounded-sm bg-muted/40 px-3 py-2"
                    >
                      <span className="text-sm">
                        <span className="font-medium">{c.chapter}</span>{" "}
                        <span className="text-muted-foreground">
                          · {c.subject} · {c.mistakes} mistakes
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={starting}
                        onClick={() => void practiceArea(c)}
                      >
                        Practice
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              {weakTopics.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Weak topics
                  </p>
                  <ul className="mt-1 space-y-2">
                    {weakTopics.map((t: WeakArea) => (
                      <li
                        key={`${t.subject}-${t.chapter}-${t.major_topic}`}
                        className="flex items-center justify-between gap-3 rounded-sm bg-muted/40 px-3 py-2"
                      >
                        <span className="text-sm">
                          <span className="font-medium">{t.major_topic}</span>{" "}
                          <span className="text-muted-foreground">
                            · {t.subject} · {t.chapter} · {t.mistakes} mistakes
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={starting}
                          onClick={() => void practiceArea(t)}
                        >
                          Practice
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="exam-surface mt-5 rounded-md p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="size-4 text-primary" /> Incorrect questions
          </h2>
          {isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : mistakes.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing here yet. <Link to="/" className="text-primary underline">Take a test</Link> to
              start tracking mistakes.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {mistakes.map((m) => (
                <li key={m.id} className="rounded-sm border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {m.subject} · {m.chapter}
                        {m.major_topic ? ` · ${m.major_topic}` : ""} · {m.difficulty} · wrong{" "}
                        {m.times_wrong}×
                      </p>
                      <p className="mt-1 text-sm">
                        <MathText>
                          {texts[m.question_id] ?? "Loading question…"}
                        </MathText>
                      </p>

                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove from mistakes"
                      onClick={() => clearMistake.mutate(m.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function MistakePreview({ questionId }: { questionId: string }) {
  return <span className="text-muted-foreground">Question ID {questionId.slice(0, 8)}…</span>;
}
