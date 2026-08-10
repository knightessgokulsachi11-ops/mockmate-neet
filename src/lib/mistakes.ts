import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExamSubmission } from "./exam-store";
import type { Difficulty, OptionKey, Question, Subject } from "./neet";

export interface MistakeRow {
  id: string;
  question_id: string;
  subject: Subject;
  chapter: string;
  major_topic: string;
  difficulty: Difficulty;
  times_wrong: number;
  times_correct: number;
  last_answer: OptionKey | null;
  last_wrong_at: string;
  resolved: boolean;
}

export interface WeakArea {
  subject: Subject;
  chapter: string;
  major_topic: string;
  mistakes: number;
  questions: number;
}

/** Log wrong answers and clear ones that were answered correctly this time. */
export async function syncMistakes(result: ExamSubmission) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const wrong: { question_id: string; answer: string }[] = [];
  const fixed: string[] = [];
  for (const q of result.questions) {
    const a = result.answers[q.id] ?? null;
    if (!a) continue;
    if (a === q.correct_answer) fixed.push(q.id);
    else wrong.push({ question_id: q.id, answer: a });
  }

  if (wrong.length > 0) {
    const { error } = await supabase.rpc("record_mistakes", {
      _items: wrong as never,
    });
    if (error) throw error;
  }
  if (fixed.length > 0) {
    await supabase.rpc("record_mistake_corrections", { _question_ids: fixed });
  }
}

export function useSyncMistakes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncMistakes,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mistakes"] });
      void qc.invalidateQueries({ queryKey: ["weak-areas"] });
    },
  });
}

export function useMistakes(onlyUnresolved = true) {
  return useQuery({
    queryKey: ["mistakes", onlyUnresolved] as const,
    queryFn: async (): Promise<MistakeRow[]> => {
      let query = supabase
        .from("question_mistakes")
        .select(
          "id,question_id,subject,chapter,major_topic,difficulty,times_wrong,times_correct,last_answer,last_wrong_at,resolved",
        )
        .order("last_wrong_at", { ascending: false })
        .limit(500);
      if (onlyUnresolved) query = query.eq("resolved", false);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as MistakeRow[];
    },
  });
}

export function useWeakAreas() {
  return useQuery({
    queryKey: ["weak-areas"] as const,
    queryFn: async (): Promise<WeakArea[]> => {
      const { data, error } = await supabase.rpc("weak_areas", { _limit: 50 });
      if (error) throw error;
      return (data ?? []) as unknown as WeakArea[];
    },
  });
}

export function useClearMistake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_mistakes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mistakes"] });
      void qc.invalidateQueries({ queryKey: ["weak-areas"] });
    },
  });
}

/** Load full question rows for a set of mistake question ids. */
export async function fetchQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  const out: Question[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .in("id", ids.slice(i, i + 100));
    if (error) throw error;
    out.push(...((data ?? []) as unknown as Question[]));
  }
  return out;
}
