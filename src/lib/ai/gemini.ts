import { copilotAnswerSchema, geminiResponseSchema } from "./schema";
import type { CopilotAnswer, CopilotMeta } from "../types";

export const PROMPT_VERSION = "airloom-copilot-v1";
const DEFAULT_MODEL = "gemini-2.5-flash";

export class AiError extends Error {
  code: "missing-key" | "timeout" | "provider-error" | "invalid-output" | "blocked";

  constructor(code: AiError["code"], message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

const SYSTEM_INSTRUCTION = `You are the Airloom air quality copilot. Airloom turns air quality data into decisions for households in polluted cities.

Rules:
1. Use only the verified context supplied in the user message. Never invent a number, source, location, forecast, or health claim.
2. Every number you cite must appear in the context. Do not calculate new AQI values or new emission values.
3. Never diagnose, never say a person is safe or protected, and never promise a health outcome. Use "may reduce exposure", "consider", "lower exposure option", "based on current data".
4. Prefer concrete times, modes, and actions from the context over general advice.
5. If the context lacks something the question needs, say so plainly and offer the closest useful action.
6. Answer in the language the user wrote in.
7. Keep recommendation to 1 or 3 sentences. why and whatToDo hold 2 or 3 short items each. alternative is one realistic option.
8. dataUsed lists the context fields you actually used, as short labels.
9. safetyNote is null unless the question mentions symptoms, medication, pregnancy, a heart or lung condition, or a child's health. Then give one calm line that Airloom is not a medical service and a qualified professional should be consulted.
10. Return JSON only, matching the response schema.
11. Answer the user's actual question directly. Do not substitute a generic daily plan recommendation for a specific question about an activity, time, person, or comparison. When the user asks about a particular activity, person, time, or comparison, answer that request directly using the supplied context.`;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

export async function generateWithGemini(
  question: string,
  contextJson: string,
): Promise<{ answer: CopilotAnswer; meta: CopilotMeta }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("missing-key", "No Gemini API key configured");

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const attempt = async (
    correction?: string,
  ): Promise<{ answer: CopilotAnswer; meta: CopilotMeta }> => {
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: correction
                    ? `${SYSTEM_INSTRUCTION}\n\nCorrection: ${correction}`
                    : SYSTEM_INSTRUCTION,
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Question: ${question}\n\nVerified context (JSON):\n${contextJson}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 1100,
              responseMimeType: "application/json",
              responseSchema: geminiResponseSchema,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(22000),
          cache: "no-store",
        },
      );
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new AiError(
        timedOut ? "timeout" : "provider-error",
        timedOut ? "Gemini request timed out" : "Gemini request failed",
      );
    }

    if (!response.ok) {
      throw new AiError("provider-error", `Gemini returned status ${response.status}`);
    }

    const data = (await response.json()) as GeminiResponse;
    if (data.promptFeedback?.blockReason) {
      throw new AiError("blocked", "Gemini blocked the request");
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) throw new AiError("invalid-output", "Gemini returned an empty response");

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new AiError("invalid-output", "Gemini response was not JSON");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch {
      throw new AiError("invalid-output", "Gemini response could not be parsed");
    }

    const validated = copilotAnswerSchema.safeParse(parsed);
    if (!validated.success) {
      throw new AiError(
        "invalid-output",
        `Gemini response did not match schema: ${validated.error.issues.map((i) => i.path.join(".")).join(", ")}`,
      );
    }

    // Number grounding: every numeric claim must exist in verified context.
    const groundingError = checkNumberGrounding(validated.data, contextJson);
    if (groundingError) {
      throw new AiError("invalid-output", groundingError);
    }

    return {
      answer: validated.data,
      meta: {
        provider: "gemini",
        model,
        fallbackReason: null,
        promptVersion: PROMPT_VERSION,
        latencyMs: Date.now() - startedAt,
      },
    };
  };

  try {
    return await attempt();
  } catch (error) {
    if (error instanceof AiError && (error.code === "invalid-output" || error.code === "provider-error")) {
      // Retry once with a concise correction instruction
      try {
        return await attempt(
          error.code === "invalid-output"
            ? "Your previous response did not match the required JSON schema or contained numbers not present in the verified context. Return only valid JSON matching the schema exactly, and cite only numbers from the context."
            : "The previous request failed. Please retry with the same structured JSON output.",
        );
      } catch (retryError) {
        // Second attempt failed; fall through to caller for deterministic fallback
        throw retryError;
      }
    }
    throw error;
  }
}

/**
 * Extracts numeric tokens from the answer and verifies each appears in the
 * verified context JSON (allowing formatting variants) or is a time range
 * derived from context. Returns an error message if grounding fails, or null.
 */
function checkNumberGrounding(answer: CopilotAnswer, contextJson: string): string | null {
  const text = [
    answer.recommendation,
    ...answer.why,
    ...answer.whatToDo,
    answer.alternative,
  ].join(" ");

  // All numbers present in the context (as JSON values)
  const contextNumbers = new Set<string>();
  const contextStr = JSON.stringify(contextJson);
  const contextNumMatches = contextStr.match(/-?\d+\.?\d*/g);
  if (contextNumMatches) {
    for (const m of contextNumMatches) {
      contextNumbers.add(m);
      // Also add rounded integer variant
      const asNum = Number(m);
      if (Number.isFinite(asNum)) {
        contextNumbers.add(Math.round(asNum).toString());
        contextNumbers.add(asNum.toFixed(1));
      }
    }
  }

  // Time ranges from context (e.g. "06:00 to 08:00", "14:00 to 16:00")
  const contextTimeRanges = new Set<string>();
  const timeRangeMatches = contextStr.match(/\d{2}:\d{2}/g);
  if (timeRangeMatches) {
    for (const m of timeRangeMatches) {
      contextTimeRanges.add(m);
    }
  }

  // Find all numbers in the answer text
  const answerNumMatches = text.match(/-?\d+\.?\d*/g);
  if (!answerNumMatches) return null;

  for (const match of answerNumMatches) {
    const num = Number(match);
    if (!Number.isFinite(num)) continue;

    // Skip common non-context numbers (percentages calculated by Gemini are OK if based on context)
    // But we must flag numbers that clearly don't come from context.
    const isInContext = contextNumbers.has(match) || contextNumbers.has(num.toString());
    const isTimeRange = contextTimeRanges.has(match);
    const isZero = num === 0;
    const isOne = num === 1;

    if (!isInContext && !isTimeRange && !isZero && !isOne) {
      return `Number ${match} not found in verified context`;
    }
  }

  return null;
}
