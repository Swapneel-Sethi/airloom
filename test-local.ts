import { parseExplicitTime } from "./src/lib/ai/time-parser";
import { evaluateRequestedOutdoorTime } from "./src/lib/ai/time-parser";
import { deterministicAnswer } from "./src/lib/ai/fallback";

// Test explicit time parsing
const testCases = [
  "can i go outside today to hang out with my friends at 6 pm ?",
  "Can I run at 6 pm?",
  "Can my friends and I hang out at 6 pm?",
  "Can I play outside at 18:00?",
  "Can I walk outside at 5:30 pm?",
  "Should I go out tonight at 8?",
  "What is the safest time for us to go outside today?",
];

console.log("=== Explicit Time Parsing Tests ===");
for (const question of testCases) {
  const result = parseExplicitTime(question);
  console.log("Question:", question);
  console.log("Parsed:", result);
  console.log();
}

// Test deterministic answers with mock context
const mockContext = {
  location: "New York",
  localTime: "2026-11-27 14:00 local",
  dataSource: "Demo scenario with seeded values",
  freshness: "Seeded scenario, not a live reading",
  aqi: { value: 120, category: "Unhealthy for Sensitive Groups", dominant: "PM2.5" },
  pollutants: [{ label: "PM2.5", value: 45, unit: "µg/m³", timesGuideline: 3 }],
  weather: { temperature: 20, humidity: 50, wind: 5, condition: "Clear" },
  dayAverages: { averageAqi: 110, peakAqi: 150, peakHour: "18:00" },
  bestWindow: { label: "15:00 to 17:00", pm25: 25, aqi: 70 },
  worstWindow: { label: "18:00 to 20:00", pm25: 65, aqi: 150 },
  morningWindow: { label: "06:00 to 11:00", pm25: 30, aqi: 80 },
  afternoonWindow: { label: "12:00 to 17:00", pm25: 28, aqi: 75 },
  eveningWindow: { label: "17:00 to 22:00", pm25: 55, aqi: 130 },
  tonightWindow: { label: "20:00 to 23:00", pm25: 60, aqi: 140 },
  exposure: { plannedProxy: null, currentRoutineProxy: null },
  plan: [
    { block: "Morning", time: "06:00 to 11:00", action: "Good for outdoor activity", reason: "PM2.5 is low", impact: null },
    { block: "Afternoon", time: "12:00 to 17:00", action: "Best window for outdoor activity", reason: "Lowest PM2.5 of the day", impact: null },
    { block: "Evening", time: "17:00 to 22:00", action: "Limit outdoor time", reason: "PM2.5 rising", impact: null },
  ],
  indoor: { outdoorPm25: 45, estimatedPm25: 15, ventilationWindow: "14:00 to 16:00", actions: ["Close windows", "Run purifier"] },
  commute: { ambientPm25: 45, distanceKm: 10, departureHour: "08:00", options: [] },
  profile: { household: ["child"], transport: [], ventilation: [], cooking: "gas", workspace: "home", commuteTime: "08:00", activity: "running", activityTime: "06:30", sensitivity: "sensitive" },
};

console.log("=== Deterministic Answer Tests ===");
const questions = [
  "can i go outside today to hang out with my friends at 6 pm ?",
  "What is the safest time for us to go outside today?",
  "can me and my kid go outside and play in the evening ?",
];

for (const q of questions) {
  console.log("Question:", q);
  const answer = deterministicAnswer(q, mockContext as any);
  console.log("Recommendation:", answer.recommendation);
  console.log("Why:", answer.why);
  console.log("---");
}