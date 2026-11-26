import { z } from "zod";
import { DEFAULT_DEMO_CITY, DEMO_CITIES } from "./constants";
import type {
  ActivityKind,
  CookingFrequency,
  GeoLocation,
  HouseholdTag,
  TransportMode,
  UserProfile,
  Ventilation,
  WorkspaceKind,
} from "./types";

export const DEFAULT_PROFILE: UserProfile = {
  location: DEMO_CITIES[DEFAULT_DEMO_CITY].location,
  household: ["adult", "child", "older-adult"],
  transport: ["two-wheeler", "transit"],
  ventilation: ["purifier", "natural"],
  cooking: "daily",
  workspace: "mixed",
  commuteTime: "08:30",
  commuteDistanceKm: 7,
  activity: "run",
  activityTime: "06:30",
  dataMode: "demo",
  demoCity: DEFAULT_DEMO_CITY,
  onboarded: false,
};

export function judgeProfile(): UserProfile {
  return { ...DEFAULT_PROFILE, onboarded: true };
}

export function freshOnboardingProfile(): UserProfile {
  return {
    ...DEFAULT_PROFILE,
    location: null,
    household: [],
    transport: [],
    ventilation: [],
    dataMode: "auto",
    onboarded: false,
  };
}

const locationSchema = z.object({
  name: z.string().min(1),
  admin1: z.string().optional(),
  country: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
});

export const profileSchema = z.object({
  location: locationSchema.nullable(),
  household: z.array(
    z.enum(["adult", "child", "older-adult", "respiratory", "outdoor-worker", "commuter", "wfh"]),
  ),
  transport: z.array(
    z.enum(["walk", "cycle", "transit", "two-wheeler", "car", "remote"]),
  ),
  ventilation: z.array(z.enum(["purifier", "natural", "mechanical", "shared"])),
  cooking: z.enum(["rarely", "sometimes", "daily"]),
  workspace: z.enum(["home", "office", "outdoors", "mixed"]),
  commuteTime: z.string().regex(/^\d{2}:\d{2}$/),
  commuteDistanceKm: z.number().min(0.5).max(80),
  activity: z.enum(["run", "walk", "cycle", "cricket", "none"]),
  activityTime: z.string().regex(/^\d{2}:\d{2}$/),
  dataMode: z.enum(["auto", "demo"]),
  demoCity: z.string().min(1),
  onboarded: z.boolean(),
});

export function parseStoredProfile(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    return repairProfile(record);
  } catch {
    return null;
  }
}

export function repairProfile(record: Record<string, unknown>): UserProfile | null {
  const location = readLocation(record.location);
  const household = readStringArray(record.household, [
    "adult",
    "child",
    "older-adult",
    "respiratory",
    "outdoor-worker",
    "commuter",
    "wfh",
  ]) as HouseholdTag[];
  const transport = readStringArray(record.transport, [
    "walk",
    "cycle",
    "transit",
    "two-wheeler",
    "car",
    "remote",
  ]) as TransportMode[];
  const ventilation = readStringArray(record.ventilation, [
    "purifier",
    "natural",
    "mechanical",
    "shared",
  ]) as Ventilation[];
  const cooking = readEnum(record.cooking, ["rarely", "sometimes", "daily"], "daily") as CookingFrequency;
  const workspace = readEnum(
    record.workspace,
    ["home", "office", "outdoors", "mixed"],
    "mixed",
  ) as WorkspaceKind;
  const commuteTime = readTime(record.commuteTime ?? DEFAULT_PROFILE.commuteTime);
  const commuteDistanceKm = readNumber(
    record.commuteDistanceKm,
    DEFAULT_PROFILE.commuteDistanceKm,
    0.5,
    80,
  );
  const activity = readEnum(
    record.activity,
    ["run", "walk", "cycle", "cricket", "none"],
    DEFAULT_PROFILE.activity,
  ) as ActivityKind;
  const activityTime = readTime(record.activityTime ?? DEFAULT_PROFILE.activityTime);
  const dataMode = readEnum(record.dataMode, ["auto", "demo"], "auto") as "auto" | "demo";
  const demoCity = readString(record.demoCity, DEFAULT_PROFILE.demoCity) as string;
  const onboarded = readBoolean(record.onboarded, DEFAULT_PROFILE.onboarded);

  return {
    location,
    household,
    transport,
    ventilation,
    cooking,
    workspace,
    commuteTime,
    commuteDistanceKm,
    activity,
    activityTime,
    dataMode,
    demoCity,
    onboarded,
  };
}

function readLocation(value: unknown): GeoLocation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const name = readString(record.name, null);
  const country = readString(record.country, null);
  const latitude = readNumber(record.latitude ?? NaN, NaN, -90, 90);
  const longitude = readNumber(record.longitude ?? NaN, NaN, -180, 180);
  const timezone = readString(record.timezone, null);
  if (
    !name ||
    !country ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !timezone
  )
    return null;
  return {
    name,
    admin1: readString(record.admin1, undefined) as string | undefined,
    country,
    latitude,
    longitude,
    timezone,
  };
}

function readStringArray(
  value: unknown,
  allowed: string[],
): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && allowed.includes(item),
  );
}

function readEnum(
  value: unknown,
  allowed: string[],
  fallback: string,
): string {
  if (typeof value === "string" && allowed.includes(value)) return value;
  return fallback;
}

function readString(
  value: unknown,
  fallback: string | null | undefined,
): string | null | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return fallback;
}

function readTime(value: unknown): string {
  if (
    typeof value === "string" &&
    /^\d{2}:\d{2}$/.test(value)
  ) {
    return value;
  }
  return DEFAULT_PROFILE.commuteTime;
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(max, Math.max(min, value));
  }
  return fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

export function parseStoredProfileStrict(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    const parsed = profileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function hasSensitivity(profile: UserProfile): boolean {
  return profile.household.some((tag) =>
    ["child", "older-adult", "respiratory"].includes(tag),
  );
}

export function locationLabel(location: GeoLocation | null): string {
  if (!location) return "No location selected";
  return location.admin1 && location.admin1 !== location.name
    ? `${location.name}, ${location.admin1}`
    : location.name;
}

export function effectiveLocation(profile: UserProfile): GeoLocation | null {
  if (profile.dataMode === "demo") {
    const city = DEMO_CITIES[profile.demoCity];
    return city ? city.location : profile.location;
  }
  return profile.location;
}

export function effectiveLocationLabel(profile: UserProfile): string {
  return locationLabel(effectiveLocation(profile));
}
