import { z } from "zod";
import { parseStoredProfile, profileSchema } from "./profile";
import type { UserProfile } from "./types";

export const PROFILES_STORAGE_KEY = "airloom.profiles.v1";
export const ACTIVE_PROFILE_STORAGE_KEY = "airloom.active-profile.v1";
export const LEGACY_PROFILE_STORAGE_KEY = "airloom.profile.v1";
export const DEMO_PROFILE_STORAGE_KEY = "airloom.demo-profile.v1";
export const DEMO_PROFILE_ID = "demo";
export const DEMO_PROFILE_NAME = "Delhi demo";

export interface StoredProfile {
  id: string;
  name: string;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileStore {
  profiles: StoredProfile[];
  activeId: string | null;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const storedProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  profile: profileSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseProfiles(raw: string | null): StoredProfile[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const profiles: StoredProfile[] = [];
    const ids = new Set<string>();
    for (const item of parsed) {
      const result = storedProfileSchema.safeParse(item);
      if (!result.success || ids.has(result.data.id)) continue;
      ids.add(result.data.id);
      profiles.push(result.data);
    }
    return profiles;
  } catch {
    return [];
  }
}

export function nextProfileNumber(profiles: StoredProfile[]): number {
  const used = new Set<number>();
  for (const record of profiles) {
    const match = record.name.match(/^User (\d+)$/);
    if (match) used.add(Number(match[1]));
  }
  let candidate = 1;
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

export function createStoredProfile(
  profiles: StoredProfile[],
  profile: UserProfile,
  options: { name?: string; id?: string; now?: string } = {},
): StoredProfile {
  const timestamp = options.now ?? nowIso();
  return {
    id: options.id ?? createId(),
    name: options.name ?? `User ${nextProfileNumber(profiles)}`,
    profile,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateStoredProfile(
  profiles: StoredProfile[],
  id: string,
  profile: UserProfile,
  now: string = nowIso(),
): StoredProfile[] {
  return profiles.map((record) =>
    record.id === id ? { ...record, profile, updatedAt: now } : record,
  );
}

export function deleteStoredProfile(profiles: StoredProfile[], id: string): StoredProfile[] {
  return profiles.filter((record) => record.id !== id);
}

export function activeIdAfterDelete(
  profiles: StoredProfile[],
  activeId: string | null,
  deletedId: string,
): string | null {
  const remaining = deleteStoredProfile(profiles, deletedId);
  if (activeId !== deletedId) return activeId;
  return remaining[0]?.id ?? null;
}

export function readProfileStore(storage: KeyValueStorage): ProfileStore {
  const rawProfiles = storage.getItem(PROFILES_STORAGE_KEY);

  if (rawProfiles !== null) {
    const profiles = parseProfiles(rawProfiles);
    const rawActive = storage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    const activeId =
      rawActive === DEMO_PROFILE_ID || profiles.some((record) => record.id === rawActive)
        ? rawActive
        : null;
    return { profiles, activeId };
  }

  const legacy = parseStoredProfile(storage.getItem(LEGACY_PROFILE_STORAGE_KEY));
  if (!legacy) return { profiles: [], activeId: null };

  const migrated = createStoredProfile([], legacy, { name: "User 1" });
  const store: ProfileStore = { profiles: [migrated], activeId: migrated.id };
  saveProfileStore(storage, store);
  storage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
  return store;
}

export function saveProfiles(storage: KeyValueStorage, profiles: StoredProfile[]): void {
  storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export function saveActiveId(storage: KeyValueStorage, activeId: string | null): void {
  if (activeId) {
    storage.setItem(ACTIVE_PROFILE_STORAGE_KEY, activeId);
  } else {
    storage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
  }
}

export function saveProfileStore(storage: KeyValueStorage, store: ProfileStore): void {
  saveProfiles(storage, store.profiles);
  saveActiveId(storage, store.activeId);
}

export function readDemoProfile(storage: KeyValueStorage): UserProfile | null {
  return parseStoredProfile(storage.getItem(DEMO_PROFILE_STORAGE_KEY));
}

export function saveDemoProfile(storage: KeyValueStorage, profile: UserProfile | null): void {
  if (profile) {
    storage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } else {
    storage.removeItem(DEMO_PROFILE_STORAGE_KEY);
  }
}
