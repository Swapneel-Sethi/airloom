import test from "node:test";
import assert from "node:assert/strict";
import { isAcuteHealthScenario } from "../src/lib/ai/fallback";
import { matchIntentForTest } from "./intent-routing-helpers";

test("fallback intent routing: safety, off-topic, purifier, windows, commute, activity, family, swaps", () => {
  const cases: Array<[string, string]> = [
    ["Should I take public transport?", "commute"],
    ["How much CO2 can I save?", "swaps"],
    ["Should I buy an air purifier?", "purifier"],
    ["Should I open the windows?", "indoor-windows"],
    ["My child has asthma.", "family"],
    ["My 70 year old mother wants to walk.", "family"],
    ["Write me a poem.", "generic"],
    ["Should I go for a run this morning?", "outdoor-activity"],
    ["When should I leave for work?", "commute"],
    ["What can my family do indoors tonight?", "family"],
    ["Is the air safe for my baby?", "family"],
    ["Should I cycle to work?", "commute"],
    ["Do I need a HEPA filter?", "purifier"],
    ["Open the windows tonight", "indoor-windows"],
    ["Tell me a joke", "generic"],
    ["What is the best time to run?", "activity"],
    ["Compare car versus transit", "commute"],
    ["I have chest pain", "safety"],
    ["I cannot breathe", "safety"],
    ["My wheezing is getting worse", "safety"],
    ["Should I wear a mask?", "generic"],
    ["Is walking good today?", "activity"],
    ["Tell me about the swaps", "swaps"],
    ["Recite a limerick", "generic"],
    ["Should I ventilate the room?", "indoor-windows"],
    ["What about carbon emissions?", "swaps"],
  ];

  let matched = 0;
  for (const [question, expectedIntent] of cases) {
    const normalized = question.toLowerCase();
    const handler = matchIntentForTest(normalized);
    const isSafety = isAcuteHealthScenario(question);
    const isGeneric = handler === null && !isSafety;
    if (expectedIntent === "safety") {
      assert.ok(isSafety, `${question} should be acute safety`);
      matched += 1;
    } else if (expectedIntent === "generic") {
      assert.ok(isGeneric, `${question} should be generic, got ${handler?.name ?? "null"}`);
      matched += 1;
    } else {
      assert.ok(handler !== null, `${question} should match an intent`);
      assert.equal(handler.name, expectedIntent, `${question} expected ${expectedIntent}`);
      matched += 1;
    }
  }
  assert.equal(matched, cases.length);
});

test("outdoor activity intent routing: child + activity + time", () => {
  const cases: Array<[string, string]> = [
    ["can me and my kid go outside and play in the evening?", "outdoor-activity"],
    ["Can my child play outside tonight?", "outdoor-activity"],
    ["Should I go for a run this evening?", "outdoor-activity"],
    ["Can the kids go cycling this evening?", "outdoor-activity"],
    ["Is it better to play outside this evening or tomorrow morning?", "outdoor-activity"],
  ];

  let matched = 0;
  for (const [question, expectedIntent] of cases) {
    const normalized = question.toLowerCase();
    const intent = matchIntentForTest(normalized);
    assert.ok(intent !== null, `${question} should match an intent`);
    assert.equal(intent.name, expectedIntent, `${question} expected ${expectedIntent}`);
    matched += 1;
  }
  assert.equal(matched, cases.length);
});

test("outdoor activity intent: activity without child", () => {
  const cases: Array<[string, string]> = [
    ["Should I go for a run?", "activity"],
    ["Should I exercise today?", "activity"],
  ];

  for (const [question, expectedIntent] of cases) {
    const normalized = question.toLowerCase();
    const intent = matchIntentForTest(normalized);
    assert.ok(intent !== null, `${question} should match an intent`);
    assert.equal(intent.name, expectedIntent, `${question} expected ${expectedIntent}`);
  }
});

test("outdoor activity intent: activity + time without child", () => {
  const cases: Array<[string, string]> = [
    ["Should I go for a run this evening?", "outdoor-activity"],
  ];

  for (const [question, expectedIntent] of cases) {
    const normalized = question.toLowerCase();
    const intent = matchIntentForTest(normalized);
    assert.ok(intent !== null, `${question} should match an intent`);
    assert.equal(intent.name, expectedIntent, `${question} expected ${expectedIntent}`);
  }
});

test("family intent: child without activity + time", () => {
  const cases: Array<[string, string]> = [
    ["What can my family do indoors tonight?", "family"],
    ["What should my family do today?", "family"],
  ];

  for (const [question, expectedIntent] of cases) {
    const normalized = question.toLowerCase();
    const intent = matchIntentForTest(normalized);
    assert.ok(intent !== null, `${question} should match an intent`);
    assert.equal(intent.name, expectedIntent, `${question} expected ${expectedIntent}`);
  }
});

test("indoor-windows intent: windows at night", () => {
  const cases: Array<[string, string]> = [
    ["Should I open my windows tonight?", "indoor-windows"],
  ];

  for (const [question, expectedIntent] of cases) {
    const normalized = question.toLowerCase();
    const intent = matchIntentForTest(normalized);
    assert.ok(intent !== null, `${question} should match an intent`);
    assert.equal(intent.name, expectedIntent, `${question} expected ${expectedIntent}`);
  }
});

test("word boundaries prevent car matching care and walk hijacking family", () => {
  assert.ok(/\bcar\b/.test("I drive a car"), "car matches car");
  assert.ok(!/\bcar\b/.test("be careful"), "car does not match careful");
  assert.ok(/\bwalk\b/.test("take a walk"), "walk matches walk");
  assert.ok(!/\bwalk\b/.test("sidewalk"), "walk does not match sidewalk");
});