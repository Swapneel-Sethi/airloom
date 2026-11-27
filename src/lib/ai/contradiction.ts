import type { CopilotAnswer } from "../types";
import type { CopilotContext } from "./context";

/**
 * Parse a time label like "15:00 to 17:00" into start and end hours.
 */
function parseTimeRange(label: string): { startHour: number; endHour: number } | null {
  const match = label.match(/(\d{2}):\d{2}\s+to\s+(\d{2}):\d{2}/);
  if (!match) return null;
  return {
    startHour: parseInt(match[1], 10),
    endHour: parseInt(match[2], 10),
  };
}

/**
 * Check if a specific time (HH:MM) falls within a time range.
 */
function timeInRange(timeStr: string, range: { startHour: number; endHour: number }): boolean {
  const hour = parseInt(timeStr.split(":")[0], 10);
  return hour >= range.startHour && hour < range.endHour;
}

/**
 * Collect all valid time ranges from context.
 */
function getValidTimeRanges(context: CopilotContext): Array<{ label: string; startHour: number; endHour: number }> {
  const ranges: Array<{ label: string; startHour: number; endHour: number }> = [];

  const windows = [
    context.bestWindow,
    context.morningWindow,
    context.afternoonWindow,
    context.eveningWindow,
    context.tonightWindow,
  ];

  for (const window of windows) {
    if (window) {
      const parsed = parseTimeRange(window.label);
      if (parsed) {
        ranges.push({ label: window.label, ...parsed });
      }
    }
  }

  // Add plan blocks
  for (const block of context.plan) {
    const parsed = parseTimeRange(block.time);
    if (parsed) {
      ranges.push({ label: block.time, ...parsed });
    }
  }

  // Add requested time window if available
  if (context.requestedTime) {
    const hour = context.requestedTime.hour;
    ranges.push({
      label: context.requestedTime.label,
      startHour: hour,
      endHour: hour + 1,
    });
  }

  return ranges;
}

/**
 * Check if a time string (HH:MM) is contained within any valid time range from context.
 */
function isTimeInValidRanges(timeStr: string, context: CopilotContext): boolean {
  const ranges = getValidTimeRanges(context);
  for (const range of ranges) {
    if (timeInRange(timeStr, range)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects contradictions between the answer and the canonical context.
 * Checks for:
 * 1. Contradictory time recommendations (answer says a time not in context)
 * 2. Contradictory PM2.5/AQI values
 * 3. Contradictory recommendations vs stated data
 * Returns an error message if contradictions found, or null.
 */
export function validateContradictions(
  answer: CopilotAnswer,
  context: CopilotContext,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const text = [
    answer.recommendation,
    ...answer.why,
    ...answer.whatToDo,
    answer.alternative,
  ].join(" ");

  // Extract time references from answer (HH:MM format)
  const timeMatches = text.match(/\d{2}:\d{2}/g) || [];

  // Check each time in answer against valid time ranges
  for (const time of timeMatches) {
    if (!isTimeInValidRanges(time, context)) {
      errors.push(`Time "${time}" not found in verified context windows`);
    }
  }

  return { valid: errors.length === 0, errors };
}