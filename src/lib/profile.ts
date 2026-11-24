import { z } from "zod";
import { DEFAULT_DEMO_CITY, DEMO_CITIES } from "./constants";
import type { GeoLocation, UserProfile } from "./types";

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
