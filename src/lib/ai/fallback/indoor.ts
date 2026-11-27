import type { CopilotAnswer } from "@/lib/types";
import type { CopilotContext } from "@/lib/ai/context";
import { formatNumber } from "@/lib/format";
import { baseDataUsed } from "./helpers";

export function indoorAnswer(context: CopilotContext): CopilotAnswer {
  const actions = context.indoor.actions;
  return {
    recommendation:
      actions.length > 0
        ? actions[0]
        : "Keep the occupied room closed and filtered where possible.",
    why: [
      `Indoor PM2.5 is estimated at ${formatNumber(context.indoor.estimatedPm25 ?? 0, 0)} µg/m³ with your current setup.`,
      `Outdoor PM2.5 is ${formatNumber(context.indoor.outdoorPm25 ?? 0, 0)} µg/m³.`,
      context.indoor.ventilationWindow
        ? `The ventilation window is ${context.indoor.ventilationWindow}.`
        : "No two hour window today falls below the ventilation threshold.",
    ],
    whatToDo: actions.length > 0 ? actions.slice(0, 3) : ["Close windows.", "Filter the room you use."],
    alternative: "Move the household to the room furthest from the street for the evening.",
    dataUsed: [...baseDataUsed(context), "Indoor infiltration model", "Household ventilation setup"],
    safetyNote: null,
  };
}