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
import {
  createStoredProfile,
  deleteStoredProfile,
  parseProfiles,
  readProfileStore,
  activeIdAfterDelete,
  type StoredProfile,
} from "../src/lib/profiles";
import { buildDemoEnvironment } from "../src/lib/demo";
import type { HouseholdTag, TransportMode } from "../src/lib/types";

const delhi = buildDemoEnvironment("delhi");

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