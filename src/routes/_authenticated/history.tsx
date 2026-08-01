import { createFileRoute, Link } from "@tanstack/react-router";
import { History, Trash2, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { useTestHistory, useDeleteAttempt } from "@/lib/attempts";
import { formatClock } from "@/lib/neet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "My Test History — NEET 2027 CBT Practice" },
      {
        name: "description",
        content: "All your past NEET CBT practice attempts with scores, accuracy, timing and dates.",
      },
      { property: "og:title", content: "My Test History — NEET 2027 CBT Practice" },
      {
        property: "og:description",
        content: "Track every past NEET practice test score and date in one place.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data: attempts = [], isLoading } = useTestHistory();
  const del = useDeleteAttempt();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-2">
          <History className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">My Test History</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Every completed test with score, accuracy, time taken and date.
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading your attempts…</p>
        ) : attempts.length === 0 ? (
          <div className="exam-surface mt-6 rounded-md p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No tests attempted yet. Finish a practice test and it will appear here.
            </p>
            <Button asChild className="mt-4">
              <Link to="/practice" search={{ mode: "custom" }}>
                Build a practice test
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <SummaryCard label="Tests taken" value={String(attempts.length)} />
              <SummaryCard
                label="Best percentage"
                value={`${Math.max(...attempts.map((a) => Number(a.percentage)))}%`}
              />
              <SummaryCard
                label="Average percentage"
                value={`${(
                  attempts.reduce((sum, a) => sum + Number(a.percentage), 0) / attempts.length
                ).toFixed(1)}%`}
              />
            </section>

            <div className="mt-4 space-y-3">
              {attempts.map((a) => (
                <article key={a.id} className="exam-surface rounded-md p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{a.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.submitted_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        · {a.timing === "untimed" ? "Untimed" : "Timed"}
                        {a.auto_submitted ? " · auto-submitted" : ""} ·{" "}
                        {formatClock(a.total_time_seconds)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xl font-bold">
                        {a.score} / {a.max_score}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        NEET score (+4 / −1) · {Number(a.percentage)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-sm bg-muted px-2 py-1 font-mono">
                      <span className="text-success">{a.correct}</span> /{" "}
                      <span className="text-destructive">{a.wrong}</span> /{" "}
                      <span className="text-muted-foreground">{a.unanswered}</span> of{" "}
                      {a.total_questions}
                    </span>
                    {(a.subject_breakdown ?? []).map((s) => (
                      <span
                        key={s.subject}
                        className="rounded-sm border border-border px-2 py-1 font-mono"
                      >
                        <span className="font-sans font-medium">{s.subject}</span> {s.score}/
                        {s.maxScore}
                        <span className="ml-1 text-muted-foreground">
                          ({s.correct}✓ {s.wrong}✗ {s.unanswered}–)
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/review" search={{ attempt: a.id }}>
                        Review Test
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => del.mutate(a.id)}
                      aria-label="Delete attempt"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>

          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="exam-surface rounded-md p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
