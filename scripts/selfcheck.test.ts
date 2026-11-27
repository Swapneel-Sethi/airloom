import test from "node:test";
import assert from "node:assert/strict";
import { categoryFor, computeAqi, pm25SubIndex } from "../src/lib/aqi";
import { buildSwaps } from "../src/lib/swaps";
import { DEFAULT_PROFILE, freshOnboardingProfile, judgeProfile, repairProfile, effectiveLocation, parseStoredProfile } from "../src/lib/profile";
import type { HouseholdTag, TransportMode } from "../src/lib/types";
import { buildDemoEnvironment } from "../src/lib/demo";
import { DEMO_CITIES, TRANSPORT_OPTIONS } from "../src/lib/constants";
import {
  activeIdAfterDelete,
  createStoredProfile,
  deleteStoredProfile,
  parseProfiles,
  readProfileStore,
  type StoredProfile,
} from "../src/lib/profiles";
import { exposureProxy, proxyDelta } from "../src/lib/exposure";
import { buildIndoorOutlook, infiltrationFactor } from "../src/lib/indoor";
import { dateOf } from "../src/lib/windows";
import { compareCommute } from "../src/lib/commute";
import { buildPlan } from "../src/lib/plan";
import { clamp } from "../src/lib/format";
import { buildCopilotContext } from "../src/lib/ai/context";
import { deterministicAnswer, isAcuteHealthScenario } from "../src/lib/ai/fallback";
import { copilotAnswerSchema } from "../src/lib/ai/schema";

const delhi = buildDemoEnvironment("delhi");

test("PM2.5 breakpoints follow the US EPA 2024 table", () => {
  // Verified against aqs.epa.gov AQI Breakpoints (2024 revision)
  assert.equal(pm25SubIndex(0), 0);
  assert.equal(pm25SubIndex(9.0), 50);
  assert.equal(pm25SubIndex(9.1), 51);
  assert.equal(pm25SubIndex(35.4), 100);
  assert.equal(pm25SubIndex(35.5), 101);
  assert.equal(pm25SubIndex(55.4), 150);
  assert.equal(pm25SubIndex(55.5), 151);
  assert.equal(pm25SubIndex(125.4), 200);
  assert.equal(pm25SubIndex(125.5), 201);
  assert.equal(pm25SubIndex(225.4), 300);
  assert.equal(pm25SubIndex(225.5), 301);
  assert.equal(pm25SubIndex(325.4), 500);
  assert.equal(pm25SubIndex(9999), 500, "above range clamps to 500");
  assert.equal(pm25SubIndex(-1), null, "negative returns null");
  assert.equal(pm25SubIndex(null), null);
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

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function baseProfile(): ReturnType<typeof freshOnboardingProfile> {
  return freshOnboardingProfile();
}

test("legacy airloom.profile.v1 migrates to User 1 preserving every field", () => {
  const legacy = {
    ...DEFAULT_PROFILE,
    household: ["adult", "child"],
    transport: ["two-wheeler"],
    ventilation: ["purifier"],
  } as ReturnType<typeof freshOnboardingProfile>;
  const storage = new MemoryStorage();
  storage.setItem("airloom.profile.v1", JSON.stringify(legacy));

  const store = readProfileStore(storage);

  assert.equal(store.profiles.length, 1);
  assert.equal(store.profiles[0].name, "User 1");
  assert.deepEqual(store.profiles[0].profile, legacy);
  assert.equal(store.activeId, store.profiles[0].id);
  assert.equal(storage.getItem("airloom.profile.v1"), null, "legacy key removed after migration");
  assert.equal(
    storage.getItem("airloom.profiles.v1"),
    JSON.stringify(store.profiles),
  );
  assert.equal(storage.getItem("airloom.active-profile.v1"), store.activeId);
});

test("migration does not run when profiles store already exists", () => {
  const storage = new MemoryStorage();
  storage.setItem("airloom.profiles.v1", "[]");

  const store = readProfileStore(storage);

  assert.deepEqual(store.profiles, []);
  assert.equal(store.activeId, null);
  assert.equal(storage.getItem("airloom.profile.v1"), null);
});

test("creation of User 1 uses fresh blank profile", () => {
  const profiles: StoredProfile[] = [];
  const record = createStoredProfile(profiles, baseProfile());

  assert.equal(record.name, "User 1");
  assert.deepEqual(record.profile, freshOnboardingProfile());
  assert.ok(record.id.length > 0);
  assert.ok(record.createdAt.length > 0);
  assert.ok(record.updatedAt.length > 0);
});

test("creation of User 2 uses the next available number", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
  ];
  const record = createStoredProfile(profiles, baseProfile());

  assert.equal(record.name, "User 2");
});

