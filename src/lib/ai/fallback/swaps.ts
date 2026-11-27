import type { CopilotAnswer } from "@/lib/types";
import type { CopilotContext } from "@/lib/ai/context";
import { formatNumber } from "@/lib/format";
import { baseDataUsed } from "./helpers";

export function swapsAnswer(context: CopilotContext): CopilotAnswer {
  const planned = context.exposure.plannedProxy;
  const baseline = context.exposure.currentRoutineProxy;
  const delta =
    planned !== null && baseline !== null && baseline > 0
      ? Math.round(((planned - baseline) / baseline) * 100)
      : null;

  return {
    recommendation:
      delta !== null && delta < 0
        ? `The timing change has the clearest effect today: ${Math.abs(delta)} percent lower exposure proxy for the same routine.`
        : "The strongest swap today is moving outdoor time into the low window.",
    why: [
      `Your current routine estimates ${formatNumber(baseline ?? 0, 0)} µg/m³·h.`,
      `The adjusted routine estimates ${formatNumber(planned ?? 0, 0)} µg/m³·h.`,
      "Mode and emission factors are planning estimates, not measured values.",
    ],
    whatToDo: [
      "Apply the timing change first. It needs no purchase and no new equipment.",
      "Move the shortest weekly car trip to transit next.",
      "Keep the change for the smog season, then review it.",
    ],
    alternative: "If timing cannot move, reduce the session length instead.",
    dataUsed: [...baseDataUsed(context), "Exposure proxy calculation", "Commute mode table"],
    safetyNote: null,
  };
}