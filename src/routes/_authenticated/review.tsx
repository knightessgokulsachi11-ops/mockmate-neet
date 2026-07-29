import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { examStore, type ExamSubmission } from "@/lib/exam-store";
import { OPTION_KEYS, formatDuration, optionText } from "@/lib/neet";
import { Button } from "@/components/ui/button";
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
  component: ReviewPage,
});

function ReviewPage() {
  const [result, setResult] = useState<ExamSubmission | null>(null);
  const [ready, setReady] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    setResult(examStore.getResult());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!result) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Nothing to review</h1>
          <Button asChild className="mt-4">
            <Link to="/">Back to home</Link>
          </Button>
        </main>
      </div>
    );
  }

  const q = result.questions[i];
  const answer = result.answers[q.id] ?? null;
  const verdict = !answer ? "Skipped" : answer === q.correct_answer ? "Correct" : "Wrong";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Answer Review</h1>
          <p className="text-sm text-muted-foreground">
            Question {i + 1} of {result.questions.length}
          </p>
        </div>

        <article className="exam-surface mt-4 rounded-md">
          <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Q{i + 1}</span>
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
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.question_text}</p>
            {q.image_url && (
              <img
                src={q.image_url}
                alt={`Figure for question ${i + 1}`}
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
                          ? "border-st-notanswered bg-st-notanswered/10"
                          : "border-border",
                    )}
                  >
                    <span className="font-semibold">({key})</span>
                    <span className="flex-1">{optionText(q, key)}</span>
                    {isYours && <span className="text-xs text-muted-foreground">Your answer</span>}
                    {isCorrect && <span className="text-xs font-medium text-success">Correct</span>}
                  </li>
                );
              })}
            </ul>

            <dl className="grid gap-3 rounded-sm bg-muted/50 p-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Your answer</dt>
                <dd className="font-semibold">{answer ?? "Not answered"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Correct answer</dt>
                <dd className="font-semibold">{q.correct_answer}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Time spent</dt>
                <dd className="font-mono font-semibold">
                  {formatDuration(result.timePerQuestion[q.id] ?? 0)}
                </dd>
              </div>
            </dl>

            <div>
              <h2 className="text-sm font-semibold">Explanation</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {q.explanation || "No explanation provided."}
              </p>
            </div>
          </div>
        </article>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setI((n) => Math.min(result.questions.length - 1, n + 1))}
            disabled={i === result.questions.length - 1}
          >
            Next
          </Button>
          <Button asChild variant="ghost" className="ml-auto">
            <Link to="/result">Back to result</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
