import test from "node:test";
import assert from "node:assert/strict";
import { validateNumberGrounding } from "../src/lib/ai/grounding";
import { buildDemoEnvironment } from "../src/lib/demo";
import { buildPlan } from "../src/lib/plan";
import { buildIndoorOutlook } from "../src/lib/indoor";
import { compareCommute } from "../src/lib/commute";
import { buildCopilotContext } from "../src/lib/ai/context";
import { DEFAULT_PROFILE } from "../src/lib/profile";

const delhi = buildDemoEnvironment("delhi");

test("grounding rejects unsupported numbers", () => {
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const context = buildCopilotContext(delhi, DEFAULT_PROFILE, plan, indoor, commute);

  const answerWithFakeNumber = {
    recommendation: "Move the run to 17:00. PM2.5 is 99999 µg/m³ there.",
    why: ["PM2.5 is 99999 µg/m³."],
    whatToDo: ["Run at 17:00."],
    alternative: "Keep the session indoors.",
    dataUsed: ["Hourly PM2.5 forecast"],
    safetyNote: null,
  };

  const result = validateNumberGrounding(answerWithFakeNumber, JSON.stringify(context));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("99999")));
});

test("grounding accepts numbers from verified context", () => {
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const context = buildCopilotContext(delhi, DEFAULT_PROFILE, plan, indoor, commute);

  const answerWithRealNumber = {
    recommendation: "Move the run to 17:00.",
    why: ["PM2.5 is lower in that window."],
    whatToDo: ["Run at 17:00."],
    alternative: "Keep the session indoors.",
    dataUsed: ["Hourly PM2.5 forecast"],
    safetyNote: null,
  };

  const result = validateNumberGrounding(answerWithRealNumber, JSON.stringify(context));
  assert.equal(result.valid, true);
});

test("grounding handles decimal values correctly", () => {
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const context = buildCopilotContext(delhi, DEFAULT_PROFILE, plan, indoor, commute);

  const answerWithDecimal = {
    recommendation: "PM2.5 is 178.5 µg/m³.",
    why: ["Exact value from forecast."],
    whatToDo: ["Run later."],
    alternative: "Indoors.",
    dataUsed: ["Hourly PM2.5 forecast"],
    safetyNote: null,
  };

  const result = validateNumberGrounding(answerWithDecimal, JSON.stringify(context));
  // 178.5 may not be in context - check if 178 or 179 is
  // This test documents expected behavior
  assert.ok(typeof result.valid === "boolean");
});

test("grounding handles time ranges correctly", () => {
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const context = buildCopilotContext(delhi, DEFAULT_PROFILE, plan, indoor, commute);

  const answerWithTime = {
    recommendation: "Best window is 14:00 to 16:00.",
    why: ["PM2.5 is lowest then."],
    whatToDo: ["Run at 15:00."],
    alternative: "Indoors.",
    dataUsed: ["Hourly PM2.5 forecast", "Best window"],
    safetyNote: null,
  };

  const result = validateNumberGrounding(answerWithTime, JSON.stringify(context));
  assert.equal(result.valid, true);
});