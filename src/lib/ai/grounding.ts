import type { CopilotAnswer } from "../types";
import type { CopilotContext } from "./context";

/**
 * Extract all numeric values from context using named fact paths.
 * Returns a Set of string representations of all verified numbers.
 */
function extractContextNumbers(context: CopilotContext): Set<string> {
  const numbers = new Set<string>();

  // Helper to add a number and its variants
  const addNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || !Number.isFinite(num)) return;
    numbers.add(num.toString());
    numbers.add(Math.round(num).toString());
    numbers.add(num.toFixed(1));
  };

  // Direct field access for named facts
  if (context.aqi) {
    addNumber(context.aqi.value);
  }

  for (const p of context.pollutants) {
    addNumber(p.value);
    addNumber(p.timesGuideline);
  }

  const windows = [
    context.bestWindow,
    context.worstWindow,
    context.morningWindow,
    context.afternoonWindow,
    context.eveningWindow,
    context.tonightWindow,
  ];

  for (const w of windows) {
    if (w) {
      addNumber(w.pm25);
      addNumber(w.aqi);
    }
  }

  if (context.dayAverages) {
    addNumber(context.dayAverages.averageAqi);
    addNumber(context.dayAverages.peakAqi);
  }

  if (context.indoor) {
    addNumber(context.indoor.outdoorPm25);
    addNumber(context.indoor.estimatedPm25);
  }

  if (context.commute) {
    addNumber(context.commute.ambientPm25);
    addNumber(context.commute.distanceKm);
    for (const opt of context.commute.options) {
      addNumber(opt.exposureProxy);
      addNumber(opt.co2Kg);
    }
  }

  if (context.exposure) {
    addNumber(context.exposure.plannedProxy);
    addNumber(context.exposure.currentRoutineProxy);
  }

  if (context.weather) {
    addNumber(context.weather.temperature);
    addNumber(context.weather.humidity);
    addNumber(context.weather.wind);
  }

  // Time values from context (HH:MM format) - extract from window labels
  const timeLabels = windows
    .filter(Boolean)
    .map((w) => w!.label);
  for (const label of timeLabels) {
    const times = label.match(/\d{2}:\d{2}/g);
    if (times) {
      for (const t of times) numbers.add(t);
    }
  }

  // Plan block times
  for (const block of context.plan) {
    const times = block.time.match(/\d{2}:\d{2}/g);
    if (times) {
      for (const t of times) numbers.add(t);
    }
  }

  return numbers;
}

/**
 * Validate that every numeric claim in the answer is grounded in verified context.
 * Uses named fact extraction as primary validation, with token scanning as secondary defense.
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

  // Parse context to extract named facts
  let context: CopilotContext;
  try {
    context = JSON.parse(contextJson);
  } catch {
    // Fallback to crude token scanning if context parsing fails
    return validateNumberGroundingFallback(answer, contextJson);
  }

  const contextNumbers = extractContextNumbers(context);

  // Also extract time values from context for time validation
  const contextTimes = new Set<string>();
  const timeMatches = contextJson.match(/\d{2}:\d{2}/g);
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
    if (match.endsWith("%")) continue;

    // Check against named facts (primary validation)
    const isInContext = contextNumbers.has(match) || contextNumbers.has(num.toString());
    const isTime = contextTimes.has(match);

    if (!isInContext && !isTime) {
      errors.push(`Number "${match}" not found in verified context`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Fallback grounding validator using crude token scanning.
 * Used when context parsing fails.
 */
function validateNumberGroundingFallback(
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

    // Skip percentage values
    if (match.endsWith("%")) continue;

    const isInContext = contextNumbers.has(match) || contextNumbers.has(num.toString());
    const isTime = contextTimes.has(match);

    if (!isInContext && !isTime) {
      errors.push(`Number "${match}" not found in verified context`);
    }
  }

  return { valid: errors.length === 0, errors };
}