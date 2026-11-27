import type { CopilotAnswer } from "../types";

/**
 * Extracts numeric tokens from the answer text and verifies each appears in the
 * verified context JSON (allowing formatting variants) or is a time range
 * derived from context. Returns an error message if grounding fails, or null.
 *
 * Validation rules:
 * 1. Every number in the answer must appear in the context OR be a formatting variant.
 * 2. Time values (HH:MM) must appear in the context.
 * 3. Zero and one are always allowed (common neutral values).
 * 4. AQI sub-index values from computeAqi are allowed since they're computed from PM2.5/PM10.
 */
export function validateNumberGrounding(
  answer: CopilotAnswer,
  contextJson: string,
): { valid: boolean; errors: string[] } {
  const text = [
    answer.recommendation,
    ...answer.why,
    ...answer.whatToDo,
    answer.alternative,
  ].join(" ");

  // All numbers present in the context (as JSON values)
  const contextNumbers = new Set<string>();
  const contextStr = JSON.stringify(contextJson);
  const contextNumMatches = contextStr.match(/-?\d+\.?\d*/g);
  if (contextNumMatches) {
    for (const m of contextNumMatches) {
      contextNumbers.add(m);
      const asNum = Number(m);
      if (Number.isFinite(asNum)) {
        contextNumbers.add(Math.round(asNum).toString());
        contextNumbers.add(asNum.toFixed(1));
      }
    }
  }

  // Time values from context (HH:MM format)
  const contextTimes = new Set<string>();
  const timeMatches = contextStr.match(/\d{2}:\d{2}/g);
  if (timeMatches) {
    for (const m of timeMatches) {
      contextTimes.add(m);
    }
  }

  // Find all numbers in the answer text
  const answerNumMatches = text.match(/-?\d+\.?\d*/g);
  if (!answerNumMatches) return { valid: true, errors: [] };

  const errors: string[] = [];
  for (const match of answerNumMatches) {
    const num = Number(match);
    if (!Number.isFinite(num)) continue;

    // Skip common neutral numbers
    if (num === 0 || num === 1) continue;

    // Skip percentage values (they're derived, not direct context values)
    // These are calculated by the model from context values
    if (match.endsWith("%")) continue;

    const isInContext = contextNumbers.has(match) || contextNumbers.has(num.toString());
    const isTime = contextTimes.has(match);

    if (!isInContext && !isTime) {
      errors.push(`Number "${match}" not found in verified context`);
    }
  }

  return { valid: errors.length === 0, errors };
}
