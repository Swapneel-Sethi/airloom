import type { CopilotAnswer } from "@/lib/types";
import type { CopilotContext } from "@/lib/ai/context";
import { formatNumber } from "@/lib/format";
import { pm25, baseDataUsed } from "./helpers";

export function genericAnswer(context: CopilotContext): CopilotAnswer {
  const value = pm25(context);
  const top = context.plan[0];
  return {
    recommendation:
      top?.action ??
      `Keep outdoor time inside the ${context.bestWindow?.label ?? "lowest"} window.`,
    why: [
      `AQI is ${context.aqi?.value ?? "unavailable"} (${context.aqi?.category ?? "unavailable"}), driven by ${context.aqi?.dominant ?? "PM2.5"}.`,
      `PM2.5 is ${formatNumber(value ?? 0, 0)} µg/m³.`,
      context.bestWindow
        ? `The lowest two hour window is ${context.bestWindow.label} at ${formatNumber(context.bestWindow.pm25, 0)} µg/m³.`
        : "No forecast window is available for today.",
    ],
    whatToDo: [
      top?.action ?? "Keep windows closed through the peak.",
      context.indoor.ventilationWindow
        ? `Ventilate between ${context.indoor.ventilationWindow}.`
        : "Keep windows closed and filter the occupied room.",
      "Check the Today tab for the full block by block plan.",
    ],
    alternative: context.bestWindow
      ? `Shift outdoor errands into ${context.bestWindow.label}.`
      : "Keep errands indoors where possible.",
    dataUsed: baseDataUsed(context),
    safetyNote: null,
  };
}