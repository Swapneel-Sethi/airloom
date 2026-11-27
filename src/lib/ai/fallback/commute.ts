import type { CopilotAnswer } from "@/lib/types";
import type { CopilotContext } from "@/lib/ai/context";
import { formatNumber } from "@/lib/format";
import { baseDataUsed } from "./helpers";

export function commuteAnswer(context: CopilotContext): CopilotAnswer {
  const options = context.commute.options;
  const recommended = options.find((option) => option.recommended) ?? options[0];
  if (!recommended) {
    return {
      recommendation: "Add your transport options in settings to compare this trip.",
      why: ["No travel modes are selected in your profile."],
      whatToDo: ["Open settings.", "Select the modes you can realistically use."],
      alternative: "Remote work if your role allows it.",
      dataUsed: ["Profile"],
      safetyNote: null,
    };
  }

  return {
    recommendation: `Take ${recommended.mode.toLowerCase()} for the ${String(context.commute.departureHour)} trip.`,
    why: [
      `Ambient PM2.5 at that hour is ${formatNumber(context.commute.ambientPm25, 0)} µg/m³.`,
      `${recommended.mode} estimates ${formatNumber(recommended.exposureProxy, 0)} µg/m³·h over ${recommended.minutes} minutes for ${formatNumber(context.commute.distanceKm, 1)} km.`,
      `Estimated emissions for this trip are ${formatNumber(recommended.co2Kg, 2)} kg CO2.`,
    ],
    whatToDo: [
      `Leave at ${String(context.commute.departureHour)} if your schedule allows it.`,
      "Wait on the sheltered side of the stop rather than at the kerb.",
      "Keep the vehicle on recirculation if you travel by car.",
    ],
    alternative: context.bestWindow
      ? `Shift the trip toward ${context.bestWindow.label} if the meeting can move.`
      : "Remote work if your role allows it.",
    dataUsed: [...baseDataUsed(context), "Transport mode factor table", "Commute distance from profile"],
    safetyNote: null,
  };
}