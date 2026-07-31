import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { summarize, type ExamSubmission } from "./exam-store";

export interface TestAttempt {
  id: string;
  title: string;
  timing: string;
  auto_submitted: boolean;
  total_questions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  max_score: number;
  percentage: number;
  total_time_seconds: number;
  submitted_at: string;
}

export function useTestHistory() {
  return useQuery({
    queryKey: ["test-attempts"],
    queryFn: async (): Promise<TestAttempt[]> => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TestAttempt[];
    },
  });
}

export function useSaveAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (result: ExamSubmission) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const s = summarize(result);
      const { error } = await supabase.from("test_attempts").upsert(
        {
          user_id: userId,
          title: result.title,
          timing: result.timing ?? "timed",
          auto_submitted: Boolean(result.autoSubmitted),
          total_questions: s.total,
          correct: s.correct,
          wrong: s.wrong,
          unanswered: s.unanswered,
          score: s.score,
          max_score: s.maxScore,
          percentage: s.percentage,
          total_time_seconds: Math.round(result.totalTimeSeconds),
          submitted_at: result.submittedAt,
        } as never,
        { onConflict: "user_id,submitted_at", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["test-attempts"] }),
  });
}

export function useDeleteAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("test_attempts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["test-attempts"] }),
  });
}
