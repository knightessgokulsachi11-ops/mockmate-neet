const SYSTEM_PROMPT = `You are an expert NEET (NTA) question paper digitiser.
You are given rendered page images of a NEET question paper (and possibly its answer key / solutions).
Extract EVERY complete multiple-choice question visible on these pages.
Convert equations to readable plain text (e.g. "H2SO4", "v = u + at").
Return ONLY a JSON object, no markdown fences, with this shape:
{ "questions": [ {
  "question_text": string,
  "option_a": string,
  "option_b": string,
  "option_c": string,
  "option_d": string,
  "correct_option": 1 | 2 | 3 | 4 | null,
  "explanation": string,
  "subject": "Physics" | "Chemistry" | "Botany" | "Zoology" | null,
  "chapter": string,
  "major_topic": string,
  "difficulty": "Easy" | "Medium" | "Hard" | null,
  "is_pyq": boolean
} ] }
Rules:
- Options 1,2,3,4 map to A,B,C,D in order.
- Skip incomplete questions that are cut off across the page edge.
- correct_option: use the marked/stated answer; otherwise infer it.
- explanation: use the printed solution if present, else write a concise 1-3 sentence solution.
- Never leave option fields empty; describe diagrams briefly if an option is an image.
- Return an empty array if the pages contain no questions.`;

export interface BulkExtractedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 1 | 2 | 3 | 4 | null;
  explanation: string;
  subject: string | null;
  chapter: string;
  major_topic: string;
  difficulty: string | null;
  is_pyq: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function extractManyFromImages(images: string[]): Promise<BulkExtractedQuestion[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract every NEET question from these paper pages." },
            ...images.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up to continue.");
  if (!res.ok) throw new Error(`AI extraction failed (${res.status}).`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return [];

  let parsed: { questions?: unknown };
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1)) as { questions?: unknown };
  } catch {
    return [];
  }
  const list = Array.isArray(parsed.questions) ? parsed.questions : [];

  return list
    .map((item) => {
      const q = item as Partial<BulkExtractedQuestion>;
      const correct = Number(q.correct_option);
      return {
        question_text: str(q.question_text),
        option_a: str(q.option_a),
        option_b: str(q.option_b),
        option_c: str(q.option_c),
        option_d: str(q.option_d),
        correct_option: correct >= 1 && correct <= 4 ? ((correct as 1 | 2 | 3 | 4)) : null,
        explanation: str(q.explanation),
        subject: str(q.subject) || null,
        chapter: str(q.chapter),
        major_topic: str(q.major_topic),
        difficulty: str(q.difficulty) || null,
        is_pyq: Boolean(q.is_pyq),
      };
    })
    .filter((q) => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d);
}