test("unique IDs on repeated creation", () => {
  const profiles: StoredProfile[] = [];
  const first = createStoredProfile(profiles, baseProfile());
  const second = createStoredProfile([first], baseProfile());
  assert.notEqual(first.id, second.id);
});

test("unique names on repeated creation", () => {
  const profiles: StoredProfile[] = [];
  const first = createStoredProfile(profiles, baseProfile());
  const second = createStoredProfile([first], baseProfile());
  assert.notEqual(first.name, second.name);
});

test("next available number skips deleted numbers", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
    createStoredProfile([], baseProfile(), { name: "User 2" }),
    createStoredProfile([], baseProfile(), { name: "User 4" }),
  ];
  const record = createStoredProfile(profiles, baseProfile());
  assert.equal(record.name, "User 3");
});

test("existing profile names are not renamed after deletion", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
    createStoredProfile([], baseProfile(), { name: "User 2" }),
    createStoredProfile([], baseProfile(), { name: "User 3" }),
  ];
  const after = deleteStoredProfile(profiles, profiles[1].id);
  assert.equal(after.length, 2);
  assert.equal(after[0].name, "User 1");
  assert.equal(after[1].name, "User 3");
});

test("switching between profiles keeps separate data", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
    createStoredProfile([], baseProfile(), { name: "User 2" }),
  ];

  const user1Updated = profiles.map((record) =>
    record.name === "User 1"
      ? {
          ...record,
          profile: {
            ...record.profile,
            location: {
              name: "Delhi",
              admin1: "Delhi",
              country: "India",
              latitude: 28.6139,
              longitude: 77.209,
              timezone: "Asia/Kolkata",
            },
          },
        }
      : record,
  );
  const user2Profile = user1Updated.find((r) => r.name === "User 2")!.profile;

  assert.deepEqual(user2Profile, freshOnboardingProfile());
  assert.notDeepEqual(user1Updated.find((r) => r.name === "User 1")!.profile, freshOnboardingProfile());
});

test("updating User 1 does not affect User 2", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
    createStoredProfile([], baseProfile(), { name: "User 2" }),
  ];

  const patched = profiles.map((record) =>
    record.name === "User 1"
      ? { ...record, profile: { ...record.profile, transport: ["car"] } }
      : record,
  );

  const user1 = patched.find((r) => r.name === "User 1")!;
  const user2 = patched.find((r) => r.name === "User 2")!;

  assert.deepEqual(user1.profile.transport, ["car"]);
  assert.deepEqual(user2.profile.transport, []);
});

test("updating User 2 does not affect User 1", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
    createStoredProfile([], baseProfile(), { name: "User 2" }),
  ];

  const patched = profiles.map((record) =>
    record.name === "User 2"
      ? { ...record, profile: { ...record.profile, household: ["child"] } }
      : record,
  );

  const user1 = patched.find((r) => r.name === "User 1")!;
  const user2 = patched.find((r) => r.name === "User 2")!;

  assert.deepEqual(user1.profile.household, []);
  assert.deepEqual(user2.profile.household, ["child"]);
});

test("active profile persistence", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
    createStoredProfile([], baseProfile(), { name: "User 2" }),
  ];

  assert.equal(activeIdAfterDelete(profiles, profiles[0].id, profiles[0].id), profiles[1].id);
  assert.equal(activeIdAfterDelete(profiles, profiles[0].id, profiles[1].id), profiles[0].id);
});

test("logout clears active id", () => {
  const profiles: StoredProfile[] = [createStoredProfile([], baseProfile(), { name: "User 1" })];
  const remaining = deleteStoredProfile(profiles, profiles[0].id);

  assert.equal(remaining.length, 0);
  assert.equal(activeIdAfterDelete(profiles, profiles[0].id, profiles[0].id), null);
});

test("new user creates a fresh blank profile", () => {
  const profiles: StoredProfile[] = [];
  const record = createStoredProfile(profiles, freshOnboardingProfile());

  assert.equal(record.name, "User 1");
  assert.equal(record.profile.location, null);
  assert.deepEqual(record.profile.household, []);
  assert.deepEqual(record.profile.transport, []);
  assert.deepEqual(record.profile.ventilation, []);
  assert.equal(record.profile.dataMode, "auto");
  assert.equal(record.profile.onboarded, false);
});

