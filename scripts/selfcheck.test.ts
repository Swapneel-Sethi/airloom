import test from "node:test";
import assert from "node:assert/strict";
import { categoryFor, computeAqi, pm25SubIndex } from "../src/lib/aqi";
import { buildSwaps } from "../src/lib/swaps";
import { DEFAULT_PROFILE } from "../src/lib/profile";
import { buildDemoEnvironment } from "../src/lib/demo";
import { DEMO_CITIES } from "../src/lib/constants";
import { exposureProxy, proxyDelta } from "../src/lib/exposure";
import { buildIndoorOutlook, infiltrationFactor } from "../src/lib/indoor";
import { compareCommute } from "../src/lib/commute";
import { buildPlan } from "../src/lib/plan";
import { buildCopilotContext } from "../src/lib/ai/context";
import { deterministicAnswer } from "../src/lib/ai/fallback";
import { copilotAnswerSchema } from "../src/lib/ai/schema";

const delhi = buildDemoEnvironment("delhi");

test("PM2.5 breakpoints follow the US EPA table", () => {
  assert.equal(pm25SubIndex(0), 0);
  assert.equal(pm25SubIndex(12), 50);
  assert.equal(pm25SubIndex(35.4), 100);
  assert.equal(pm25SubIndex(55.4), 150);
  assert.equal(pm25SubIndex(150.4), 200);
  assert.equal(pm25SubIndex(500), 500);
});

test("AQI is null when no pollutant is available and picks the dominant sub index", () => {
  assert.equal(computeAqi(null, null), null);
  const aqi = computeAqi(10, 200);
  assert.ok(aqi);
  assert.equal(aqi.dominant, "pm10");
  assert.ok(aqi.value > 100);
});

test("AQI categories match their boundaries", () => {
  assert.equal(categoryFor(50), "good");
  assert.equal(categoryFor(51), "moderate");
  assert.equal(categoryFor(101), "elevated");
  assert.equal(categoryFor(201), "very-high");
  assert.equal(categoryFor(301), "severe");
});

test("exposure proxy multiplies concentration, hours, and mode factor", () => {
  assert.equal(exposureProxy(100, 2, 0.5), 100);
  assert.equal(proxyDelta(100, 60), -40);
  assert.equal(proxyDelta(0, 60), null);
});

test("every demo city produces a complete labelled environment", () => {
  for (const key of Object.keys(DEMO_CITIES)) {
    const environment = buildDemoEnvironment(key);
    assert.equal(environment.source, "demo", key);
    assert.ok(environment.aqi, key);
    assert.ok(environment.today, key);
    assert.ok(environment.hourly.length >= 48, key);
    assert.ok(environment.pollutants.length > 0, key);
    assert.ok(environment.dataNote.length > 0, key);
    assert.ok(environment.limitations.length > 0, key);
  }
});

test("the plan is deterministic for identical inputs", () => {
  const first = buildPlan(delhi, DEFAULT_PROFILE);
  const second = buildPlan(delhi, DEFAULT_PROFILE);
  assert.deepEqual(first.blocks, second.blocks);
  assert.equal(first.available, true);
  assert.equal(first.blocks.length, 6);
  assert.ok(first.bestWindow);
  assert.ok(first.worstWindow);
  assert.ok(first.bestWindow.avgPm25 <= first.worstWindow.avgPm25);
});

test("plan blocks carry an action, a reason, and stated basis", () => {
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  for (const block of plan.blocks) {
    assert.ok(block.action.length > 0);
    assert.ok(block.reason.length > 0);
    assert.ok(block.why.length >= 2);
    assert.ok(block.basis.length > 0);
    assert.ok(block.timeRange.match(/\d{2}:00/));
  }
});

test("sensitive households get tighter thresholds than adult only profiles", () => {
  const sensitive = buildPlan(delhi, DEFAULT_PROFILE);
  const standard = buildPlan(delhi, { ...DEFAULT_PROFILE, household: ["adult"] });
  assert.equal(sensitive.sensitivity, "sensitive");
  assert.equal(standard.sensitivity, "standard");
});

