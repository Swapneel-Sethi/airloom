import type { CopilotAnswer } from "@/lib/types";
import type { CopilotContext } from "@/lib/ai/context";
import { formatNumber } from "@/lib/format";
import { pm25, householdPhrase, baseDataUsed } from "./helpers";

export function familyAnswer(context: CopilotContext): CopilotAnswer {
  const value = pm25(context);
  return {
    recommendation: `Set the household routine around the ${context.bestWindow?.label ?? "lowest"} window and keep indoor air filtered.`,
    why: [
      `PM2.5 is ${formatNumber(value ?? 0, 0)} µg/m³, with AQI ${context.aqi?.value ?? "unavailable"}.`,
      `Your household profile includes ${householdPhrase(context)}.`,
      `Airloom applies a ${context.profile.sensitivity} threshold because of the selected sensitivities.`,
    ],
    whatToDo: [
      context.bestWindow
        ? `Plan outdoor time between ${context.bestWindow.label}.`
        : "Keep outdoor time short today.",
      "Run the purifier in the room where the household spends the evening.",
      "Keep windows closed through the evening peak.",
    ],
    alternative: "A shorter outdoor session in the low window instead of a full outing.",
    dataUsed: [...baseDataUsed(context), "Household profile", "Indoor infiltration model"],
    safetyNote: null,
  };
}