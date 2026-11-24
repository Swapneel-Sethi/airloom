import { buildDemoEnvironment } from "../demo";
import { fetchLiveEnvironment } from "../environment";
import { buildIndoorOutlook } from "../indoor";
import { buildPlan } from "../plan";
import { compareCommute } from "../commute";
import type {
  CommuteComparison,
  CopilotAnswer,
  CopilotMeta,
  Environment,
  IndoorOutlook,
  UserProfile,
} from "../types";
import { buildCopilotContext, type CopilotContext } from "./context";
import { deterministicAnswer } from "./fallback";
import { AiError, generateWithGemini, PROMPT_VERSION } from "./gemini";

export interface CopilotResult {
  answer: CopilotAnswer;
  meta: CopilotMeta;
  context: CopilotContext;
  environment: Environment;
}

export async function loadEnvironmentForProfile(
  profile: UserProfile,
): Promise<Environment> {
  if (profile.dataMode === "demo" || !profile.location) {
    return buildDemoEnvironment(profile.demoCity);
  }
  return fetchLiveEnvironment(profile.location);
}

export async function runCopilot(
  question: string,
  profile: UserProfile,
): Promise<CopilotResult> {
  const environment = await loadEnvironmentForProfile(profile);
  const plan = buildPlan(environment, profile);
  const indoor: IndoorOutlook = buildIndoorOutlook(environment, profile);
  const commute: CommuteComparison = compareCommute(
    environment,
    profile,
    Number(profile.commuteTime.slice(0, 2)),
  );
  const context = buildCopilotContext(environment, profile, plan, indoor, commute);

  const startedAt = Date.now();

  if (!process.env.GEMINI_API_KEY) {
    return {
      answer: deterministicAnswer(question, context),
      meta: {
        provider: "rules",
        model: null,
        fallbackReason: "no-key",
        promptVersion: PROMPT_VERSION,
        latencyMs: Date.now() - startedAt,
      },
      context,
      environment,
    };
  }

  try {
    const result = await generateWithGemini(question, JSON.stringify(context));
    return { ...result, context, environment };
  } catch (error) {
    const reason =
      error instanceof AiError ? error.code : "provider-error";
    return {
      answer: deterministicAnswer(question, context),
      meta: {
        provider: "rules",
        model: null,
        fallbackReason: reason,
        promptVersion: PROMPT_VERSION,
        latencyMs: Date.now() - startedAt,
      },
      context,
      environment,
    };
  }
}
