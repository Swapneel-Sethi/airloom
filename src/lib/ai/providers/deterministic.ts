import type { CopilotContext } from "../context";
import type { ProviderResult } from "./base";
import { deterministicAnswer } from "../fallback";

const PROMPT_VERSION = "airloom-copilot-v1";

export class DeterministicProvider {
  readonly name = "deterministic";

  isAvailable(): boolean {
    return true;
  }

  async generate(question: string, context: CopilotContext): Promise<ProviderResult> {
    const answer = deterministicAnswer(question, context);

    return {
      answer,
      meta: {
        provider: "rules",
        model: null,
        fallbackReason: null,
        promptVersion: PROMPT_VERSION,
        latencyMs: 0,
      },
    };
  }
}
