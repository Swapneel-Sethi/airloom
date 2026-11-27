import type { CopilotContext } from "@/lib/ai/context";
import type { CopilotAnswer } from "@/lib/types";

import { isAcuteHealthScenario, acuteHealthAnswer, safetyNote } from "./safety";
import { parseExplicitTime } from "../time-parser";
import { activityAnswer, outdoorActivityAnswer } from "./activity";
import { ventilationAnswer } from "./ventilation";
import { commuteAnswer } from "./commute";
import { indoorAnswer } from "./indoor";
import { familyAnswer } from "./family";
import { swapsAnswer } from "./swaps";
import { bestTimeAnswer } from "./best-time";
import { genericAnswer } from "./generic";

const INTENT_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  handler: (context: CopilotContext) => CopilotAnswer;
}> = [
  { name: "purifier", pattern: /\b(purifier|filter|air cleaner|hepa)\b/, handler: indoorAnswer },
  { name: "indoor-windows", pattern: /\b(window|ventilate|open|fresh air|air out)\b/, handler: ventilationAnswer },
  { name: "commute", pattern: /\b(commute|travel|leave|office|work|bus|metro|train|cab|scooter|trip|ride|drive|transport|cycle|compare)\b/, handler: commuteAnswer },
  { name: "family", pattern: /\b(family|child|kid|school|parent|mother|baby|infant|toddler|older adult|elderly|grandparent)\b/, handler: familyAnswer },
  // Best time queries - highest priority for general outdoor timing questions
  { name: "best-time", pattern: /\b(best time|safest time|lowest pollution|when should i go|when can i go|when to go)\b/, handler: bestTimeAnswer },
  { name: "activity", pattern: /\b(run|jog|exercise|walk|walking|cycle|cycling|gym|cricket|sport|session|workout|play|playing|outside|outdoor)\b/, handler: activityAnswer },
  { name: "swaps", pattern: /\b(swap|swaps|sustain|carbon|co2|emission|impact|change mode|reduce emission)\b/, handler: swapsAnswer },
];

interface IntentMatch {
  intent: string | null;
  hasChild: boolean;
  hasActivity: boolean;
  hasTime: boolean;
  hasExplicitTime: boolean;
  requestedHour: number | null;
  requestedMinute: number | null;
}

export function matchIntent(normalized: string): IntentMatch {
  const hasChild = /\b(child|kid|kids|son|daughter|baby|toddler|infant)\b/.test(normalized);
  const hasActivity = /\b(run|jog|exercise|walk|walking|cycl|gym|cricket|sport|session|workout|play|playing|outside|outdoor)\b/.test(normalized);
  const hasTime = /\b(morning|afternoon|evening|tonight|night)\b/.test(normalized);

  // Check for explicit clock time
  const explicitTime = parseExplicitTime(normalized);
  const hasExplicitTime = explicitTime !== null;

  // Explicit time + activity → outdoor activity (highest priority)
  if (hasExplicitTime && hasActivity) {
    return {
      intent: "outdoor-activity",
      hasChild,
      hasActivity,
      hasTime: true,
      hasExplicitTime: true,
      requestedHour: explicitTime.hour,
      requestedMinute: explicitTime.minute,
    };
  }

  // Child + activity + time → outdoor activity (beats family)
  if (hasChild && hasActivity && hasTime) {
    return { intent: "outdoor-activity", hasChild, hasActivity, hasTime, hasExplicitTime: false, requestedHour: null, requestedMinute: null };
  }

  // Activity + time (no child) → outdoor activity
  if (hasActivity && hasTime) {
    return { intent: "outdoor-activity", hasChild, hasActivity, hasTime, hasExplicitTime: false, requestedHour: null, requestedMinute: null };
  }

  // Check patterns in order for everything else
  for (const intent of INTENT_PATTERNS) {
    if (intent.pattern.test(normalized)) {
      return { intent: intent.name, hasChild, hasActivity, hasTime, hasExplicitTime: false, requestedHour: null, requestedMinute: null };
    }
  }
  return { intent: null, hasChild, hasActivity, hasTime, hasExplicitTime: false, requestedHour: null, requestedMinute: null };
}

export function deterministicAnswer(
  question: string,
  context: CopilotContext,
): import("@/lib/types").CopilotAnswer {
  const normalized = question.toLowerCase();

  if (isAcuteHealthScenario(question)) {
    return acuteHealthAnswer();
  }

  const intent = matchIntent(normalized);
  let answer: import("@/lib/types").CopilotAnswer;

  if (intent.intent === "outdoor-activity") {
    answer = outdoorActivityAnswer(context, question);
  } else if (intent.intent) {
    const handler = INTENT_PATTERNS.find((p) => p.name === intent.intent)?.handler;
    if (handler) {
      answer = handler(context);
    } else {
      answer = genericAnswer(context);
    }
  } else {
    answer = genericAnswer(context);
  }

  return { ...answer, safetyNote: safetyNote(question) };
}