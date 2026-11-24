import type {
  ActivityKind,
  AqiCategory,
  CookingFrequency,
  GeoLocation,
  HouseholdTag,
  PollutantKey,
  TransportMode,
  Ventilation,
  WorkspaceKind,
} from "./types";

export const POLLUTANTS: Record<
  PollutantKey,
  { label: string; unit: string; guideline: number | null; guidelineLabel: string }
> = {
  pm25: {
    label: "PM2.5",
    unit: "µg/m³",
    guideline: 15,
    guidelineLabel: "WHO 2021 24 hour guideline",
  },
  pm10: {
    label: "PM10",
    unit: "µg/m³",
    guideline: 45,
    guidelineLabel: "WHO 2021 24 hour guideline",
  },
  no2: {
    label: "NO2",
    unit: "µg/m³",
    guideline: 25,
    guidelineLabel: "WHO 2021 24 hour guideline",
  },
  so2: {
    label: "SO2",
    unit: "µg/m³",
    guideline: 40,
    guidelineLabel: "WHO 2021 24 hour guideline",
  },
  o3: {
    label: "O3",
    unit: "µg/m³",
    guideline: 100,
    guidelineLabel: "WHO 2021 8 hour guideline",
  },
  co: {
    label: "CO",
    unit: "µg/m³",
    guideline: 4000,
    guidelineLabel: "WHO 2021 24 hour guideline",
  },
};

export const AQI_CATEGORIES: Record<
  AqiCategory,
  { label: string; max: number; token: string }
> = {
  good: { label: "Good", max: 50, token: "var(--sev-good)" },
  moderate: { label: "Moderate", max: 100, token: "var(--sev-moderate)" },
  elevated: { label: "Elevated", max: 150, token: "var(--sev-elevated)" },
  high: { label: "High", max: 200, token: "var(--sev-high)" },
  "very-high": { label: "Very high", max: 300, token: "var(--sev-very-high)" },
  severe: { label: "Severe", max: 500, token: "var(--sev-severe)" },
};

export const HOUSEHOLD_OPTIONS: {
  value: HouseholdTag;
  label: string;
  hint: string;
}[] = [
  { value: "adult", label: "Adult", hint: "Baseline profile" },
  { value: "child", label: "Child", hint: "Lower exposure thresholds" },
  { value: "older-adult", label: "Older adult", hint: "Lower exposure thresholds" },
  { value: "respiratory", label: "Sensitive respiratory needs", hint: "Lower exposure thresholds" },
  { value: "outdoor-worker", label: "Outdoor worker", hint: "Long outdoor hours" },
  { value: "commuter", label: "Daily commuter", hint: "Rush hour travel" },
  { value: "wfh", label: "Work from home", hint: "Remote option available" },
];

export const TRANSPORT_OPTIONS: {
  value: TransportMode;
  label: string;
  speedKmh: number;
  co2PerKm: number;
  exposureFactor: number;
  comfort: string;
}[] = [
  {
    value: "walk",
    label: "Walking",
    speedKmh: 4.5,
    co2PerKm: 0,
    exposureFactor: 1,
    comfort: "Weather exposed",
  },
  {
    value: "cycle",
    label: "Cycling",
    speedKmh: 13,
    co2PerKm: 0,
    exposureFactor: 1.25,
    comfort: "Higher breathing rate",
  },
  {
    value: "transit",
    label: "Public transport",
    speedKmh: 17,
    co2PerKm: 0.103,
    exposureFactor: 0.65,
    comfort: "Sheltered, shared air",
  },
  {
    value: "two-wheeler",
    label: "Two wheeler",
    speedKmh: 24,
    co2PerKm: 0.085,
    exposureFactor: 1.1,
    comfort: "Direct road exposure",
  },
  {
    value: "car",
    label: "Car",
    speedKmh: 22,
    co2PerKm: 0.17,
    exposureFactor: 0.45,
    comfort: "Cabin with recirculation",
  },
  {
    value: "remote",
    label: "Remote work",
    speedKmh: 0,
    co2PerKm: 0,
    exposureFactor: 0.08,
    comfort: "Indoor, no travel",
  },
];

export const VENTILATION_OPTIONS: { value: Ventilation; label: string }[] = [
  { value: "purifier", label: "Air purifier" },
  { value: "natural", label: "Windows and natural ventilation" },
  { value: "mechanical", label: "Mechanical ventilation with filters" },
  { value: "shared", label: "Shared indoor space" },
];

export const COOKING_OPTIONS: { value: CookingFrequency; label: string }[] = [
  { value: "rarely", label: "Rarely" },
  { value: "sometimes", label: "A few times a week" },
  { value: "daily", label: "Daily" },
];

export const WORKSPACE_OPTIONS: { value: WorkspaceKind; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
  { value: "outdoors", label: "Outdoors" },
  { value: "mixed", label: "Mixed" },
];

export const ACTIVITY_OPTIONS: { value: ActivityKind; label: string }[] = [
  { value: "run", label: "Running" },
  { value: "walk", label: "Walking" },
  { value: "cycle", label: "Cycling" },
  { value: "cricket", label: "Outdoor sport" },
  { value: "none", label: "No outdoor activity" },
];

export const ACTIVITY_MET: Record<ActivityKind, number> = {
  run: 1,
  walk: 0.6,
  cycle: 1.1,
  cricket: 0.8,
  none: 0,
};

export const DEMO_CITIES: Record<
  string,
  {
    location: GeoLocation;
    label: string;
    condition: string;
  }
> = {
  delhi: {
    label: "Delhi",
    condition: "Winter smog, severe morning peak",
    location: {
      name: "Delhi",
      admin1: "Delhi",
      country: "India",
      latitude: 28.6139,
      longitude: 77.209,
      timezone: "Asia/Kolkata",
    },
  },
  mumbai: {
    label: "Mumbai",
    condition: "Coastal haze, moderate",
    location: {
      name: "Mumbai",
      admin1: "Maharashtra",
      country: "India",
      latitude: 19.076,
      longitude: 72.8777,
      timezone: "Asia/Kolkata",
    },
  },
  bengaluru: {
    label: "Bengaluru",
    condition: "Clear day with traffic peaks",
    location: {
      name: "Bengaluru",
      admin1: "Karnataka",
      country: "India",
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: "Asia/Kolkata",
    },
  },
  kolkata: {
    label: "Kolkata",
    condition: "Humid haze, high evening",
    location: {
      name: "Kolkata",
      admin1: "West Bengal",
      country: "India",
      latitude: 22.5726,
      longitude: 88.3639,
      timezone: "Asia/Kolkata",
    },
  },
  lucknow: {
    label: "Lucknow",
    condition: "Stagnant air, very poor",
    location: {
      name: "Lucknow",
      admin1: "Uttar Pradesh",
      country: "India",
      latitude: 26.8467,
      longitude: 80.9462,
      timezone: "Asia/Kolkata",
    },
  },
};

export const DEFAULT_DEMO_CITY = "delhi";

export const SITE = {
  name: "Airloom",
  title: "Airloom | Urban Air Quality Intelligence",
  description:
    "Personalized air quality guidance, lower exposure routines, indoor air strategies, and sustainable choices for polluted days.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://airloom.vercel.app",
  disclaimer:
    "Airloom provides environmental guidance based on available data and is not a medical service. For medical concerns, follow advice from a qualified professional.",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/today", label: "Today" },
  { href: "/dashboard/exposure", label: "Exposure" },
  { href: "/dashboard/indoor", label: "Indoor" },
  { href: "/dashboard/swaps", label: "Swaps" },
  { href: "/dashboard/assistant", label: "Assistant" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;
