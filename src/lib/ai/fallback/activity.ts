import type { CopilotAnswer } from "@/lib/types";
import type { CopilotContext } from "@/lib/ai/context";
import { formatNumber } from "@/lib/format";
import { parseExplicitTime, evaluateRequestedOutdoorTime } from "../time-parser";
import { pm25, baseDataUsed, getThreshold } from "./helpers";

export function activityAnswer(context: CopilotContext): CopilotAnswer {
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

  const { value: threshold } = getThreshold(context);
  const recommended = value > threshold && best.pm25 < value * 0.85;
  return {
    recommendation: recommended
      ? `Move the outdoor session to ${best.label}.`
      : `Keep the session at ${context.profile.activityTime}, but keep it short.`,
    why: [
      `PM2.5 is ${formatNumber(value, 0)} µg/m³ now, with AQI ${context.aqi?.value ?? "unavailable"}.`,
      `The lowest two hour average is ${formatNumber(best.pm25, 0)} µg/m³ between ${best.label}.`,
      `Your household sensitivity is set to ${context.profile.sensitivity}, so the planning threshold is ${threshold} µg/m³.`,
    ],
    whatToDo: [
      recommended
        ? `Move the session to ${best.label} instead of cancelling it.`
        : "Keep the session short and use the lowest verified window.",
      "Warm up indoors and skip the cooldown walk outdoors.",
      "Choose a route away from the main road if one is available.",
    ],
    alternative: `A shorter loop in ${best.label}, or the same session indoors.`,
    dataUsed: [...baseDataUsed(context), "Household sensitivity"],
    safetyNote: null,
  };
}

