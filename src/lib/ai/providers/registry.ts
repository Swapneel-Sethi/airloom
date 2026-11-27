import type { CopilotContext } from "../context";
import type { CopilotAnswer } from "../../types";
import { NemotronProvider } from "./nemotron";
import { GeminiProvider } from "./gemini";
import { DeterministicProvider } from "./deterministic";
import { validateNumberGrounding } from "../grounding";
import { validateContradictions } from "../contradiction";
import { isAcuteHealthScenario } from "../fallback";
import { parseExplicitTime } from "../time-parser";

export interface ProviderPipelineOptions {
  question: string;
  context: CopilotContext;
}

export interface ProviderPipelineResult {
  answer: CopilotAnswer;
  provider: string;
  fallbackReason: string | null;
  grounded: boolean;
  validated: boolean;
}

type ProviderEntry = {
  name: string;
  provider: {
    generate: (question: string, context: CopilotContext) => Promise<{
      answer: CopilotAnswer;
      meta: { provider: string; model: string | null; fallbackReason: string | null; promptVersion: string; latencyMs: number };
    }>;
    isAvailable: () => boolean;
  };
};

export class ProfileRegistry {
  private profiles: ProviderEntry[] = [];

  constructor() {
    this.profiles.push({
      name: "nemotron",
      provider: new NemotronProvider(process.env.NVIDIA_API_KEY),
    });
    this.profiles.push({
      name: "gemini",
      provider: new GeminiProvider(process.env.GEMINI_API_KEY),
    });
    this.profiles.push({
      name: "deterministic",
      provider: new DeterministicProvider(),
    });
  }

  async generate(options: ProviderPipelineOptions): Promise<ProviderPipelineResult> {
    const { question, context } = options;

    if (isAcuteHealthScenario(question)) {
      const deterministicAnswer = await this.generateValidatedDeterministic(question, context);
      return {
        answer: deterministicAnswer,
        provider: "rules",
        fallbackReason: "safety-gate",
        grounded: true,
        validated: true,
      };
    }

    // Add requested time to context if user explicitly specified one
    const explicitTime = parseExplicitTime(question);
    const enhancedContext = explicitTime
      ? { ...context, requestedTime: explicitTime }
      : context;

    for (const entry of this.profiles) {
      try {
        const result = await entry.provider.generate(question, enhancedContext);
        const validation = await this.validateResult(result.answer, enhancedContext);

        if (validation.valid) {
          return {
            answer: result.answer,
            provider: result.meta.provider,
            fallbackReason: null,
            grounded: validation.valid,
            validated: validation.valid,
          };
        }

        console.warn(`Provider ${entry.name} failed validation: ${validation.errors.join(", ")}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Provider ${entry.name} failed: ${errorMsg}`);
        continue;
      }
    }

    // All providers failed - generate validated deterministic fallback
    const fallbackAnswer = await this.generateValidatedDeterministic(question, enhancedContext);
    return {
      answer: fallbackAnswer,
      provider: "rules",
      fallbackReason: "all-providers-failed",
      grounded: true,
      validated: true,
    };
  }

  private async generateValidatedDeterministic(
    question: string,
    context: CopilotContext,
  ): Promise<CopilotAnswer> {
    const { deterministicAnswer } = await import("../fallback");
    const answer = deterministicAnswer(question, context);

    // Validate the deterministic answer
    const validation = await this.validateResult(answer, context);
    if (validation.valid) {
      return answer;
    }

    // If deterministic answer fails validation, return minimal safe verified response
    console.warn(`Deterministic fallback failed validation: ${validation.errors.join(", ")}`);
    return this.minimalSafeAnswer(context);
  }

  private minimalSafeAnswer(context: CopilotContext): CopilotAnswer {
    const bestWindow = context.bestWindow;

    return {
      recommendation: "I cannot verify a reliable outdoor recommendation from the current forecast.",
      why: [
        "The assistant response did not pass data verification.",
        bestWindow
          ? `The lowest verified PM2.5 window is ${bestWindow.label} at ${bestWindow.pm25} µg/m³.`
          : "No verified forecast window is available.",
      ],
      whatToDo: [
        "Refresh the air quality data and try again.",
        "Use the Today tab to review the verified forecast windows.",
      ],
      alternative: "Keep outdoor time minimal until verified data is available.",
      dataUsed: ["Location", "Provider status", bestWindow ? "Hourly PM2.5 forecast" : "None"].filter(Boolean) as string[],
      safetyNote: null,
    };
  }

  private async validateResult(
    answer: CopilotAnswer,
    context: CopilotContext,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!answer.recommendation || answer.recommendation.trim().length === 0) {
      errors.push("Missing recommendation");
    }
    if (!answer.why || answer.why.length === 0) {
      errors.push("Missing why fields");
    }
    if (!answer.whatToDo || answer.whatToDo.length === 0) {
      errors.push("Missing whatToDo fields");
    }
    if (!answer.alternative || answer.alternative.trim().length === 0) {
      errors.push("Missing alternative");
    }
    if (!answer.dataUsed || answer.dataUsed.length === 0) {
      errors.push("Missing dataUsed fields");
    }

    const groundingResult = validateNumberGrounding(answer, JSON.stringify(context));
    if (!groundingResult.valid) {
      errors.push(...groundingResult.errors);
    }

    const contradictionResult = validateContradictions(answer, context);
    if (!contradictionResult.valid) {
      errors.push(...contradictionResult.errors);
    }

    return { valid: errors.length === 0, errors };
  }
}