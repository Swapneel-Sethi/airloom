import test from "node:test";
import assert from "node:assert/strict";
import { isAcuteHealthScenario } from "../src/lib/ai/fallback";
import { ProviderRegistry } from "../src/lib/ai/providers/registry";
import { buildDemoEnvironment } from "../src/lib/demo";
import { buildPlan } from "../src/lib/plan";
import { buildIndoorOutlook } from "../src/lib/indoor";
import { compareCommute } from "../src/lib/commute";
import { buildCopilotContext } from "../src/lib/ai/context";
import { DEFAULT_PROFILE } from "../src/lib/profile";

const delhi = buildDemoEnvironment("delhi");

test("safety gate runs before any model provider", async () => {
  const registry = new ProviderRegistry();
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const context = buildCopilotContext(delhi, DEFAULT_PROFILE, plan, indoor, commute);

  const acuteQuestions = [
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

  for (const question of acuteQuestions) {
    const result = await registry.generate({ question, context });
    assert.equal(result.provider, "rules", `Question "${question}" should use rules provider`);
    assert.equal(result.fallbackReason, "safety-gate", `Question "${question}" should have safety-gate fallback`);
    assert.ok(
      result.answer.recommendation.toLowerCase().includes("not a medical service"),
      `Answer for "${question}" should include medical disclaimer`
    );
    assert.ok(
      result.answer.recommendation.toLowerCase().includes("stay indoors"),
      `Answer for "${question}" should recommend staying indoors`
    );
  }
});

test("non-acute questions do not trigger safety gate", () => {
  const notAcute = [
    "Should I go for a run?",
    "When should I leave?",
    "Write me a poem",
    "How much CO2?",
    "Should I open windows?",
  ];

  for (const question of notAcute) {
    assert.ok(!isAcuteHealthScenario(question), `${question} should not be acute`);
  }
});

test("safety response does not recommend outdoor windows", async () => {
  const registry = new ProviderRegistry();
  const _plan = buildPlan(delhi, DEFAULT_PROFILE);
  const _indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const _commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const _context = buildCopilotContext(delhi, DEFAULT_PROFILE, _plan, _indoor, _commute);

  const result = await registry.generate({
    question: "I have chest pain and difficulty breathing",
    context: _context,
  });

  const joined = [
    result.answer.recommendation,
    result.answer.alternative,
    ...result.answer.why,
    ...result.answer.whatToDo,
  ].join(" ");

  assert.ok(!joined.match(/\d{2}:\d{2}/), "safety response must not recommend an outdoor time window");
  assert.ok(!joined.includes("best window"), "safety response must not reference best window");
});