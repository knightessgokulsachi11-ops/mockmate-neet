/** AI is used ONLY to determine a correct answer that the PDF does not contain. */

export interface AnswerAskItem {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

export interface AnswerAiResult {
  id: number;
  correct_option: 1 | 2 | 3 | 4 | null;
  explanation: string;
}

const SYSTEM_PROMPT = `You are a NEET (Physics, Chemistry, Biology) subject expert.
For each multiple-choice question you are given, decide which option (1, 2, 3 or 4) is correct.
Return ONLY JSON, no markdown fences:
{ "answers": [ { "id": number, "correct_option": 1|2|3|4|null, "explanation": string } ] }
Rules:
- correct_option must be null when you cannot determine the answer with confidence. Never guess.
- explanation: 1-3 concise sentences justifying the chosen option.`;

export async function resolveAnswers(items: AnswerAskItem[]): Promise<AnswerAiResult[]> {
  if (!items.length) return [];
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const body = JSON.stringify({
    model: "google/gemini-3.7-flash",
    max_tokens: 16000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ questions: items }) },
    ],
  });

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body,
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      await new Promise((r) => setTimeout(r, Math.max(retryAfter * 1000, 1500 * (attempt + 1))));
      continue;
    }
    break;
  }
  if (!res) throw new Error("AI request failed.");
  if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up to continue.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}).`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return [];

  let parsed: { answers?: unknown };
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1)) as { answers?: unknown };
  } catch {
    return [];
  }
  const list = Array.isArray(parsed.answers) ? parsed.answers : [];
  return list
    .map((item) => {
      const a = item as { id?: unknown; correct_option?: unknown; explanation?: unknown };
      const n = Number(a.correct_option);
      return {
        id: Number(a.id),
        correct_option: n >= 1 && n <= 4 ? ((n as 1 | 2 | 3 | 4)) : null,
        explanation: typeof a.explanation === "string" ? a.explanation.trim() : "",
      };
    })
    .filter((a) => Number.isFinite(a.id));
}
