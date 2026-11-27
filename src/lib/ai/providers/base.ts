import type { CopilotContext } from "../context";
import type { CopilotAnswer, CopilotMeta } from "../../types";

export type { CopilotContext };

export class AiError extends Error {
  code: "missing-key" | "timeout" | "provider-error" | "invalid-output" | "blocked";

  constructor(code: AiError["code"], message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export interface ProviderResult {
  answer: CopilotAnswer;
  meta: CopilotMeta;
}

export interface AssistantProvider {
  readonly name: string;
  generate(question: string, context: CopilotContext): Promise<ProviderResult>;
  isAvailable(): boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface GroundingResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ContradictionResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface SafetyResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface FinalResult {
  answer: CopilotAnswer;
  provider: string;
  fallbackReason: string | null;
  grounded: boolean;
  validated: boolean;
}

export interface ProviderPipelineOptions {
  question: string;
  context: CopilotContext;
  onProgress?: (stage: string, provider: string) => void;
}

export interface ProviderPipelineResult {
  answer: CopilotAnswer;
  provider: string;
  fallbackReason: string | null;
  grounded: boolean;
  validated: boolean;
}
