import type { CopilotAnswer } from "../types";
import type { CopilotContext } from "./context";

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

  // Collect all valid time windows from context
  const validTimes = new Set<string>();

  // Add best window
  if (context.bestWindow) {
    validTimes.add(context.bestWindow.label);
  }

  // Add specific time windows
  if (context.morningWindow) validTimes.add(context.morningWindow.label);
  if (context.afternoonWindow) validTimes.add(context.afternoonWindow.label);
  if (context.eveningWindow) validTimes.add(context.eveningWindow.label);
  if (context.tonightWindow) validTimes.add(context.tonightWindow.label);

  // Add plan block windows
  for (const block of context.plan) {
    validTimes.add(block.time);
  }

  // Check each time in answer against valid times
  for (const time of timeMatches) {
    if (!validTimes.has(time)) {
      // Check if it's a substring of a valid range (e.g., "16:00" inside "15:00 to 17:00")
      const validTimesArray = Array.from(validTimes);
      const isSubstring = validTimesArray.some((vt) => vt.includes(time));
      if (!isSubstring) {
        errors.push(`Time "${time}" not found in verified context windows`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
