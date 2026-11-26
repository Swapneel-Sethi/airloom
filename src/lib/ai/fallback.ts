import type { CopilotAnswer } from "../types";
import { formatNumber } from "../format";
import type { CopilotContext } from "./context";

const SAFETY_TRIGGERS = [
  "symptom",
  "chest",
  "breath",
  "wheez",
  "asthma",
  "medic",
  "inhaler",
  "doctor",
  "hospital",
  "pregnan",
  "heart",
  "cough",
];

function hasSafetyTrigger(question: string): boolean {
  const normalized = question.toLowerCase();
  return SAFETY_TRIGGERS.some((trigger) => normalized.includes(trigger));
}

function safetyNote(question: string): string | null {
  if (!hasSafetyTrigger(question)) return null;
  return "Airloom provides environmental guidance based on available data and is not a medical service. If you or someone in your household has symptoms or a medical condition, follow advice from a qualified professional.";
}

const ACUTE_STANDALONE_SYMPTOMS = [
  "chest pain",
  "chest tightness",
  "breathless",
  "wheezing",
  "wheeze",
  "inhaler not working",
  "blue lips",
  "faint",
  "dizzy",
  "difficulty breathing",
  "shortness of breath",
  "asthma attack",
  "cannot breathe",
  "can't breathe",
];

const ACUTE_SYMPTOM_WORDS = ["asthma", "wheez", "cough", "respiratory"];

const ACUTE_CONTEXT_WORDS = [
  "child",
  "kid",
  "baby",
  "infant",
  "toddler",
  "severe",
  "serious",
  "worse",
  "worsening",
  "emergency",
  "urgent",
  "attack",
];

export function isAcuteHealthScenario(question: string): boolean {
  const normalized = question.toLowerCase();

  if (ACUTE_STANDALONE_SYMPTOMS.some((symptom) => normalized.includes(symptom))) {
    return true;
  }

  const hasSymptomWord = ACUTE_SYMPTOM_WORDS.some((word) => normalized.includes(word));
  if (!hasSymptomWord) return false;

  const hasContextWord = ACUTE_CONTEXT_WORDS.some((word) => normalized.includes(word));
  return hasContextWord;
}

function acuteHealthAnswer(): CopilotAnswer {
  return {
    recommendation:
      "Airloom is not a medical service. Stay indoors and reduce outdoor exposure while symptoms are active.",
    why: [
      "Airloom does not diagnose medical conditions or assess acute symptom severity.",
      "Respiratory symptoms such as chest pain, difficulty breathing, or wheezing warrant professional medical evaluation.",
    ],
    whatToDo: [
      "Follow your existing clinician prescribed plan where applicable.",
      "Seek professional medical care for concerning or worsening symptoms.",
      "Keep windows closed and reduce outdoor exposure until symptoms improve.",
    ],
    alternative: "Contact a qualified healthcare professional or emergency services if symptoms are severe or worsening.",
    dataUsed: [],
    safetyNote: null,
  };
}

function pm25(context: CopilotContext): number | null {
  const item = context.pollutants.find((entry) => entry.label === "PM2.5");
  return item ? item.value : null;
}

function householdPhrase(context: CopilotContext): string {
  const household = context.profile.household;
  if (household.length === 0) return "your household";
  return household.length === 1 ? household[0] : `${household.slice(0, 2).join(" and ")}`;
}

function baseDataUsed(context: CopilotContext): string[] {
  const used = ["AQI and dominant pollutant"];
  if (pm25(context) !== null) used.push("PM2.5 model value");
  if (context.bestWindow) used.push("Hourly PM2.5 forecast");
  if (context.aqi) used.push(`Data source: ${context.dataSource}`);
  return used;
}

function activityAnswer(context: CopilotContext): CopilotAnswer {
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

  const recommended = value > 40 && best.pm25 < value * 0.85;
  return {
    recommendation: recommended
      ? `Move the outdoor session to ${best.label}.`
      : `Keep the session at ${context.profile.activityTime}, but keep it short.`,
    why: [
      `PM2.5 is ${formatNumber(value, 0)} µg/m³ now, with AQI ${context.aqi?.value ?? "unavailable"}.`,
      `The lowest two hour average is ${formatNumber(best.pm25, 0)} µg/m³ between ${best.label}.`,
      `Your household sensitivity is set to ${context.profile.sensitivity}, so the planning threshold is ${context.profile.sensitivity === "sensitive" ? "30" : "40"} µg/m³.`,
    ],
    whatToDo: [
      recommended
        ? `Move the session to ${best.label} instead of cancelling it.`
        : "Reduce the session to 30 minutes and keep it in the low window.",
      "Warm up indoors and skip the cooldown walk outdoors.",
      "Choose a route away from the main road if one is available.",
    ],
    alternative: `A shorter loop in ${best.label}, or the same session indoors.`,
    dataUsed: [...baseDataUsed(context), "Household sensitivity"],
    safetyNote: null,
  };
}

