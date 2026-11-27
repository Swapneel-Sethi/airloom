import type { CopilotContext } from "../context";
import type { CopilotAnswer } from "../../types";
import { NemotronProvider } from "./nemotron";
import { GeminiProvider } from "./gemini";
import { DeterministicProvider } from "./deterministic";
import { validateNumberGrounding } from "../grounding";
import { validateContradictions } from "../contradiction";
import { isAcuteHealthScenario } from "../fallback";

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

export class ProviderRegistry {
  private providers: ProviderEntry[] = [];

  constructor() {
    // Register providers in priority order: Nemotron -> Gemini -> Deterministic
    this.providers.push({
      name: "nemotron",
      provider: new NemotronProvider(process.env.NVIDIA_API_KEY),
    });
    this.providers.push({
      name: "gemini",
      provider: new GeminiProvider(process.env.GEMINI_API_KEY),
    });
    this.providers.push({
      name: "deterministic",
      provider: new DeterministicProvider(),
    });
  }

  async generate(options: ProviderPipelineOptions): Promise<ProviderPipelineResult> {
    const { question, context } = options;

    // NON NEGOTIABLE: acute health safety runs before any model
    if (isAcuteHealthScenario(question)) {
      return {
        answer: await this.generateDeterministic(question, context),
        provider: "rules",
        fallbackReason: "safety-gate",
        grounded: true,
        validated: true,
      };
    }

    // Try each provider in priority order
    for (const { provider } of this.providers) {
      try {
        console.log(`Provider ${provider.name}: apiKey set = ${provider.isAvailable()}`);
        const result = await provider.generate(question, context);

        // Validate the result
        const validation = await this.validateResult(result.answer, context);

        if (validation.valid) {
          return {
            answer: result.answer,
            provider: result.meta.provider,
            fallbackReason: null,
            grounded: validation.valid,
            validated: validation.valid,
          };
        }

        // Validation failed - try next provider
        console.warn(`Provider ${result.meta.provider} failed validation: ${validation.errors.join(", ")}`);
      } catch (error) {
        // Provider failed completely - try next provider
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Provider ${provider.name} failed: ${errorMsg}`);
        console.warn(`Provider ${provider.name} isAvailable: ${provider.isAvailable()}`);
        continue;
      }
    }

    // All providers failed - return deterministic fallback
    const fallbackAnswer = await this.generateDeterministic(question, context);
    return {
      answer: fallbackAnswer,
      provider: "rules",
      fallbackReason: "all-providers-failed",
      grounded: true,
      validated: true,
    };
  }

  private async generateDeterministic(
    question: string,
    context: CopilotContext,
  ): Promise<CopilotAnswer> {
    const { deterministicAnswer } = await import("../fallback");
    return deterministicAnswer(question, context);
  }

  private async validateResult(
    answer: CopilotAnswer,
    context: CopilotContext,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Schema validation - ensure answer has required fields
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

    // Grounding validation
    const groundingResult = validateNumberGrounding(answer, JSON.stringify(context));
    if (!groundingResult.valid) {
      errors.push(...groundingResult.errors);
    }

    // Contradiction validation
    const contradictionResult = validateContradictions(answer, context);
    if (!contradictionResult.valid) {
      errors.push(...contradictionResult.errors);
    }

    return { valid: errors.length === 0, errors };
  }
}
