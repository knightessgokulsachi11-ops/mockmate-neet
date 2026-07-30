import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractFromImages } from "./extract-question.server";

const inputSchema = z.object({
  images: z
    .array(z.string().min(20).max(8_000_000))
    .min(1, "Upload a file first")
    .max(4, "Too many pages — upload up to 4 pages"),
});

export const extractQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => extractFromImages(data.images));
