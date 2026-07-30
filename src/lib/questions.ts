import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "./neet";

export type QuestionInput = Omit<Question, "id" | "created_at">;

export const questionsQueryOptions = {
  queryKey: ["questions"] as const,
  queryFn: async (): Promise<Question[]> => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Question[];
  },
};

export function useQuestions() {
  return useQuery(questionsQueryOptions);
}

export function useSaveQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: QuestionInput }) => {
      if (id) {
        const { error } = await supabase
          .from("questions")
          .update(values as never)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("questions").insert(values as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useBulkInsertQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: QuestionInput[]) => {
      if (values.length === 0) return 0;
      for (let i = 0; i < values.length; i += 50) {
        const chunk = values.slice(i, i + 50);
        const { error } = await supabase.from("questions").insert(chunk as never);
        if (error) throw error;
      }
      return values.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}


export function uniqueValues(questions: Question[], key: "chapter" | "major_topic") {
  return Array.from(new Set(questions.map((q) => q[key]).filter(Boolean))).sort();
}
