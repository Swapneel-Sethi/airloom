import type { CopilotContext } from "../context";
import type { ProviderResult } from "./base";
import { copilotAnswerSchema } from "../schema";
import { AiError } from "./base";
import { validateNumberGrounding } from "../grounding";

const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiProvider {
  readonly name = "gemini";

  constructor(private apiKey?: string) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(question: string, context: CopilotContext): Promise<ProviderResult> {
    if (!this.apiKey) {
      throw new AiError("missing-key", "No Gemini API key configured");
    }

    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const startedAt = Date.now();

    const systemInstruction = `You are the Airloom air quality copilot. Airloom turns air quality data into decisions for households in polluted cities.

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
11. Answer the user's actual question directly. Do not substitute a generic daily plan recommendation for a specific question about an activity, time, person, or comparison. When the user asks about a particular activity, person, time, or comparison, answer that request directly using the supplied context.

Named facts available in context:
- FACT: currentPm25 (current PM2.5 value)
- FACT: currentAqi (current AQI value)
- FACT: bestWindow (lowest PM2.5 window with label, pm25, aqi)
- FACT: eveningWindow (evening window with label, pm25, aqi)
- FACT: morningWindow (morning window with label, pm25, aqi)
- FACT: afternoonWindow (afternoon window with label, pm25, aqi)
- FACT: tonightWindow (tonight window with label, pm25, aqi)
- FACT: requestedTimeWindow (if user asked about explicit time, contains pm25, aqi for that hour)
- FACT: profile.sensitivity (household sensitivity threshold)
- FACT: planningThreshold (canonical planning threshold: 30 for sensitive, 40 for standard)
`;

    const body = {
      model,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Question: ${question}\n\nVerified context (JSON):\n${JSON.stringify(context)}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1100,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recommendation: { type: "STRING" },
            why: { type: "ARRAY", items: { type: "STRING" } },
            whatToDo: { type: "ARRAY", items: { type: "STRING" } },
            alternative: { type: "STRING" },
            dataUsed: { type: "ARRAY", items: { type: "STRING" } },
            safetyNote: { type: "STRING", nullable: true },
          },
          required: [
            "recommendation",
            "why",
            "whatToDo",
            "alternative",
            "dataUsed",
            "safetyNote",
          ],
          propertyOrdering: [
            "recommendation",
            "why",
            "whatToDo",
            "alternative",
            "dataUsed",
            "safetyNote",
          ],
        },
      },
    };

    let response: Response;
    try {
      // 6 second timeout for Gemini
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(6000),
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

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };

    if (data.promptFeedback?.blockReason) {
      throw new AiError("blocked", "Gemini blocked the request");
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) throw new AiError("invalid-output", "Gemini returned an empty response");

    // With responseMimeType: application/json, text should be valid JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback: try to extract JSON
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1) {
        throw new AiError("invalid-output", "Gemini response was not JSON");
      }
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        throw new AiError("invalid-output", "Gemini response could not be parsed");
      }
    }

    const validated = copilotAnswerSchema.safeParse(parsed);
    if (!validated.success) {
      throw new AiError(
        "invalid-output",
        `Gemini response did not match schema: ${validated.error.issues.map((i) => i.path.join(".")).join(", ")}`,
      );
    }

    // Grounding validation - use shared validator
    const groundingResult = validateNumberGrounding(validated.data, JSON.stringify(context));
    if (!groundingResult.valid) {
      throw new AiError("invalid-output", groundingResult.errors.join(", "));
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
  }
}

export const PROMPT_VERSION = "airloom-copilot-v1";