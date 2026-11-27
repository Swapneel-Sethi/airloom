import type { CopilotAnswer } from "@/lib/types";

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

export function safetyNote(question: string): string | null {
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

export function acuteHealthAnswer(): CopilotAnswer {
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
    dataUsed: ["Location", "Air quality index"],
    safetyNote: null,
  };
}