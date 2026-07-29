import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock, LayoutGrid, User } from "lucide-react";
import {
  OPTION_KEYS,
  SUBJECTS,
  formatClock,
  optionText,
  statusOf,
  type OptionKey,
  type Question,
  type QuestionStatus,
  type Subject,
} from "@/lib/neet";
import { examStore, type ExamSession } from "@/lib/exam-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { PaletteButton, StatusLegend } from "./palette";

interface Props {
  session: ExamSession;
  candidate: string;
}

export function ExamRunner({ session, candidate }: Props) {
  const navigate = useNavigate();
  const questions = session.questions;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey | null>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>(() =>
    questions.length ? { [questions[0].id]: true } : {},
  );
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [remaining, setRemaining] = useState(session.durationSeconds);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const timeSpent = useRef<Record<string, number>>({});
  const lastTick = useRef<number>(Date.now());
  const currentId = questions[current]?.id;
  const submittedRef = useRef(false);

  // per-question stopwatch
  useEffect(() => {
    lastTick.current = Date.now();
  }, [current]);

  const accumulate = useCallback(() => {
    if (!currentId) return;
    const now = Date.now();
    const delta = (now - lastTick.current) / 1000;
    lastTick.current = now;
    timeSpent.current[currentId] = (timeSpent.current[currentId] ?? 0) + delta;
  }, [currentId]);

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    accumulate();
    const rounded: Record<string, number> = {};
    for (const [k, v] of Object.entries(timeSpent.current)) rounded[k] = Math.round(v);
    examStore.setResult({
      title: session.title,
      questions,
      answers,
      marked,
      visited,
      timePerQuestion: rounded,
      totalTimeSeconds: session.durationSeconds - remaining,
      submittedAt: new Date().toISOString(),
    });
    navigate({ to: "/result", replace: true });
  }, [accumulate, answers, marked, navigate, questions, remaining, session, visited]);

  useEffect(() => {
    const id = window.setInterval(() => {
      accumulate();
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [accumulate]);

  useEffect(() => {
    if (remaining === 0) submit();
  }, [remaining, submit]);

  useEffect(() => {
    setSelected(answers[currentId] ?? null);
  }, [currentId, answers]);

  const statuses = useMemo(() => {
    return questions.map((q) =>
      statusOf(Boolean(visited[q.id]), answers[q.id] ?? null, Boolean(marked[q.id])),
    );
  }, [questions, visited, answers, marked]);

  const counts = useMemo(() => {
    const base: Record<QuestionStatus, number> = {
      "not-visited": 0,
      "not-answered": 0,
      answered: 0,
      review: 0,
      "answered-review": 0,
    };
    for (const s of statuses) base[s]++;
    return base;
  }, [statuses]);

  const subjectsPresent = useMemo(
    () => SUBJECTS.filter((s) => questions.some((q) => q.subject === s)),
    [questions],
  );

  function goTo(index: number) {
    accumulate();
    const q = questions[index];
    if (!q) return;
    setVisited((v) => ({ ...v, [q.id]: true }));
    setCurrent(index);
  }

  function saveAnswer(next?: boolean, markIt?: boolean) {
    const q = questions[current];
    if (!q) return;
    setAnswers((a) => ({ ...a, [q.id]: selected }));
    if (markIt !== undefined) setMarked((m) => ({ ...m, [q.id]: markIt }));
    if (next !== false) goTo(Math.min(current + 1, questions.length - 1));
  }

  function clearResponse() {
    const q = questions[current];
    setSelected(null);
    setAnswers((a) => ({ ...a, [q.id]: null }));
  }

  const q = questions[current];
  if (!q) return null;

  const palette = (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-sm border border-border bg-muted/50 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <User className="size-4 text-primary" />
          <span className="truncate">{candidate}</span>
        </div>
      </div>
      <StatusLegend counts={counts} />
      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Question Palette
        </p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-5">
          {questions.map((item, i) => (
            <PaletteButton
              key={item.id}
              n={i + 1}
              status={statuses[i]}
              active={i === current}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
      <Button variant="destructive" className="mt-auto" onClick={() => setConfirmOpen(true)}>
        Submit Test
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-exam-header text-exam-header-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div>
            <p className="text-sm font-semibold tracking-wide">
              NEET (UG) 2027 — Computer Based Test
            </p>
            <p className="text-[11px] opacity-80">{session.title}</p>
          </div>
          <div className="flex items-center gap-2 rounded-sm bg-white/10 px-3 py-1.5">
            <Clock className="size-4" />
            <span className="font-mono text-base font-semibold tabular-nums">
              {formatClock(remaining)}
            </span>
          </div>
        </div>
        {subjectsPresent.length > 1 && (
          <div className="flex gap-1 overflow-x-auto bg-exam-strip px-2 pt-1 text-foreground">
            {subjectsPresent.map((s: Subject) => {
              const firstIndex = questions.findIndex((item) => item.subject === s);
              const isActive = q.subject === s;
              return (
                <button
                  key={s}
                  onClick={() => goTo(firstIndex)}
                  className={cn(
                    "shrink-0 rounded-t-sm px-4 py-1.5 text-sm font-medium",
                    isActive
                      ? "bg-exam-panel text-primary"
                      : "text-secondary-foreground hover:bg-white/40",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <main className="exam-surface flex flex-1 flex-col rounded-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
            <p className="text-sm font-semibold">Question No. {current + 1}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{q.subject}</span>
              <span>·</span>
              <span>{q.difficulty}</span>
              {q.is_pyq && (
                <>
                  <span>·</span>
                  <span className="font-medium text-primary">PYQ</span>
                </>
              )}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-2 lg:hidden">
                    <LayoutGrid className="size-4" /> Palette
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[88vw] overflow-y-auto p-4 sm:max-w-sm">
                  <SheetTitle className="mb-3 text-base">Question Palette</SheetTitle>
                  {palette}
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex-1 space-y-4 p-4">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.question_text}</p>
            {q.image_url && (
              <img
                src={q.image_url}
                alt={`Figure for question ${current + 1}`}
                loading="lazy"
                className="max-h-72 rounded-sm border border-border object-contain"
              />
            )}
            <div className="space-y-2">
              {OPTION_KEYS.map((key) => (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-sm border p-3 text-sm transition-colors",
                    selected === key
                      ? "border-primary bg-accent"
                      : "border-border hover:bg-muted/60",
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    className="mt-1 accent-[var(--primary)]"
                    checked={selected === key}
                    onChange={() => setSelected(key)}
                  />
                  <span>
                    <span className="mr-2 font-semibold">({key})</span>
                    {optionText(q, key)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/40 p-3">
            <Button size="sm" onClick={() => saveAnswer(true, false)}>
              Save &amp; Next
            </Button>
            <Button size="sm" variant="secondary" onClick={() => saveAnswer(false, true)}>
              Save &amp; Mark for Review
            </Button>
            <Button size="sm" variant="secondary" onClick={() => saveAnswer(true, true)}>
              Mark for Review &amp; Next
            </Button>
            <Button size="sm" variant="outline" onClick={clearResponse}>
              Clear Response
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => goTo(Math.max(0, current - 1))}
                disabled={current === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => goTo(Math.min(questions.length - 1, current + 1))}
                disabled={current === questions.length - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </main>

        <aside className="exam-surface hidden w-80 shrink-0 rounded-sm p-4 lg:block">{palette}</aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit the test?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>You cannot change answers after submitting.</p>
                <ul className="grid grid-cols-2 gap-1 text-foreground">
                  <li>Answered: {counts.answered + counts["answered-review"]}</li>
                  <li>Not answered: {counts["not-answered"]}</li>
                  <li>Not visited: {counts["not-visited"]}</li>
                  <li>Marked for review: {counts.review + counts["answered-review"]}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue test</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Yes, submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export type { Question };