test("commute options are sorted by exposure and include a recommendation", () => {
  const comparison = compareCommute(delhi, DEFAULT_PROFILE, 8);
  assert.equal(comparison.available, true);
  assert.ok(comparison.options.length >= 2);
  assert.ok(comparison.options.some((option) => option.recommended));
  for (let index = 1; index < comparison.options.length; index += 1) {
    assert.ok(
      comparison.options[index - 1].exposureProxy <= comparison.options[index].exposureProxy,
    );
  }
  for (const option of comparison.options) {
    assert.ok(Number.isFinite(option.exposureProxy));
    assert.ok(Number.isFinite(option.co2Kg));
    assert.ok(option.why.length > 0);
  }
});

test("indoor estimate is lower than outdoor with a purifier selected", () => {
  const purifier = infiltrationFactor(DEFAULT_PROFILE);
  const naturalOnly = infiltrationFactor({
    ...DEFAULT_PROFILE,
    ventilation: ["natural"],
  });
  assert.ok(purifier < naturalOnly);

  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  assert.equal(indoor.available, true);
  assert.ok(indoor.outdoorPm25 !== null);
  assert.ok(indoor.estimatedPm25 !== null);
  assert.ok(indoor.estimatedPm25 < indoor.outdoorPm25);
  assert.ok(indoor.rooms.length >= 2);
  if (indoor.ventilationWindow) {
    assert.ok(indoor.ventilationWindow.avgPm25 < 30);
  }
});

test("swaps are populated with a basis and a stated impact", () => {
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const swaps = buildSwaps(delhi, DEFAULT_PROFILE, plan, commute);
  assert.ok(indoor.available);
  assert.ok(swaps.length >= 2);
  for (const swap of swaps) {
    assert.ok(swap.title.length > 0);
    assert.ok(swap.basis.length > 0);
    assert.ok(swap.impact.length > 0);
    assert.ok(swap.horizon.length > 0);
  }
  assert.ok(swaps.some((swap) => swap.frequency.toLowerCase().includes("day")));
});

test("copilot schema rejects malformed model output", () => {
  const valid = copilotAnswerSchema.safeParse({
    recommendation: "Move the run to 17:00.",
    why: ["PM2.5 is lower in that window."],
    whatToDo: ["Run at 17:00."],
    alternative: "Keep the session indoors.",
    dataUsed: ["Hourly PM2.5 forecast"],
    safetyNote: null,
  });
  assert.equal(valid.success, true);

  const missing = copilotAnswerSchema.safeParse({ recommendation: "Only one field." });
  assert.equal(missing.success, false);

  const emptyWhy = copilotAnswerSchema.safeParse({
    recommendation: "Move it.",
    why: [],
    whatToDo: ["Run later."],
    alternative: "Indoors.",
    dataUsed: ["Forecast"],
    safetyNote: null,
  });
  assert.equal(emptyWhy.success, false);
});

test("the rule engine answers without a model and handles safety language", () => {
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const context = buildCopilotContext(delhi, DEFAULT_PROFILE, plan, indoor, commute);

  const activity = deterministicAnswer("Should I go for a run this morning?", context);
  assert.ok(activity.recommendation.length > 0);
  assert.ok(activity.why.length >= 2);
  assert.ok(activity.dataUsed.some((item) => item.includes("PM2.5")));
  assert.equal(activity.safetyNote, null);

  const symptom = deterministicAnswer("I have chest pain, can I go running?", context);
  assert.ok(symptom.safetyNote);
  assert.ok(symptom.safetyNote.toLowerCase().includes("not a medical service"));

  const ventilation = deterministicAnswer("Should I open the windows?", context);
  assert.ok(ventilation.why.length >= 2);

  for (const answer of [activity, symptom, ventilation]) {
    const joined = [
      answer.recommendation,
      answer.alternative,
      answer.safetyNote ?? "",
      ...answer.why,
      ...answer.whatToDo,
    ].join(" ");
    assert.ok(!joined.includes("—"));
    assert.ok(!joined.includes("–"));
  }
});
