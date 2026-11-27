import type { CopilotAnswer } from "@/lib/types";
import type { CopilotContext } from "@/lib/ai/context";
import { formatNumber } from "@/lib/format";
import { pm25, baseDataUsed, getThreshold } from "./helpers";

export function bestTimeAnswer(context: CopilotContext): CopilotAnswer {
  const best = context.bestWindow;
  const value = pm25(context);
  if (!best || value === null) {
    return {
      recommendation: "Hold outdoor activity until a PM2.5 reading is available.",
      why: ["The provider did not return a usable PM2.5 value for this location."],
      whatToDo: ["Refresh the reading.", "Keep the session indoors for now."],
      alternative: "An indoor session at home with the room closed.",
      dataUsed: ["Location", "Provider status"],
      safetyNote: null,
    };
  }

  // Use canonical planning threshold from context
  const { value: threshold } = getThreshold(context);
  const recommended = value > threshold && best.pm25 < value * 0.85;
  return {
    recommendation: recommended
      ? `The best verified time to go outside is ${best.label}.`
      : `The lowest pollution window is ${best.label}, but current PM2.5 is already below the planning threshold.`,
    why: [
      `Current PM2.5 is ${formatNumber(value, 0)} µg/m³ with AQI ${context.aqi?.value ?? "unavailable"}.`,
      `The lowest two hour average is ${formatNumber(best.pm25, 0)} µg/m³ between ${best.label}.`,
      `Your household planning threshold is ${threshold} µg/m³.`,
    ],
    whatToDo: [
      recommended
        ? `Plan outdoor activity during ${best.label} for the lowest exposure.`
        : `Current conditions are acceptable; ${best.label} remains the optimal window.`,
      "Keep sessions short and choose routes away from main roads.",
    ],
    alternative: `If ${best.label} doesn't work, the next best window is ${context.morningWindow?.label ?? context.afternoonWindow?.label ?? "unavailable"}.`,
    dataUsed: [...baseDataUsed(context), "Household sensitivity", "Hourly PM2.5 forecast"],
    safetyNote: null,
  };
}