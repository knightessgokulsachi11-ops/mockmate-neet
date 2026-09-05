import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveAnswers } from "./answer-ai.server";

const inputSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.number(),
        question_text: z.string().min(1),
        option_a: z.string(),
        option_b: z.string(),
        option_c: z.string(),
        option_d: z.string(),
      }),
    )
    .min(1)
    .max(20),
});

/** AI is used ONLY when the uploaded PDF contains no answer for the question. */
export const resolveMissingAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => resolveAnswers(data.questions));