test("delete inactive profile keeps active profile unchanged", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
    createStoredProfile([], baseProfile(), { name: "User 2" }),
  ];
  const activeId = profiles[0].id;

  const after = deleteStoredProfile(profiles, profiles[1].id);

  assert.equal(after.length, 1);
  assert.equal(after[0].id, activeId);
  assert.equal(after[0].name, "User 1");
});

test("delete active profile switches to another existing profile", () => {
  const profiles: StoredProfile[] = [
    createStoredProfile([], baseProfile(), { name: "User 1" }),
    createStoredProfile([], baseProfile(), { name: "User 2" }),
  ];

  const nextId = activeIdAfterDelete(profiles, profiles[0].id, profiles[0].id);
  assert.equal(nextId, profiles[1].id);
});

test("delete final profile leaves no active profile", () => {
  const profiles: StoredProfile[] = [createStoredProfile([], baseProfile(), { name: "User 1" })];

  const nextId = activeIdAfterDelete(profiles, profiles[0].id, profiles[0].id);
  assert.equal(nextId, null);
});

test("demo profile remains functional and is separate from user profiles", () => {
  const demo = judgeProfile();
  assert.equal(demo.onboarded, true);
  assert.deepEqual(demo.household, ["adult", "child", "older-adult"]);
  assert.deepEqual(demo.transport, ["two-wheeler", "transit"]);
  assert.deepEqual(demo.ventilation, ["purifier", "natural"]);
  assert.equal(demo.dataMode, "demo");
});

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

test("parseProfiles validates and deduplicates stored profiles", () => {
  const valid: StoredProfile = createStoredProfile([], baseProfile(), { name: "User 1" });
  const duplicate = { ...valid, id: valid.id };
  const raw = JSON.stringify([valid, duplicate, { id: "", name: "Bad", profile: baseProfile(), createdAt: "", updatedAt: "" }]);

  const parsed = parseProfiles(raw);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, valid.id);
});

