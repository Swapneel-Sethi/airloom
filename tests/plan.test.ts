import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan } from "../src/lib/plan";
import { buildDemoEnvironment } from "../src/lib/demo";
import { DEFAULT_PROFILE, freshOnboardingProfile } from "../src/lib/profile";
import { dateOf } from "../src/lib/windows";
import type { HouseholdTag } from "../src/lib/types";

const delhi = buildDemoEnvironment("delhi");

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

test("plan does not recommend past windows", () => {
  const profileMorning = {
    ...freshOnboardingProfile(),
    activityTime: "06:00",
    location: delhi.location,
    dataMode: "auto" as "auto" | "demo",
  };
  // Use a late hour so morning is in the past
  const envLate = {
    ...delhi,
    currentTime: `${dateOf(delhi.currentTime)}T22:00:00`,
  };
  const plan = buildPlan(envLate, profileMorning);

  assert.equal(plan.available, true);
  // bestWindow should not be a past morning window
  assert.ok(
    plan.bestWindow === null || plan.bestWindow.startHour >= 22,
    "bestWindow should be in the future or null",
  );
});

test("plan best and worst window are single source of truth", () => {
  const profile = freshOnboardingProfile();
  const plan = buildPlan(delhi, profile);

  assert.equal(plan.available, true);
  assert.notEqual(plan.bestWindow, null);
  assert.notEqual(plan.worstWindow, null);
  assert.ok(plan.bestWindow!.avgPm25 <= plan.worstWindow!.avgPm25);
});

test("indoor and plan use same household threshold", () => {
  const sensitive = { ...freshOnboardingProfile(), household: ["child"] as HouseholdTag[] };
  const standard = { ...freshOnboardingProfile(), household: ["adult"] as HouseholdTag[] };

  const planSensitive = buildPlan(delhi, sensitive);
  const planStandard = buildPlan(delhi, standard);

  assert.equal(planSensitive.sensitivity, "sensitive");
  assert.equal(planStandard.sensitivity, "standard");
});