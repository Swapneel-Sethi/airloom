import test from "node:test";
import assert from "node:assert/strict";
import { deterministicAnswer, isAcuteHealthScenario } from "../src/lib/ai/fallback";
import { buildDemoEnvironment } from "../src/lib/demo";
import { buildPlan } from "../src/lib/plan";
import { buildIndoorOutlook } from "../src/lib/indoor";
import { compareCommute } from "../src/lib/commute";
import { buildCopilotContext } from "../src/lib/ai/context";
import { DEFAULT_PROFILE } from "../src/lib/profile";

const delhi = buildDemoEnvironment("delhi");

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

  const acuteAsthma = deterministicAnswer(
    "My child has asthma and is coughing, should I take them outside?",
    context,
  );
  assert.ok(acuteAsthma.recommendation.toLowerCase().includes("not a medical service"));
  assert.ok(acuteAsthma.recommendation.toLowerCase().includes("stay indoors"));
  const acuteJoined = [
    acuteAsthma.recommendation,
    acuteAsthma.alternative,
    ...acuteAsthma.why,
    ...acuteAsthma.whatToDo,
  ].join(" ");
  assert.ok(!acuteJoined.match(/\d{2}:\d{2}/), "acute response must not recommend an outdoor window");
  assert.ok(!acuteJoined.includes("best window"), "acute response must not reference best window");

  const chestPain = deterministicAnswer("I have chest pain, what should I do?", context);
  assert.ok(chestPain.recommendation.toLowerCase().includes("not a medical service"));
  assert.ok(chestPain.recommendation.toLowerCase().includes("stay indoors"));
  const chestJoined = [
    chestPain.recommendation,
    chestPain.alternative,
    ...chestPain.why,
    ...chestPain.whatToDo,
  ].join(" ");
  assert.ok(!chestJoined.match(/\d{2}:\d{2}/), "acute response must not recommend an outdoor window");

  const wheezing = deterministicAnswer("I am wheezing and have difficulty breathing", context);
  assert.ok(wheezing.recommendation.toLowerCase().includes("not a medical service"));
  assert.ok(wheezing.recommendation.toLowerCase().includes("stay indoors"));

  const harmlessAsthma = deterministicAnswer("I have asthma, what is the AQI?", context);
  assert.ok(!harmlessAsthma.recommendation.toLowerCase().includes("stay indoors"));

  const normalRun = deterministicAnswer("Should I go for a run this morning?", context);
  assert.ok(normalRun.recommendation.length > 0);
  assert.ok(normalRun.why.length >= 2);
  assert.ok(normalRun.dataUsed.some((item) => item.includes("PM2.5")));

  const normalFamily = deterministicAnswer("What can my family do indoors tonight?", context);
  assert.ok(normalFamily.recommendation.length > 0);
  assert.ok(normalFamily.why.length >= 2);

  const symptom = deterministicAnswer("I have chest pain, can I go running?", context);
  assert.ok(symptom.recommendation.toLowerCase().includes("not a medical service"));

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

test("acute health scenarios are detected", () => {
  const acute = [
    "I have chest pain",
    "chest tightness",
    "difficulty breathing",
    "shortness of breath",
    "breathless",
    "can't breathe",
    "cannot breathe",
    "wheezing",
    "wheeze",
    "asthma attack",
    "inhaler not working",
    "blue lips",
    "faint",
    "dizzy",
    "severe coughing",
    "worsening respiratory symptoms",
  ];
  for (const q of acute) {
    assert.ok(isAcuteHealthScenario(q), `${q} should be detected as acute`);
  }

  const notAcute = [
    "Should I go for a run?",
    "When should I leave?",
    "Write me a poem",
    "How much CO2?",
    "Should I open windows?",
  ];
  for (const q of notAcute) {
    assert.ok(!isAcuteHealthScenario(q), `${q} should not be acute`);
  }
});