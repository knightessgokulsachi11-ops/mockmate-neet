import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  summarize,
  summarizeBySubject,
  type ExamSubmission,
  type SubjectScore,
} from "./exam-store";

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
  subject_breakdown: SubjectScore[];
  submission: ExamSubmission | null;
}

export function useTestHistory() {
  return useQuery({
    queryKey: ["test-attempts"],
    queryFn: async (): Promise<TestAttempt[]> => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select(
          "id,title,timing,auto_submitted,total_questions,correct,wrong,unanswered,score,max_score,percentage,total_time_seconds,submitted_at,subject_breakdown",
        )
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...(row as unknown as TestAttempt),
        subject_breakdown: ((row as { subject_breakdown?: unknown }).subject_breakdown ??
          []) as SubjectScore[],
        submission: null,
      }));
    },
  });
}

export function useAttempt(id: string | undefined) {
  return useQuery({
    queryKey: ["test-attempt", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<TestAttempt | null> => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as TestAttempt;
      return {
        ...row,
        subject_breakdown: (row.subject_breakdown ?? []) as SubjectScore[],
        submission: (row.submission ?? null) as ExamSubmission | null,
      };
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
          subject_breakdown: summarizeBySubject(result),
          submission: result,
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