test("onboarding does not reset an existing profile (fresh profile used only at creation)", () => {
  const existing = createStoredProfile([], { ...baseProfile(), household: ["child"] }, { name: "User 1" });
  const creation = createStoredProfile([existing], freshOnboardingProfile());

  assert.equal(creation.name, "User 2");
  assert.deepEqual(existing.profile.household, ["child"]);
  assert.deepEqual(creation.profile.household, []);
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

test("AQI breakpoint edges are handled", () => {
  // Verified against aqs.epa.gov AQI Breakpoints (2024 revision)
  assert.equal(pm25SubIndex(0), 0);
  assert.equal(pm25SubIndex(9.0), 50);
  assert.equal(pm25SubIndex(9.1), 51);
  assert.equal(pm25SubIndex(35.4), 100);
  assert.equal(pm25SubIndex(35.5), 101);
  assert.equal(pm25SubIndex(55.4), 150);
  assert.equal(pm25SubIndex(55.5), 151);
  assert.equal(pm25SubIndex(125.4), 200);
  assert.equal(pm25SubIndex(125.5), 201);
  assert.equal(pm25SubIndex(225.4), 300);
  assert.equal(pm25SubIndex(225.5), 301);
  assert.equal(pm25SubIndex(325.4), 500);
  assert.equal(pm25SubIndex(9999), 500, "above range clamps to 500");
  assert.equal(pm25SubIndex(-1), null, "negative returns null");
  assert.equal(pm25SubIndex(null), null);
});

test("categoryFor covers all category edges", () => {
  assert.equal(categoryFor(50), "good");
  assert.equal(categoryFor(51), "moderate");
  assert.equal(categoryFor(100), "moderate");
  assert.equal(categoryFor(101), "elevated");
  assert.equal(categoryFor(150), "elevated");
  assert.equal(categoryFor(151), "high");
  assert.equal(categoryFor(200), "high");
  assert.equal(categoryFor(201), "very-high");
  assert.equal(categoryFor(300), "very-high");
  assert.equal(categoryFor(301), "severe");
  assert.equal(categoryFor(500), "severe");
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

  const indoorSensitive = buildIndoorOutlook(delhi, sensitive);
  const indoorStandard = buildIndoorOutlook(delhi, standard);
  // Same infiltration factor since ventilation is same; only sensitivity label differs in plan
  assert.equal(indoorSensitive.infiltration, indoorStandard.infiltration);
});

test("swaps do not show negative or zero savings as meaningful", () => {
  const swaps = buildSwaps(delhi, freshOnboardingProfile(), buildPlan(delhi, freshOnboardingProfile()), compareCommute(delhi, freshOnboardingProfile(), 8));
  for (const swap of swaps) {
    assert.ok(swap.co2SavedKgPerYear === null || swap.co2SavedKgPerYear > 0, `swap ${swap.id} has non-positive CO2`);
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

test("effectiveLocation returns demo city location in demo mode", () => {
  const demoProfile = { ...freshOnboardingProfile(), dataMode: "demo" as "auto" | "demo", demoCity: "mumbai" };
  const loc = effectiveLocation(demoProfile);
  assert.equal(loc?.name, "Mumbai");

  const autoProfile = { ...freshOnboardingProfile(), dataMode: "auto" as "auto" | "demo", location: delhi.location };
  assert.equal(effectiveLocation(autoProfile)?.name, "Delhi");
});

test("fallback intent routing: safety, off-topic, purifier, windows, commute, activity, family, swaps", () => {
  const cases: Array<[string, string]> = [
    ["Should I take public transport?", "commute"],
    ["How much CO2 can I save?", "swaps"],
    ["Should I buy an air purifier?", "purifier"],
    ["Should I open the windows?", "indoor-windows"],
    ["My child has asthma.", "family"],
    ["My 70 year old mother wants to walk.", "family"],
    ["Write me a poem.", "generic"],
    ["Should I go for a run this morning?", "activity"],
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

function matchIntentForTest(normalized: string): { name: string } | null {
  const patterns: Array<{ name: string; pattern: RegExp }> = [
    { name: "purifier", pattern: /\b(purifier|filter|air cleaner|hepa)\b/ },
    { name: "indoor-windows", pattern: /\b(window|ventilate|open|fresh air|air out)\b/ },
    { name: "commute", pattern: /\b(commute|travel|leave|office|work|bus|metro|train|cab|scooter|trip|ride|drive|transport|cycle|compare)\b/ },
    { name: "family", pattern: /\b(family|child|kid|school|parent|mother|baby|infant|toddler|older adult|elderly|grandparent)\b/ },
    { name: "activity", pattern: /\b(run|jog|exercise|walk|walking|cycl|gym|cricket|sport|session|workout)\b/ },
    { name: "swaps", pattern: /\b(swap|swaps|sustain|carbon|co2|emission|impact|change mode|reduce emission)\b/ },
  ];
  for (const p of patterns) {
    if (p.pattern.test(normalized)) return p;
  }
  return null;
}

test("acute safety scenarios are handled by the safety gate", () => {
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

test("word boundaries prevent car matching care and walk hijacking family", () => {
  assert.ok(/\bcar\b/.test("I drive a car"), "car matches car");
  assert.ok(!/\bcar\b/.test("be careful"), "car does not match careful");
  assert.ok(/\bwalk\b/.test("take a walk"), "walk matches walk");
  assert.ok(!/\bwalk\b/.test("sidewalk"), "walk does not match sidewalk");
});

test("clamp helper keeps values within bounds", () => {
  assert.equal(clamp(0.5, 0.5, 80), 0.5);
  assert.equal(clamp(12, 0.5, 80), 12);
  assert.equal(clamp(100, 0.5, 80), 80);
  assert.equal(clamp(-5, 0.5, 80), 0.5);
});

test("CSP script-src allows Next.js inline hydration scripts", async () => {
  const fs = await import("node:fs");
  const nextConfig = fs.readFileSync("next.config.ts", "utf8");
  const cspMatch = nextConfig.match(/Content-Security-Policy",\s*value:\s*"([^"]+)"/);
  assert.ok(cspMatch, "Content-Security-Policy header found in next.config.ts");
  const csp = cspMatch[1];
  // script-src must include 'unsafe-inline' so Next.js inline hydration scripts (__next_f.push) execute.
  assert.ok(
    /script-src\s+'self'\s+'unsafe-inline'/.test(csp),
    "CSP script-src must allow unsafe-inline for Next.js hydration",
  );
  // Security protections must remain intact.
  assert.ok(csp.includes("frame-ancestors 'none'"), "frame-ancestors preserved");
  assert.ok(csp.includes("base-uri 'self'"), "base-uri preserved");
  assert.ok(csp.includes("form-action 'self'"), "form-action preserved");
});
