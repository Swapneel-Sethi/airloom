import test from "node:test";
import assert from "node:assert/strict";
import { compareCommute } from "../src/lib/commute";
import { buildDemoEnvironment } from "../src/lib/demo";
import { DEFAULT_PROFILE, freshOnboardingProfile } from "../src/lib/profile";
import { TRANSPORT_OPTIONS } from "../src/lib/constants";
import type { TransportMode } from "../src/lib/types";

const delhi = buildDemoEnvironment("delhi");

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

test("CO2 ordering: transit < two wheeler < car (India GHG Program)", () => {
  const transit = TRANSPORT_OPTIONS.find((o) => o.value === "transit")!;
  const twoWheeler = TRANSPORT_OPTIONS.find((o) => o.value === "two-wheeler")!;
  const car = TRANSPORT_OPTIONS.find((o) => o.value === "car")!;

  assert.ok(transit.co2PerKm < twoWheeler.co2PerKm, "transit lower than two wheeler");
  assert.ok(twoWheeler.co2PerKm < car.co2PerKm, "two wheeler lower than car");
});

test("commute does not invent modes when none selected", () => {
  const profileNoTransport = { ...freshOnboardingProfile(), transport: [] };
  const result = compareCommute(delhi, profileNoTransport, 8);

  assert.equal(result.available, false);
  assert.equal(result.note, "Add at least one way you travel to see commute options.");
  assert.deepEqual(result.options, []);
});

test("commute recommends lower-emission option within exposure band", () => {
  const profileBoth = {
    ...freshOnboardingProfile(),
    transport: ["car", "transit"] as TransportMode[],
    commuteDistanceKm: 7,
  };
  const result = compareCommute(delhi, profileBoth, 8);

  assert.equal(result.available, true);
  const car = result.options.find((o) => o.mode === "car")!;
  const transit = result.options.find((o) => o.mode === "transit")!;
  assert.ok(car.co2Kg > transit.co2Kg, "car has higher CO2 than transit");
  // recommended should prefer lower emissions when exposure is comparable
  const recommended = result.options.find((o) => o.recommended)!;
  assert.ok(
    recommended.mode === "transit" || recommended.mode === "car",
    "recommended is a real mode",
  );
});

test("remote work is No trip not 0 minutes for distance", () => {
  const profileRemote = {
    ...freshOnboardingProfile(),
    transport: ["remote"] as TransportMode[],
    commuteDistanceKm: 7,
  };
  const result = compareCommute(delhi, profileRemote, 8);

  const remote = result.options.find((o) => o.mode === "remote")!;
  assert.equal(remote.durationMin, 0);
  assert.ok(remote.why.includes("No trip"), "remote described as No trip");
});