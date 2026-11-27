import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROFILE,
  freshOnboardingProfile,
  judgeProfile,
  repairProfile,
  effectiveLocation,
  parseStoredProfile,
} from "../src/lib/profile";
import { buildDemoEnvironment } from "../src/lib/demo";
import type { HouseholdTag, TransportMode } from "../src/lib/types";

const delhi = buildDemoEnvironment("delhi");

test("DEFAULT_PROFILE remains unchanged", () => {
  assert.equal(DEFAULT_PROFILE.location?.name, "Delhi");
  assert.deepEqual(DEFAULT_PROFILE.household, ["adult", "child", "older-adult"]);
  assert.deepEqual(DEFAULT_PROFILE.transport, ["two-wheeler", "transit"]);
  assert.deepEqual(DEFAULT_PROFILE.ventilation, ["purifier", "natural"]);
  assert.equal(DEFAULT_PROFILE.dataMode, "demo");
  assert.equal(DEFAULT_PROFILE.onboarded, false);
});

test("judgeProfile returns seeded demo profile with onboarded true", () => {
  const judged = judgeProfile();
  assert.equal(judged.onboarded, true);
  assert.equal(judged.location?.name, "Delhi");
  assert.deepEqual(judged.household, DEFAULT_PROFILE.household);
  assert.deepEqual(judged.transport, DEFAULT_PROFILE.transport);
  assert.deepEqual(judged.ventilation, DEFAULT_PROFILE.ventilation);
});

test("freshOnboardingProfile does not modify DEFAULT_PROFILE and starts blank", () => {
  const before = { ...DEFAULT_PROFILE };
  const fresh = freshOnboardingProfile();

  assert.deepEqual(DEFAULT_PROFILE, before, "DEFAULT_PROFILE must not be mutated");
  assert.equal(fresh.location, null);
  assert.deepEqual(fresh.household, []);
  assert.deepEqual(fresh.transport, []);
  assert.deepEqual(fresh.ventilation, []);
  assert.equal(fresh.dataMode, "auto");
  assert.equal(fresh.onboarded, false);
  assert.equal(fresh.cooking, DEFAULT_PROFILE.cooking);
  assert.equal(fresh.workspace, DEFAULT_PROFILE.workspace);
  assert.equal(fresh.commuteTime, DEFAULT_PROFILE.commuteTime);
  assert.equal(fresh.commuteDistanceKm, DEFAULT_PROFILE.commuteDistanceKm);
  assert.equal(fresh.activity, DEFAULT_PROFILE.activity);
  assert.equal(fresh.activityTime, DEFAULT_PROFILE.activityTime);
  assert.equal(fresh.demoCity, DEFAULT_PROFILE.demoCity);
});

test("repairProfile preserves valid fields when one field is invalid", () => {
  const record = {
    location: DEFAULT_PROFILE.location,
    household: ["child"],
    transport: ["two-wheeler"],
    ventilation: ["purifier"],
    cooking: "daily",
    workspace: "mixed",
    commuteTime: "not-a-time",
    commuteDistanceKm: 7,
    activity: "run",
    activityTime: "06:30",
    dataMode: "auto",
    demoCity: "delhi",
    onboarded: true,
  } as Record<string, unknown>;

  const repaired = repairProfile(record)!;

  assert.equal(repaired.onboarded, true, "onboarded must be preserved");
  assert.deepEqual(repaired.location, DEFAULT_PROFILE.location, "location must be preserved");
  assert.deepEqual(repaired.household, ["child"], "household must be preserved");
  assert.deepEqual(repaired.transport, ["two-wheeler"], "transport must be preserved");
  assert.equal(repaired.commuteTime, DEFAULT_PROFILE.commuteTime, "invalid commuteTime repaired to default");
});

test("repairProfile drops only the invalid location, keeps everything else", () => {
  const record = {
    location: { name: "Delhi" },
    household: ["adult"] as HouseholdTag[],
    transport: ["transit"] as TransportMode[],
    ventilation: ["natural"],
    cooking: "rarely",
    workspace: "home",
    commuteTime: "08:30",
    commuteDistanceKm: 5,
    activity: "walk",
    activityTime: "07:00",
    dataMode: "demo" as "auto" | "demo",
    demoCity: "mumbai",
    onboarded: false,
  } as Record<string, unknown>;

  const repaired = repairProfile(record)!;

  assert.equal(repaired.location, null, "invalid location (missing fields) becomes null");
  assert.deepEqual(repaired.household, ["adult"]);
  assert.equal(repaired.demoCity, "mumbai");
  assert.equal(repaired.onboarded, false);
});

test("parseStoredProfile repairs malformed legacy profile instead of returning null", () => {
  const raw = JSON.stringify({
    location: DEFAULT_PROFILE.location,
    household: ["child", "older-adult"],
    transport: ["two-wheeler"],
    ventilation: ["purifier"],
    cooking: "daily",
    workspace: "mixed",
    commuteTime: "bad",
    commuteDistanceKm: 7,
    activity: "run",
    activityTime: "06:30",
    dataMode: "demo" as "auto" | "demo",
    demoCity: "delhi",
    onboarded: true,
  });

  const parsed = parseStoredProfile(raw);

  assert.notEqual(parsed, null);
  assert.equal(parsed!.onboarded, true);
  assert.deepEqual(parsed!.household, ["child", "older-adult"]);
  assert.equal(parsed!.commuteTime, DEFAULT_PROFILE.commuteTime);
});

test("effectiveLocation returns demo city location in demo mode", () => {
  const demoProfile = { ...freshOnboardingProfile(), dataMode: "demo" as "auto" | "demo", demoCity: "mumbai" };
  const loc = effectiveLocation(demoProfile);
  assert.equal(loc?.name, "Mumbai");

  const autoProfile = { ...freshOnboardingProfile(), dataMode: "auto" as "auto" | "demo", location: delhi.location };
  assert.equal(effectiveLocation(autoProfile)?.name, "Delhi");
});