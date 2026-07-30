import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractManyFromImages } from "./bulk-extract.server";

const inputSchema = z.object({
  images: z
    .array(z.string().min(20).max(8_000_000))
    .min(1, "Upload a PDF first")
    .max(4, "Send up to 4 pages per batch"),
});

export const extractQuestionBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => extractManyFromImages(data.images));
