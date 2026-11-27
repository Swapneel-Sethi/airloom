import type { CopilotContext } from "../context";
import type { ProviderResult } from "./base";
import { copilotAnswerSchema } from "../schema";

const DEFAULT_MODEL = "gemini-2.5-flash";

export class AiError extends Error {
  code: "missing-key" | "timeout" | "provider-error" | "invalid-output" | "blocked";

  constructor(code: AiError["code"], message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

interface GeminiContentPart {
  text?: string;
}

interface GeminiContent {
  parts?: Array<GeminiContentPart>;
}

interface GeminiCandidate {
  content?: GeminiContent;
}

interface GeminiResponseData {
  candidates?: Array<GeminiCandidate>;
  promptFeedback?: { blockReason?: string };
}

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

    const body = {
      model,
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
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(body),
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

    const data = (await response.json()) as GeminiResponseData;

    if (data.promptFeedback?.blockReason) {
      throw new AiError("blocked", "Gemini blocked the request");
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
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

    return {
      answer: validated.data,
      meta: {
        provider: "gemini",
        model,
        fallbackReason: null,
        promptVersion: "airloom-copilot-v1",
        latencyMs: Date.now() - Date.now(),
      },
    };
  }
}

export const PROMPT_VERSION = "airloom-copilot-v1";
