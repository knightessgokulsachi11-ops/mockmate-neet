import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarRange, Layers, Pencil } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChapterPicker } from "@/components/monthly/chapter-picker";
import { countAcrossChapters, sampleAcrossChapters } from "@/lib/questions";
import { shuffle, type Question } from "@/lib/neet";
import { examStore, type ExamTiming } from "@/lib/exam-store";
import {
  CATEGORY_LABELS,
  CATEGORY_SUBJECTS,
  MONTHLY_CATEGORIES,
  MONTHLY_PLAN,
  type MonthlyCategory,
} from "@/lib/monthly-plan";
import { cumulativeFromPlan, useMonthlyPlan } from "@/lib/monthly-plan-store";


export const Route = createFileRoute("/_authenticated/monthly")({
  head: () => ({
    meta: [
      { title: "Monthly Cumulative Tests — NEET 2027 CBT" },
      {
        name: "description",
        content:
          "Month-wise cumulative NEET tests covering every chapter from earlier months plus the current month's syllabus, in Physics, Chemistry and Biology.",
      },
      { property: "og:title", content: "Monthly Cumulative Tests — NEET 2027 CBT" },
      {
        property: "og:description",
        content: "Fixed cumulative chapter coverage with fresh questions on every attempt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MonthlyTests,
});

function MonthlyTests() {
  const navigate = useNavigate();
  const [monthId, setMonthId] = useState(MONTHLY_PLAN[0]!.id);
  const [category, setCategory] = useState<MonthlyCategory>("all");
  const [testsPerMonth, setTestsPerMonth] = useState<Record<string, number>>({});
  const [testNo, setTestNo] = useState(1);
  const testCount = Math.max(1, Math.min(testsPerMonth[monthId] ?? 1, 30));
  const [count, setCount] = useState(45);
  const [minutes, setMinutes] = useState(60);
  const [timing, setTiming] = useState<ExamTiming>("timed");
  const [starting, setStarting] = useState(false);

  const groups = useMemo(() => chaptersFor(monthId, category), [monthId, category]);
  const totalChapters = groups.reduce((n, g) => n + g.chapters.length, 0);

  const { data: available = 0, isLoading: countLoading } = useQuery({
    queryKey: ["monthly", "count", monthId, category] as const,
    staleTime: 60_000,
    queryFn: async () => {
      const totals = await Promise.all(
        groups.map((g) => countAcrossChapters(g.subject, g.chapters)),
      );
      return totals.reduce((a, b) => a + b, 0);
    },
  });

  async function start() {
    setStarting(true);
    try {
      const wanted = Math.max(1, Math.min(count, 200));
      const subjects = CATEGORY_SUBJECTS[category];
      const perSubject = Math.ceil(wanted / subjects.length);
      const picks = await Promise.all(
        groups.map((g) => sampleAcrossChapters(g.subject, g.chapters, perSubject)),
      );
      const questions = shuffle(picks.flat()).slice(0, wanted) as Question[];
      if (questions.length === 0) {
        toast.error("No questions available for this month's chapters yet");
        return;
      }
      const month = MONTHLY_PLAN.find((m) => m.id === monthId)!;
      examStore.setSession({
        title: `${month.label} Cumulative Test ${testNo} of ${testCount} — ${CATEGORY_LABELS[category]} (${timing === "timed" ? "Timed" : "Untimed"})`,
        mode: "practice",
        timing,
        durationSeconds: Math.max(1, minutes) * 60,
        questions,
      });
      navigate({ to: "/exam" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the monthly test");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CalendarRange className="size-6 text-primary" /> Monthly Cumulative Tests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each month covers every chapter from the previous months plus the current month&apos;s
          syllabus. Chapter coverage stays fixed; the questions change on every attempt.
        </p>

        <div className="exam-surface mt-6 space-y-5 rounded-md p-5">
          <div className="space-y-1.5">
            <Label>Subject category</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {MONTHLY_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={
                    "rounded-sm border p-3 text-left text-sm font-medium transition-colors " +
                    (category === c
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border hover:bg-muted/60")
                  }
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Month</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {MONTHLY_PLAN.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={monthId === m.id}
                  onClick={() => {
                    setMonthId(m.id);
                    setTestNo(1);
                  }}
                  className={
                    "rounded-sm border p-2.5 text-left transition-colors " +
                    (monthId === m.id
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border hover:bg-muted/60")
                  }
                >
                  <span className="block text-sm font-semibold">{m.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {(testsPerMonth[m.id] ?? 1)} test{(testsPerMonth[m.id] ?? 1) === 1 ? "" : "s"} · cumulative
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Number of tests this month</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={testCount}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(Number(e.target.value) || 1, 30));
                  setTestsPerMonth((p) => ({ ...p, [monthId]: n }));
                  setTestNo((t) => Math.min(t, n));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Which test</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: testCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={testNo === n}
                    onClick={() => setTestNo(n)}
                    className={
                      "min-w-9 rounded-sm border px-2.5 py-1.5 text-sm font-semibold transition-colors " +
                      (testNo === n
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border hover:bg-muted/60")
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Every test this month uses the same fixed chapters; only the questions change.
              </p>
            </div>
          </div>

          <div className="rounded-sm border border-dashed border-border p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="size-4 text-primary" /> Fixed coverage · {totalChapters} chapters
            </p>
            <div className="mt-2 space-y-2">
              {groups.map((g) => (
                <div key={g.subject}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.subject} ({g.chapters.length})
                  </p>
                  <p className="text-sm">{g.chapters.join(" · ")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Test mode</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  { key: "timed" as const, title: "Timed Test", desc: "Countdown, auto-submit." },
                  {
                    key: "untimed" as const,
                    title: "Untimed Test",
                    desc: "No timer; time is recorded.",
                  },
                ]
              ).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={timing === o.key}
                  onClick={() => setTiming(o.key)}
                  className={
                    "rounded-sm border p-3 text-left transition-colors " +
                    (timing === o.key
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

          <div className="grid gap-4 sm:grid-cols-2">
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

          <p className="text-sm text-muted-foreground">
            {countLoading
              ? "Checking the question bank…"
              : `${available.toLocaleString()} question${available === 1 ? "" : "s"} available in this cumulative syllabus.`}
          </p>

          <Button className="w-full" disabled={starting} onClick={() => void start()}>
            {starting ? "Preparing…" : "Start monthly cumulative test"}
          </Button>
        </div>
      </main>
    </div>
  );
}
