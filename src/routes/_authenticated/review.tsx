import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  examStore,
  summarize,
  summarizeBySubject,
  type ExamSubmission,
} from "@/lib/exam-store";
import { useAttempt } from "@/lib/attempts";
import { OPTION_KEYS, formatClock, formatDuration, optionText } from "@/lib/neet";
import { MathText } from "@/components/exam/math-text";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Answer Review — NEET 2027 CBT Practice" },
      {
        name: "description",
        content: "Question-by-question review with correct answers, explanations and time spent.",
      },
      { property: "og:title", content: "Answer Review — NEET 2027 CBT Practice" },
      {
        property: "og:description",
        content: "Review every NEET practice question with explanations.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    attempt: typeof search.attempt === "string" ? search.attempt : undefined,
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { attempt } = Route.useSearch();
  const attemptQuery = useAttempt(attempt);
  const [stored, setStored] = useState<ExamSubmission | null>(null);
  const [ready, setReady] = useState(false);
  const [incorrectOnly, setIncorrectOnly] = useState(false);

  useEffect(() => {
    setStored(examStore.getResult());
    setReady(true);
  }, []);

  const result = attempt ? (attemptQuery.data?.submission ?? null) : stored;
  const loading = attempt ? attemptQuery.isLoading : !ready;

  const summary = useMemo(() => (result ? summarize(result) : null), [result]);
  const subjects = useMemo(() => (result ? summarizeBySubject(result) : []), [result]);
  const wrongCount = summary?.wrong ?? 0;

  if (loading) return null;

  const backLink = attempt ? "/history" : "/result";
  const backLabel = attempt ? "Back to history" : "Back to result";

  if (!result || !summary) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Nothing to review</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This attempt was recorded before detailed review data was saved.
          </p>
          <Button asChild className="mt-4">
            <Link to={backLink}>{backLabel}</Link>
          </Button>
        </main>
      </div>
    );
  }

  const visible = result.questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => {
      if (!incorrectOnly) return true;
      const a = result.answers[q.id] ?? null;
      return a !== null && a !== q.correct_answer;
    });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Answer Review</h1>
            <p className="text-sm text-muted-foreground">{result.title}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={backLink}>
              <ArrowLeft className="size-4" /> {backLabel}
            </Link>
          </Button>
        </div>

        {/* Score summary */}
        <section className="exam-surface mt-4 rounded-md p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total NEET score (+4 / −1)</p>
              <p className="font-mono text-3xl font-bold">
                {summary.score} <span className="text-base text-muted-foreground">/ {summary.maxScore}</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {summary.percentage}% · {formatClock(Math.round(result.totalTimeSeconds))} taken
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
            <span className="rounded-sm bg-muted px-2 py-1">Total {summary.total}</span>
            <span className="rounded-sm bg-muted px-2 py-1 text-success">Correct {summary.correct}</span>
            <span className="rounded-sm bg-muted px-2 py-1 text-destructive">Wrong {summary.wrong}</span>
            <span className="rounded-sm bg-muted px-2 py-1 text-muted-foreground">
              Unanswered {summary.unanswered}
            </span>
          </div>

          <h2 className="mt-4 text-sm font-semibold">Subject-wise breakdown</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {subjects.map((s) => (
              <div
                key={s.subject}
                className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{s.subject}</span>
                <span className="font-mono">
                  {s.score}/{s.maxScore}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({s.correct}✓ {s.wrong}✗ {s.unanswered}–)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 flex items-center gap-2 rounded-sm border border-border bg-muted/50 px-3 py-2">
          <Switch id="incorrect-only" checked={incorrectOnly} onCheckedChange={setIncorrectOnly} />
          <Label htmlFor="incorrect-only" className="cursor-pointer text-sm font-medium">
            Show Incorrect Questions Only
          </Label>
          <span className="text-xs text-muted-foreground">({wrongCount})</span>
        </div>

        {visible.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No incorrect answers in this test — every attempted question was correct.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {visible.map(({ q, idx }) => {
              const answer = result.answers[q.id] ?? null;
              const verdict = !answer
                ? "Skipped"
                : answer === q.correct_answer
                  ? "Correct"
                  : "Wrong";
              return (
                <article
                  key={q.id}
                  className={cn(
                    "exam-surface rounded-md border",
                    verdict === "Wrong" ? "border-destructive" : "border-border",
                  )}
                >
                  <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Q{idx + 1}</span>
                    <span>{q.subject}</span>
                    <span>· {q.chapter}</span>
                    {q.major_topic && <span>· {q.major_topic}</span>}
                    <span>· {q.difficulty}</span>
                    {q.is_pyq && <span className="font-medium text-primary">· PYQ</span>}
                    <span
                      className={cn(
                        "ml-auto rounded-sm px-2 py-0.5 font-semibold",
                        verdict === "Correct"
                          ? "bg-st-answered text-st-oncontrast"
                          : verdict === "Wrong"
                            ? "bg-st-notanswered text-st-oncontrast"
                            : "bg-st-notvisited text-st-notvisited-foreground",
                      )}
                    >
                      {verdict}
                    </span>
                  </header>

                  <div className="space-y-4 p-4">
                    <MathText as="p" className="text-[15px] leading-relaxed">
                      {q.question_text}
                    </MathText>
                    {q.image_url && (
                      <img
                        src={q.image_url}
                        alt={`Figure for question ${idx + 1}`}
                        loading="lazy"
                        className="max-h-72 rounded-sm border border-border object-contain"
                      />
                    )}

                    <ul className="space-y-2">
                      {OPTION_KEYS.map((key) => {
                        const isCorrect = key === q.correct_answer;
                        const isYours = key === answer;
                        return (
                          <li
                            key={key}
                            className={cn(
                              "flex items-start gap-3 rounded-sm border p-3 text-sm",
                              isCorrect
                                ? "border-st-answered bg-st-answered/10"
                                : isYours
                                  ? "border-destructive bg-destructive/10"
                                  : "border-border",
                            )}
                          >
                            <span className="font-semibold">({key})</span>
                            <MathText className="flex-1">{optionText(q, key)}</MathText>
                            {isYours && (
                              <span
                                className={cn(
                                  "text-xs",
                                  isCorrect ? "text-muted-foreground" : "font-medium text-destructive",
                                )}
                              >
                                Your answer
                              </span>
                            )}
                            {isCorrect && (
                              <span className="text-xs font-medium text-success">Correct</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    <dl className="grid gap-3 rounded-sm bg-muted/50 p-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Your answer</dt>
                        <dd
                          className={cn(
                            "font-semibold",
                            verdict === "Wrong" && "text-destructive",
                          )}
                        >
                          {answer ?? "Not answered"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Correct answer</dt>
                        <dd className="font-semibold text-success">{q.correct_answer}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Time spent</dt>
                        <dd className="font-mono font-semibold">
                          {formatDuration(result.timePerQuestion[q.id] ?? 0)}
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <h3 className="text-sm font-semibold">Explanation</h3>
                      <MathText as="p" className="mt-1 text-sm text-muted-foreground">
                        {q.explanation || "No explanation provided."}
                      </MathText>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to={backLink}>
              <ArrowLeft className="size-4" /> {backLabel}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
