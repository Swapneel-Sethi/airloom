import type { CopilotContext } from "../context";
import type { ProviderResult } from "./base";
import { copilotAnswerSchema } from "../schema";
import { AiError } from "./base";

const DEFAULT_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b";
const BASE_URL = "https://integrate.api.nvidia.com/v1";

// JSON Schema for structured output matching copilotAnswerSchema
const NEMOTRON_JSON_SCHEMA = {
  name: "airloom_copilot_answer",
  strict: true,
  schema: {
    type: "object",
    properties: {
      recommendation: { type: "string", minLength: 1, maxLength: 600 },
      why: {
        type: "array",
        items: { type: "string", minLength: 1, maxLength: 320 },
        minItems: 1,
        maxItems: 4,
      },
      whatToDo: {
        type: "array",
        items: { type: "string", minLength: 1, maxLength: 260 },
        minItems: 1,
        maxItems: 4,
      },
      alternative: { type: "string", minLength: 1, maxLength: 420 },
      dataUsed: {
        type: "array",
        items: { type: "string", minLength: 1, maxLength: 160 },
        maxItems: 6,
      },
      safetyNote: { type: ["string", "null"], maxLength: 420 },
    },
    required: [
      "recommendation",
      "why",
      "whatToDo",
      "alternative",
      "dataUsed",
      "safetyNote",
    ],
    additionalProperties: false,
  },
};

export class NemotronProvider {
  readonly name = "nemotron";

  constructor(private apiKey?: string) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(question: string, context: CopilotContext): Promise<ProviderResult> {
    if (!this.apiKey) {
      throw new AiError("missing-key", "No NVIDIA API key configured");
    }

    const model = process.env.NEMOTRON_MODEL || DEFAULT_MODEL;
    const startedAt = Date.now();

    const systemInstruction = `
You are the Airloom air quality copilot. Airloom turns air quality data into decisions for households in polluted cities.

You are the SEMANTIC REASONING layer. Your job is to:
1. Understand the user's question intent (activity, commute, indoor air, windows, family, swaps, general).
2. Understand the time context (now, morning, afternoon, evening, tonight, tomorrow).
3. Understand person context (me, child, kid, son, daughter, family).
4. Understand comparisons (transport modes, activities).
5. Answer the user's EXACT question directly using only the verified context supplied below.
6. Do NOT substitute a generic daily plan recommendation for a specific question.

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
11. Answer the user's actual question directly. Do not substitute a generic daily plan recommendation for a specific question about an activity, time, person, or comparison.
12. The planning threshold is provided in the context as "planningThreshold". Use this exact value. Do not compute or infer it.
13. Time windows are provided as "bestWindow", "morningWindow", "afternoonWindow", "eveningWindow", "tonightWindow". Use only these labels. Do not create new time windows.

CRITICAL: You must return valid JSON only. Do not include any markdown formatting, code blocks, or explanatory text outside the JSON.
`;

    const body = {
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: `Question: ${question}\n\nVerified context (JSON):\n${JSON.stringify(context)}` },
      ],
      temperature: 0.35,
      max_tokens: 1100,
      stream: false,
      // Structured output with JSON Schema
      response_format: {
        type: "json_schema",
        json_schema: NEMOTRON_JSON_SCHEMA,
      },
      // Disable reasoning for faster, structured responses
      reasoning_effort: "none",
    };

    let response: Response;
    try {
      // 9 second timeout for Nemotron
      response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(9000),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new AiError(
        timedOut ? "timeout" : "provider-error",
        timedOut ? "Nemotron request timed out" : "Nemotron request failed",
      );
    }

    if (!response.ok) {
      throw new AiError("provider-error", `Nemotron returned status ${response.status}`);
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new AiError("invalid-output", "Nemotron returned an empty response");
    }

    // With structured output, content should be valid JSON directly
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: try to extract JSON if NVIDIA returns plain text
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start === -1 || end === -1) {
        throw new AiError("invalid-output", "Nemotron response was not JSON");
      }
      try {
        parsed = JSON.parse(content.slice(start, end + 1));
      } catch {
        throw new AiError("invalid-output", "Nemotron response could not be parsed");
      }
    }

    const validated = copilotAnswerSchema.safeParse(parsed);
    if (!validated.success) {
      throw new AiError(
        "invalid-output",
        `Nemotron response did not match schema: ${validated.error.issues.map((i) => i.path.join(".")).join(", ")}`,
      );
    }

    return {
      answer: validated.data,
      meta: {
        provider: "nemotron",
        model,
        fallbackReason: null,
        promptVersion: PROMPT_VERSION,
        latencyMs: Date.now() - startedAt,
      },
    };
  }
}

export const PROMPT_VERSION = "airloom-copilot-v1";