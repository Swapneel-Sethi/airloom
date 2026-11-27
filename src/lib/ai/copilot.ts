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
import { ProfileRegistry } from "./providers/registry";

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

  const registry = new ProfileRegistry();
  const result = await registry.generate({
    question,
    context,
  });

  return {
    answer: result.answer,
    meta: {
      provider: result.provider as "gemini" | "rules" | "nemotron",
      model: null,
      fallbackReason: result.fallbackReason,
      promptVersion: "airloom-copilot-v1",
      latencyMs: Date.now() - startedAt,
    },
    context,
    environment,
  };
}
