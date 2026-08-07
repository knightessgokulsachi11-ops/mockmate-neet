import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "./neet";

export type QuestionInput = Omit<Question, "id" | "created_at">;

export const PAGE_SIZE = 50;

export interface QuestionFilters {
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  pyqOnly?: boolean;
  search?: string | null;
}

const nn = (v?: string | null) => (v && v !== "__all__" && v !== "__any__" ? v : undefined);

function rpcArgs(f: QuestionFilters) {
  return {
    _subject: nn(f.subject),
    _chapter: nn(f.chapter),
    _topic: nn(f.topic),
    _difficulty: nn(f.difficulty),
    _pyq_only: Boolean(f.pyqOnly),
  };
}

/** Server-side paginated question list — only one page is ever fetched. */
export function useQuestionPages(filters: QuestionFilters) {
  return useInfiniteQuery({
    queryKey: ["questions", "page", filters] as const,
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("search_questions", {
        ...rpcArgs(filters),
        _search: nn(filters.search),
        _limit: PAGE_SIZE,
        _offset: pageParam as number,
      });
      if (error) throw error;
      return (data ?? []) as unknown as Question[];
    },
    getNextPageParam: (last, all) =>
      last.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE,
  });
}

/** Fast COUNT(*) through an indexed server routine. */
export function useQuestionCount(filters: QuestionFilters) {
  return useQuery({
    queryKey: ["questions", "count", filters] as const,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("count_questions", {
        ...rpcArgs(filters),
        _search: nn(filters.search),
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}

export function useChapterList(subject?: string | null) {
  return useQuery({
    queryKey: ["questions", "chapters", nn(subject)] as const,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_chapters", { _subject: nn(subject) });
      if (error) throw error;
      return (data ?? []) as { chapter: string; question_count: number }[];
    },
  });
}

export function useTopicList(subject?: string | null, chapter?: string | null) {
  return useQuery({
    queryKey: ["questions", "topics", nn(subject), nn(chapter)] as const,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_topics", {
        _subject: nn(subject),
        _chapter: nn(chapter),
      });
      if (error) throw error;
      return (data ?? []) as { major_topic: string; question_count: number }[];
    },
  });
}

/** Random sample straight from the database — never loads the whole bank. */
export async function sampleQuestions(filters: QuestionFilters, limit: number) {
  const { data, error } = await supabase.rpc("sample_questions", {
    ...rpcArgs(filters),
    _limit: Math.max(1, Math.min(limit, 500)),
  });
  if (error) throw error;
  return (data ?? []) as unknown as Question[];
}

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

/** Chunked insert for very large imports, with progress + per-chunk error reporting. */
export async function insertQuestionsChunked(
  rows: QuestionInput[],
  onProgress: (inserted: number, total: number) => void,
  chunkSize = 200,
): Promise<{ inserted: number; failed: number; errors: string[] }> {
  let inserted = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("questions").insert(chunk as never);
    if (error) {
      failed += chunk.length;
      if (errors.length < 5) errors.push(`Rows ${i + 1}-${i + chunk.length}: ${error.message}`);
    } else {
      inserted += chunk.length;
    }
    onProgress(inserted + failed, rows.length);
  }
  return { inserted, failed, errors };
}
