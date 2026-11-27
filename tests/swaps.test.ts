import test from "node:test";
import assert from "node:assert/strict";
import { buildSwaps } from "../src/lib/swaps";
import { buildDemoEnvironment } from "../src/lib/demo";
import { buildPlan } from "../src/lib/plan";
import { buildIndoorOutlook } from "../src/lib/indoor";
import { compareCommute } from "../src/lib/commute";
import { freshOnboardingProfile } from "../src/lib/profile";

const delhi = buildDemoEnvironment("delhi");

test("swaps are populated with a basis and a stated impact", () => {
  const plan = buildPlan(delhi, freshOnboardingProfile());
  const indoor = buildIndoorOutlook(delhi, freshOnboardingProfile());
  const commute = compareCommute(delhi, freshOnboardingProfile(), 8);
  const swaps = buildSwaps(delhi, freshOnboardingProfile(), plan, commute);
  assert.ok(indoor.available);
  assert.ok(swaps.length >= 2);
  for (const swap of swaps) {
    assert.ok(swap.title.length > 0);
    assert.ok(swap.basis.length > 0);
    assert.ok(swap.impact.length > 0);
    assert.ok(swap.horizon.length > 0);
  }
  // Check for daily frequency - frequency field may use different format
  assert.ok(swaps.some((swap) => 
    swap.frequency.toLowerCase().includes("day") || 
    swap.frequency.toLowerCase().includes("daily")
  ));
});

test("swaps do not show negative or zero savings as meaningful", () => {
  const swaps = buildSwaps(delhi, freshOnboardingProfile(), buildPlan(delhi, freshOnboardingProfile()), compareCommute(delhi, freshOnboardingProfile(), 8));
  for (const swap of swaps) {
    assert.ok(swap.co2SavedKgPerYear === null || swap.co2SavedKgPerYear > 0, `swap ${swap.id} has non-positive CO2`);
  }
});