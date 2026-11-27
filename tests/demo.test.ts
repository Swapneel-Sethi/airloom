import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoEnvironment } from "../src/lib/demo";
import { DEMO_CITIES } from "../src/lib/constants";
import { freshOnboardingProfile } from "../src/lib/profile";
import { buildPlan } from "../src/lib/plan";

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

test("provenance never claims demo is live Open-Meteo", () => {
  const demoEnv = buildDemoEnvironment("delhi");
  assert.equal(demoEnv.source, "demo");
  assert.equal(demoEnv.provenance, "demo-seed");
  assert.ok(demoEnv.dataNote.includes("Demo scenario"));
  assert.ok(!demoEnv.dataNote.toLowerCase().includes("live"));

  const plan = buildPlan(demoEnv, freshOnboardingProfile());
  for (const block of plan.blocks) {
    for (const basis of block.basis) {
      assert.ok(!basis.includes("live"), "basis must not claim live for demo");
    }
  }
});

test("demo city consistency: demo environment uses demoCity", () => {
  const mumbaiEnv = buildDemoEnvironment("mumbai");
  assert.equal(mumbaiEnv.location.name, "Mumbai");
  assert.equal(mumbaiEnv.location.admin1, "Maharashtra");

  const delhiEnv = buildDemoEnvironment("delhi");
  assert.equal(delhiEnv.location.name, "Delhi");
  assert.equal(delhiEnv.location.admin1, "Delhi");
});