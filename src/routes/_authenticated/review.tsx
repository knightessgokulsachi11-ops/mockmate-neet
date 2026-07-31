import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { examStore, type ExamSubmission } from "@/lib/exam-store";
import { OPTION_KEYS, formatDuration, optionText } from "@/lib/neet";
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
  component: ReviewPage,
});

function ReviewPage() {
  const [result, setResult] = useState<ExamSubmission | null>(null);
  const [ready, setReady] = useState(false);
  const [i, setI] = useState(0);
  const [incorrectOnly, setIncorrectOnly] = useState(false);

  useEffect(() => {
    setResult(examStore.getResult());
    setReady(true);
  }, []);

  const wrongIndices = useMemo(() => {
    if (!result) return [];
    return result.questions
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        const a = result.answers[item.id] ?? null;
        return a !== null && a !== item.correct_answer;
      })
      .map(({ idx }) => idx);
  }, [result]);

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

  const list = incorrectOnly ? wrongIndices : result.questions.map((_, idx) => idx);
  const pos = Math.max(0, list.indexOf(i));
  const activeIndex = list[pos];

  const filterToggle = (
    <div className="flex items-center gap-2 rounded-sm border border-border bg-muted/50 px-3 py-2">
      <Switch
        id="incorrect-only"
        checked={incorrectOnly}
        onCheckedChange={(v) => {
          setIncorrectOnly(v);
          if (v && wrongIndices.length && !wrongIndices.includes(i)) setI(wrongIndices[0]);
        }}
      />
      <Label htmlFor="incorrect-only" className="cursor-pointer text-sm font-medium">
        Show Incorrect Questions Only
      </Label>
      <span className="text-xs text-muted-foreground">({wrongIndices.length})</span>
    </div>
  );

  if (incorrectOnly && wrongIndices.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight">Answer Review</h1>
          <div className="mt-4">{filterToggle}</div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No incorrect answers in this test — every attempted question was correct.
          </p>
        </main>
      </div>
    );
  }

  const q = result.questions[activeIndex];
  const answer = result.answers[q.id] ?? null;
  const verdict = !answer ? "Skipped" : answer === q.correct_answer ? "Correct" : "Wrong";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Answer Review</h1>
          <p className="text-sm text-muted-foreground">
            {incorrectOnly ? "Incorrect" : "Question"} {pos + 1} of {list.length}
          </p>
        </div>

        <div className="mt-3">{filterToggle}</div>


        <article className="exam-surface mt-4 rounded-md">
          <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Q{activeIndex + 1}</span>
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
                    <MathText className="flex-1">{optionText(q, key)}</MathText>
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
              <MathText as="p" className="mt-1 text-sm text-muted-foreground">
                {q.explanation || "No explanation provided."}
              </MathText>
            </div>
          </div>
        </article>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setI(list[Math.max(0, pos - 1)])}
            disabled={pos === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setI(list[Math.min(list.length - 1, pos + 1)])}
            disabled={pos === list.length - 1}
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