export function outdoorActivityAnswer(context: CopilotContext, question: string): CopilotAnswer {
  const normalized = question.toLowerCase();
  const best = context.bestWindow;
  const evening = context.eveningWindow;
  const afternoon = context.afternoonWindow;
  const morning = context.morningWindow;
  const tonight = context.tonightWindow;

  // Check for explicit clock time (e.g., "6 pm", "18:00", "at 6")
  const explicitTime = parseExplicitTime(question);
  const mentionsChild = /\b(child|kid|son|daughter|baby|toddler|infant)\b/.test(normalized);
  const { value: threshold, basis: thresholdBasis } = getThreshold(context);

  const personPhrase = mentionsChild ? "your child" : "you";
  const activityPhrase = normalized.includes("cycle") ? "cycling" :
    normalized.includes("walk") ? "walking" :
    normalized.includes("run") ? "running" :
    normalized.includes("play") ? "playing outside" :
    "outdoor activity";

  // If user explicitly asked about a specific time, evaluate THAT time
  if (explicitTime) {
    const evaluation = evaluateRequestedOutdoorTime(
      explicitTime.hour,
      explicitTime.minute,
      context
    );

    const requestedPm25 = evaluation.requestedPm25;
    const requestedAqi = evaluation.requestedAqi;
    const requestedTimeLabel = evaluation.requestedTimeLabel;

    if (requestedPm25 === null) {
      return {
        recommendation: `Cannot verify PM2.5 for ${requestedTimeLabel}. Hold outdoor activity until a reading is available.`,
        why: [
          `No forecast data available for ${requestedTimeLabel}.`,
          `The lowest verified window is ${best?.label ?? "unavailable"} at ${best ? formatNumber(best.pm25, 0) : "unknown"} µg/m³.`,
        ],
        whatToDo: [
          "Refresh the air quality data.",
          "Keep the session indoors for now.",
        ],
        alternative: best
          ? `Consider ${activityPhrase} ${best.label} instead (PM2.5: ${formatNumber(best.pm25, 0)} µg/m³).`
          : "Consider an indoor session instead.",
        dataUsed: [...baseDataUsed(context), "Household sensitivity", "Hourly PM2.5 forecast"],
        safetyNote: null,
      };
    }

    const recommended = requestedPm25 < threshold;

    return {
      recommendation: recommended
        ? `${personPhrase.charAt(0).toUpperCase() + personPhrase.slice(1)} can ${activityPhrase} at ${requestedTimeLabel}.`
        : `Consider keeping ${personPhrase} indoors at ${requestedTimeLabel}.`,
      why: [
        `PM2.5 is ${formatNumber(requestedPm25, 0)} µg/m³ at ${requestedTimeLabel}, with AQI ${requestedAqi}.`,
        `The planning threshold is ${threshold} µg/m³ (${thresholdBasis}).`,
        best && best.label !== evaluation.eveningWindow?.label
          ? `The cleaner verified window is ${best.label} (PM2.5: ${formatNumber(best.pm25, 0)} µg/m³).`
          : "",
      ].filter(Boolean),
      whatToDo: recommended
        ? [
            `Go ahead with ${activityPhrase} at ${requestedTimeLabel}, but keep an eye on changing conditions.`,
            "Warm up indoors and skip the outdoor cooldown.",
          ]
        : [
            `Consider shifting ${activityPhrase} to a cleaner window.`,
            "Keep the session short if you do go out.",
            best ? `The lowest PM2.5 window is ${best.label}.` : "",
          ].filter(Boolean),
      alternative: best && best.label !== evaluation.eveningWindow?.label
        ? `Consider ${activityPhrase} ${best.label} instead (PM2.5: ${formatNumber(best.pm25, 0)} µg/m³).`
        : "Consider an indoor session instead.",
      dataUsed: [...baseDataUsed(context), "Household sensitivity", "Hourly PM2.5 forecast"],
      safetyNote: null,
    };
  }

  // Fall back to time window keywords (morning, afternoon, evening, tonight)
  let timeWindow: { label: string; pm25: number; aqi: number } | null = null;
  let timeLabel = "";
  if (normalized.includes("evening")) {
    timeWindow = evening;
    timeLabel = "evening";
  } else if (normalized.includes("tonight")) {
    timeWindow = tonight;
    timeLabel = "tonight";
  } else if (normalized.includes("morning")) {
    timeWindow = morning;
    timeLabel = "morning";
  } else if (normalized.includes("afternoon")) {
    timeWindow = afternoon;
    timeLabel = "afternoon";
  } else {
    timeWindow = best;
    timeLabel = best?.label ?? "lowest";
  }

  if (!timeWindow || timeWindow.pm25 === null) {
    return {
      recommendation: "Hold outdoor activity until a PM2.5 reading is available.",
      why: ["The provider did not return a usable PM2.5 value for this location."],
      whatToDo: ["Refresh the reading.", "Keep the session indoors for now."],
      alternative: "An indoor session at home with the room closed.",
      dataUsed: ["Location", "Provider status"],
      safetyNote: null,
    };
  }

  const pm25Value = timeWindow.pm25;
  const recommended = pm25Value < threshold;

  return {
    recommendation: recommended
      ? `${personPhrase.charAt(0).toUpperCase() + personPhrase.slice(1)} can ${activityPhrase} ${timeLabel}.`
      : `Consider keeping ${personPhrase} indoors ${timeLabel}.`,
    why: [
      `PM2.5 is ${formatNumber(pm25Value, 0)} µg/m³ ${timeLabel}, with AQI ${timeWindow.aqi}.`,
      `The planning threshold is ${threshold} µg/m³ (${thresholdBasis}).`,
    ],
    whatToDo: recommended
      ? [
          `Go ahead with ${activityPhrase} ${timeLabel}, but keep an eye on changing conditions.`,
          "Warm up indoors and skip the outdoor cooldown.",
        ]
      : [
          `Consider shifting ${activityPhrase} to a cleaner window.`,
          "Keep the session short if you do go out.",
        ],
    alternative: best && best.label !== timeWindow.label
      ? `Consider ${activityPhrase} ${best.label} instead (PM2.5: ${formatNumber(best.pm25, 0)} µg/m³).`
      : "Consider an indoor session instead.",
    dataUsed: [...baseDataUsed(context), "Household sensitivity", "Hourly PM2.5 forecast"],
    safetyNote: null,
  };
}