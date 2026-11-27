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
      addNumber(opt.minutes);        // ADDED: commute minutes
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

  // Commute departure hour (e.g., "14:00")
  if (context.commute?.departureHour) {
    numbers.add(context.commute.departureHour);
  }

  return numbers;
}

/**
 * Mask time expressions and unit labels in text to prevent their digits
 * from being validated as ordinary numeric claims.
 * Returns text with time expressions and unit labels replaced by placeholders.
 */
function maskTimeExpressions(text: string): string {
  // Match time formats:
  // - HH:MM (24-hour)
  // - H:MM (24-hour without leading zero)
  // - h:mm am/pm (12-hour)
  // - h am/pm (bare hour with meridiem)
  // - HH:MM to HH:MM (ranges)
  // - H:MM to H:MM (ranges)
  const timePatterns = [
    /\b\d{1,2}:\d{2}\s+(?:am|pm)\b/gi,      // 6:00 pm, 14:30 pm
    /\b\d{1,2}\s+(?:am|pm)\b/gi,             // 6 pm, 14 pm
    /\b\d{2}:\d{2}\s+to\s+\d{2}:\d{2}\b/g,   // 15:00 to 17:00
    /\b\d{1,2}:\d{2}\s+to\s+\d{1,2}:\d{2}\b/g, // 6:00 to 17:00
    /\b\d{2}:\d{2}\b/g,                       // 14:00, 15:00
    /\b\d{1,2}:\d{2}\b/g,                     // 6:00, 9:30
  ];

  // Unit labels and chemical formulas that contain numbers but aren't factual claims
  const unitPatterns = [
    /\bPM2\.5\b/gi,           // PM2.5 particle size
    /\bPM10\b/gi,             // PM10 particle size
    /\bCO2\b/gi,              // Carbon dioxide
    /\bCO₂\b/gi,              // Carbon dioxide (unicode subscript)
    /\bNO2\b/gi,              // Nitrogen dioxide
    /\bNO₂\b/gi,              // Nitrogen dioxide (unicode)
    /\bSO2\b/gi,              // Sulfur dioxide
    /\bSO₂\b/gi,              // Sulfur dioxide (unicode)
    /\bO3\b/gi,               // Ozone
    /\bO₃\b/gi,               // Ozone (unicode)
    /\bµg\/m³\b/g,            // Micrograms per cubic meter
    /\bug\/m3\b/gi,           // Micrograms per cubic meter (ASCII)
    /\bµg\/m3\b/gi,           // Mixed
    /\bmg\/m³\b/g,            // Milligrams per cubic meter
    /\bppm\b/gi,              // Parts per million
    /\bppb\b/gi,              // Parts per billion
  ];

  let masked = text;
  for (const pattern of timePatterns) {
    masked = masked.replace(pattern, "[TIME]");
  }
  for (const pattern of unitPatterns) {
    masked = masked.replace(pattern, "[UNIT]");
  }
  return masked;
}

/**
 * Extract numeric tokens from text using a regex that preserves decimals as single tokens.
 * Matches: -12.5, 12.5, 148.8, 0.35, 12, -5
 * Does NOT split 2.5 into 2 and 5.
 * Avoids the JavaScript regex bug where /-?\d+(?:\.\d+)?/g matches both "2.5" and "2".
 */
function extractNumbers(text: string): string[] {
  // Use explicit alternation: decimal OR integer (not optional group)
  // This avoids the g-flag backtracking bug
  const matches = text.match(/-?(?:\d+\.\d+|\d+)/g);
  return matches || [];
}

/**
 * Validate that every numeric claim in the answer is grounded in verified context.
 * Uses named fact extraction as primary validation, with token scanning as secondary defense.
 * Time expressions are validated separately by contradiction.ts.
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

  // STEP 1: Mask time expressions so their digits don't become numeric claims
  const maskedText = maskTimeExpressions(text);

  // STEP 2: Extract numbers from masked text (decimals preserved as single tokens)
  const answerNumMatches = extractNumbers(maskedText);
  if (!answerNumMatches || answerNumMatches.length === 0) return { valid: true, errors: [] };

  const errors: string[] = [];
  for (const match of answerNumMatches) {
    const num = Number(match);
    if (!Number.isFinite(num)) continue;

    // Skip common neutral numbers
    if (num === 0 || num === 1) continue;

    // Skip percentage values (they're derived, not direct context values)
    // Check original text for % suffix
    const hasPercentSuffix = text.includes(match + "%");
    if (hasPercentSuffix) continue;

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
  const contextNumMatches = contextStr.match(/-?(?:\d+\.\d+|\d+)/g); // Fixed regex
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

  // Mask time expressions before extracting numbers
  const maskedText = maskTimeExpressions(text);
  const answerNumMatches = extractNumbers(maskedText);
  if (!answerNumMatches) return { valid: true, errors: [] };

  const errors: string[] = [];
  for (const match of answerNumMatches) {
    const num = Number(match);
    if (!Number.isFinite(num)) continue;

    // Skip common neutral numbers
    if (num === 0 || num === 1) continue;

    // Skip percentage values
    const hasPercentSuffix = text.includes(match + "%");
    if (hasPercentSuffix) continue;

    const isInContext = contextNumbers.has(match) || contextNumbers.has(num.toString());
    const isTime = contextTimes.has(match);

    if (!isInContext && !isTime) {
      errors.push(`Number "${match}" not found in verified context`);
    }
  }

  return { valid: errors.length === 0, errors };
}