function ventilationAnswer(context: CopilotContext): CopilotAnswer {
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

function commuteAnswer(context: CopilotContext): CopilotAnswer {
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

function indoorAnswer(context: CopilotContext): CopilotAnswer {
  const actions = context.indoor.actions;
  return {
    recommendation:
      actions.length > 0
        ? actions[0]
        : "Keep the occupied room closed and filtered where possible.",
    why: [
      `Indoor PM2.5 is estimated at ${formatNumber(context.indoor.estimatedPm25 ?? 0, 0)} µg/m³ with your current setup.`,
      `Outdoor PM2.5 is ${formatNumber(context.indoor.outdoorPm25 ?? 0, 0)} µg/m³.`,
      context.indoor.ventilationWindow
        ? `The ventilation window is ${context.indoor.ventilationWindow}.`
        : "No two hour window today falls below the ventilation threshold.",
    ],
    whatToDo: actions.length > 0 ? actions.slice(0, 3) : ["Close windows.", "Filter the room you use."],
    alternative: "Move the household to the room furthest from the street for the evening.",
    dataUsed: [...baseDataUsed(context), "Indoor infiltration model", "Household ventilation setup"],
    safetyNote: null,
  };
}

function familyAnswer(context: CopilotContext): CopilotAnswer {
  const value = pm25(context);
  return {
    recommendation: `Set the household routine around the ${context.bestWindow?.label ?? "lowest"} window and keep indoor air filtered.`,
    why: [
      `PM2.5 is ${formatNumber(value ?? 0, 0)} µg/m³, with AQI ${context.aqi?.value ?? "unavailable"}.`,
      `Your household profile includes ${householdPhrase(context)}.`,
      `Airloom applies a ${context.profile.sensitivity} threshold because of the selected sensitivities.`,
    ],
    whatToDo: [
      context.bestWindow
        ? `Plan outdoor time between ${context.bestWindow.label}.`
        : "Keep outdoor time short today.",
      "Run the purifier in the room where the household spends the evening.",
      "Keep windows closed through the evening peak.",
    ],
    alternative: "A shorter outdoor session in the low window instead of a full outing.",
    dataUsed: [...baseDataUsed(context), "Household profile", "Indoor infiltration model"],
    safetyNote: null,
  };
}

function swapsAnswer(context: CopilotContext): CopilotAnswer {
  const planned = context.exposure.plannedProxy;
  const baseline = context.exposure.currentRoutineProxy;
  const delta =
    planned !== null && baseline !== null && baseline > 0
      ? Math.round(((planned - baseline) / baseline) * 100)
      : null;

  return {
    recommendation:
      delta !== null && delta < 0
        ? `The timing change has the clearest effect today: ${Math.abs(delta)} percent lower exposure proxy for the same routine.`
        : "The strongest swap today is moving outdoor time into the low window.",
    why: [
      `Your current routine estimates ${formatNumber(baseline ?? 0, 0)} µg/m³·h.`,
      `The adjusted routine estimates ${formatNumber(planned ?? 0, 0)} µg/m³·h.`,
      "Mode and emission factors are planning estimates, not measured values.",
    ],
    whatToDo: [
      "Apply the timing change first. It needs no purchase and no new equipment.",
      "Move the shortest weekly car trip to transit next.",
      "Keep the change for the smog season, then review it.",
    ],
    alternative: "If timing cannot move, reduce the session length instead.",
    dataUsed: [...baseDataUsed(context), "Exposure proxy calculation", "Commute mode table"],
    safetyNote: null,
  };
}

const INTENT_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  handler: (context: CopilotContext) => CopilotAnswer;
}> = [
  { name: "purifier", pattern: /\b(purifier|filter|air cleaner|hepa)\b/, handler: indoorAnswer },
  { name: "indoor-windows", pattern: /\b(window|ventilate|open|fresh air|air out)\b/, handler: ventilationAnswer },
  { name: "commute", pattern: /\b(commute|travel|leave|office|work|bus|metro|train|cab|scooter|trip|ride|drive|transport|cycle|compare)\b/, handler: commuteAnswer },
  { name: "family", pattern: /\b(family|child|kid|school|parent|mother|baby|infant|toddler|older adult|elderly|grandparent)\b/, handler: familyAnswer },
  { name: "activity", pattern: /\b(run|jog|exercise|walk|walking|cycl|gym|cricket|sport|session|workout)\b/, handler: activityAnswer },
  { name: "swaps", pattern: /\b(swap|swaps|sustain|carbon|co2|emission|impact|change mode|reduce emission)\b/, handler: swapsAnswer },
];

function matchIntent(normalized: string): ((context: CopilotContext) => CopilotAnswer) | null {
  for (const intent of INTENT_PATTERNS) {
    if (intent.pattern.test(normalized)) return intent.handler;
  }
  return null;
}

export function deterministicAnswer(
  question: string,
  context: CopilotContext,
): CopilotAnswer {
  const normalized = question.toLowerCase();

  if (isAcuteHealthScenario(question)) {
    return acuteHealthAnswer();
  }

  const handler = matchIntent(normalized);
  let answer: CopilotAnswer;
  if (handler) {
    answer = handler(context);
  } else {
    const value = pm25(context);
    const top = context.plan[0];
    answer = {
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

  return { ...answer, safetyNote: safetyNote(question) };
}
