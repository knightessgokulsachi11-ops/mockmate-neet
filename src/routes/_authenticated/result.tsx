import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, MinusCircle, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { examStore, summarize, type ExamSubmission } from "@/lib/exam-store";
import { useSaveAttempt } from "@/lib/attempts";
import { formatClock, formatDuration } from "@/lib/neet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/result")({
  head: () => ({
    meta: [
      { title: "Result — NEET 2027 CBT Practice" },
      { name: "description", content: "Score, accuracy and timing breakdown for your NEET practice test." },
      { property: "og:title", content: "Result — NEET 2027 CBT Practice" },
      { property: "og:description", content: "See your NEET practice test score with +4 / −1 marking." },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const [result, setResult] = useState<ExamSubmission | null>(null);
  const [ready, setReady] = useState(false);

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
          <h1 className="text-xl font-semibold">No result available</h1>
          <Button asChild className="mt-4">
            <Link to="/">Back to home</Link>
          </Button>
        </main>
      </div>
    );
  }

  const s = summarize(result);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Test summary
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{result.title}</h1>

        <section className="exam-surface mt-6 rounded-md p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Final score (NEET marking +4 / −1)</p>
              <p className="text-4xl font-bold text-primary">
                {s.score}
                <span className="text-lg font-medium text-muted-foreground"> / {s.maxScore}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-sm bg-accent px-3 py-2 text-accent-foreground">
              <Trophy className="size-5" />
              <span className="text-lg font-semibold">{s.percentage}%</span>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total questions" value={s.total} />
          <Stat label="Correct" value={s.correct} tone="success" icon={CheckCircle2} />
          <Stat label="Wrong" value={s.wrong} tone="danger" icon={XCircle} />
          <Stat label="Unanswered" value={s.unanswered} tone="muted" icon={MinusCircle} />
        </section>

        <section className="exam-surface mt-4 rounded-md p-5">
          <h2 className="text-base font-semibold">Time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.timing === "untimed" ? "Untimed test" : "Timed test"}
            {result.autoSubmitted ? " · auto-submitted when time ended" : ""} · Total time taken:{" "}
            <span className="font-mono font-semibold text-foreground">
              {formatClock(result.totalTimeSeconds)}
            </span>
          </p>
          <div className="mt-4 max-h-80 overflow-y-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Time spent</th>
                </tr>
              </thead>
              <tbody>
                {result.questions.map((q, i) => {
                  const a = result.answers[q.id] ?? null;
                  const status = !a ? "Skipped" : a === q.correct_answer ? "Correct" : "Wrong";
                  return (
                    <tr key={q.id} className="border-t border-border">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">{q.subject}</td>
                      <td className="px-3 py-2">{status}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatDuration(result.timePerQuestion[q.id] ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/review">Review answers</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger" | "muted";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="exam-surface rounded-md p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className={`size-4 ${toneClass}`} />}
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
