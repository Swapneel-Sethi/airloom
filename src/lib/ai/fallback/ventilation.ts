import type { CopilotAnswer } from "@/lib/types";
import type { CopilotContext } from "@/lib/ai/context";
import { formatNumber } from "@/lib/format";
import { baseDataUsed } from "./helpers";

export function ventilationAnswer(context: CopilotContext): CopilotAnswer {
  const indoor = context.indoor;
  const outdoor = indoor.outdoorPm25;
  const inside = indoor.estimatedPm25;
  if (outdoor === null) {
    return {
      recommendation: "Keep windows closed until a reading is available.",
      why: ["There is no PM2.5 value for this location right now."],
      whatToDo: ["Refresh the reading.", "Run the purifier if you have one."],
      alternative: "Brief ventilation after cooking only.",
      dataUsed: ["Provider status"],
      safetyNote: null,
    };
  }

  if (indoor.ventilationWindow) {
    return {
      recommendation: `Ventilate between ${indoor.ventilationWindow}.`,
      why: [
        `Outdoor PM2.5 is ${formatNumber(outdoor, 0)} µg/m³ now, and your indoor estimate is ${formatNumber(inside ?? 0, 0)} µg/m³.`,
        `The two hour average in ${indoor.ventilationWindow} is the lowest of the day.`,
      ],
      whatToDo: [
        "Open opposite windows for 10 to 20 minutes.",
        "Close them when the exchange is done.",
        "Run the purifier afterwards in the room you use.",
      ],
      alternative: "If you cook today, ventilate right after cooking instead.",
      dataUsed: [...baseDataUsed(context), "Indoor infiltration model"],
      safetyNote: null,
    };
  }

  return {
    recommendation: "Keep windows closed today.",
    why: [
      `Outdoor PM2.5 is ${formatNumber(outdoor, 0)} µg/m³.`,
      `The lowest two hour window is ${context.bestWindow?.label ?? "not available"} at ${formatNumber(context.bestWindow?.pm25 ?? outdoor, 0)} µg/m³, still above the 30 µg/m³ ventilation threshold.`,
      `With your setup the indoor estimate is ${formatNumber(inside ?? 0, 0)} µg/m³.`,
    ],
    whatToDo: [
      "Close windows and balcony doors before the evening peak.",
      "Run the purifier in the occupied room with the door closed.",
      "Use the kitchen extractor while cooking.",
    ],
    alternative: "Short ventilation after cooking, then close up again.",
    dataUsed: [...baseDataUsed(context), "Indoor infiltration model"],
    safetyNote: null,
  };
}