import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExamRunner } from "@/components/exam/exam-runner";
import { examStore, type ExamSession } from "@/lib/exam-store";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/exam")({
  head: () => ({
    meta: [
      { title: "CBT Exam — NEET 2027 Practice" },
      { name: "description", content: "NTA-style NEET CBT exam screen with question palette." },
      { property: "og:title", content: "CBT Exam — NEET 2027 Practice" },
      { property: "og:description", content: "Attempt your generated NEET practice test." },
    ],
  }),
  component: ExamPage,
});

function ExamPage() {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [ready, setReady] = useState(false);
  const { user } = useSession();

  useEffect(() => {
    setSession(examStore.getSession());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!session || session.questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">No active test</h1>
        <p className="text-sm text-muted-foreground">Generate a practice test to begin.</p>
        <Button asChild>
          <Link to="/practice" search={{ mode: "custom" }}>
            Build a test
          </Link>
        </Button>
      </div>
    );
  }

  return <ExamRunner session={session} candidate="Leopardus" />;
}
