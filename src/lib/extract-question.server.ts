const SYSTEM_PROMPT = `You are an expert NEET (NTA) question digitiser.
You are given one or more images (photos, screenshots or rendered PDF pages) containing a single multiple-choice question.
Extract the content EXACTLY as written, converting any equations to readable plain text (e.g. "H2SO4", "v = u + at").
Return ONLY a JSON object, no markdown fences, with this shape:
{
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
}
Rules:
- Options 1,2,3,4 map to A,B,C,D in order.
- correct_option: use the answer marked/stated in the image; if none is shown, infer the correct answer yourself.
- explanation: use the explanation in the image if present, otherwise write a concise 1-3 sentence solution.
- Never leave option fields empty; if an option is an image/diagram, describe it briefly.`;

export interface ExtractedQuestion {
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

export async function extractFromImages(images: string[]): Promise<ExtractedQuestion> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the NEET question from these images." },
            ...images.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up to continue.");
  if (!res.ok) throw new Error(`AI extraction failed (${res.status}).`);

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Could not read a question from that file.");

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<ExtractedQuestion>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const correct = Number(parsed.correct_option);

  return {
    question_text: str(parsed.question_text),
    option_a: str(parsed.option_a),
    option_b: str(parsed.option_b),
    option_c: str(parsed.option_c),
    option_d: str(parsed.option_d),
    correct_option: correct >= 1 && correct <= 4 ? ((correct as 1 | 2 | 3 | 4)) : null,
    explanation: str(parsed.explanation),
    subject: str(parsed.subject) || null,
    chapter: str(parsed.chapter),
    major_topic: str(parsed.major_topic),
    difficulty: str(parsed.difficulty) || null,
    is_pyq: Boolean(parsed.is_pyq),
  };
}
