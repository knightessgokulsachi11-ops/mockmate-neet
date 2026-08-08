import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Atom,
  BookOpen,
  CalendarRange,
  Layers,
  ListChecks,
  SignalHigh,
  Timer,
  History,
  ArrowRight,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LEO PARDUS NEUROMEDICO — Home" },
      {
        name: "description",
        content:
          "Practise NEET 2027 subject-wise, chapter-wise, topic-wise, by difficulty, PYQs and full mock tests in an NTA-style CBT interface.",
      },
      { property: "og:title", content: "LEO PARDUS NEUROMEDICO — Home" },
      {
        property: "og:description",
        content: "An NTA-style CBT practice environment for NEET 2027 preparation.",
      },
    ],
  }),
  component: Home,
});

const modes = [
  {
    to: "/practice",
    search: { mode: "subject" as const },
    icon: Atom,
    title: "Subject-wise Practice",
    desc: "Physics, Chemistry, Botany or Zoology.",
  },
  {
    to: "/practice",
    search: { mode: "chapter" as const },
    icon: BookOpen,
    title: "Chapter-wise Practice",
    desc: "Target a single chapter at a time.",
  },
  {
    to: "/practice",
    search: { mode: "topic" as const },
    icon: Layers,
    title: "Major Topic-wise Practice",
    desc: "Drill down into a specific major topic.",
  },
  {
    to: "/practice",
    search: { mode: "difficulty" as const },
    icon: SignalHigh,
    title: "Difficulty-wise Practice",
    desc: "Easy, Medium or Hard question sets.",
  },
  {
    to: "/practice",
    search: { mode: "pyq" as const },
    icon: History,
    title: "PYQ Practice",
    desc: "Previous year questions only.",
  },
  {
    to: "/practice",
    search: { mode: "mock" as const },
    icon: ListChecks,
    title: "Full Mock Test",
    desc: "180 questions · 200 minutes · NEET pattern.",
  },
];

function Home() {
  const { session, loading } = useSession();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Personal preparation console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            NEET 2027 Computer Based Test Practice
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Build practice sets from your own question bank and attempt them in an interface that
            mirrors the official NTA NEET CBT screen — question palette, colour-coded statuses,
            countdown timer and +4 / −1 marking.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {!loading && !session && (
              <Button asChild>
                <Link to="/auth">
                  Sign in to start <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            {!loading && session && (
              <Button asChild size="lg">
                <Link to="/history">
                  <History className="size-4" /> My Test History
                </Link>
              </Button>
            )}
          </div>
        </section>


        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((m) => (
            <Link
              key={m.title}
              to={session ? m.to : "/auth"}
              search={session ? m.search : undefined}
              className="group exam-surface rounded-md p-5 transition-shadow hover:shadow-md"
            >
              <m.icon className="size-6 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{m.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Start <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </section>

        <section className="exam-surface mt-8 rounded-md p-5">
          <div className="flex items-center gap-2">
            <Timer className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Custom Practice</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose subject, chapter, major topic, difficulty, number of questions and your own
            timer, then generate the test.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={session ? "/practice" : "/auth"} search={session ? { mode: "custom" } : undefined}>
              Build custom test
            </Link>
          </Button>
        </section>

        <section className="exam-surface mt-4 rounded-md p-5">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Monthly Cumulative Tests</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            All Subjects, Physics, Chemistry or Biology — every month covers the previous months&apos;
            chapters plus the current month&apos;s syllabus.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={session ? "/monthly" : "/auth"}>Open monthly tests</Link>
          </Button>
        </section>

        <section className="exam-surface mt-4 rounded-md p-5">
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h2 className="text-base font-semibold">My Test History</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            View all your past test scores, accuracy, time taken and attempt dates.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={session ? "/history" : "/auth"}>View test history</Link>
          </Button>
        </section>

      </main>
    </div>
  );
}
