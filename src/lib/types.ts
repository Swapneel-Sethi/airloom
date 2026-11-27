export type PollutantKey = "pm25" | "pm10" | "no2" | "so2" | "o3" | "co";

export type AqiCategory =
  | "good"
  | "moderate"
  | "elevated"
  | "high"
  | "very-high"
  | "severe";

export type DataSourceKind = "live" | "demo" | "cached";

export type Provenance =
  | "model-estimate"
  | "calculated"
  | "user-supplied"
  | "demo-seed";

export type Confidence = "high" | "medium" | "low";

export interface GeoLocation {
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface Pollutant {
  key: PollutantKey;
  label: string;
  value: number | null;
  unit: string;
  guideline: number | null;
  guidelineLabel: string;
  multipleOfGuideline: number | null;
}

export interface AqiBreakdown {
  key: PollutantKey;
  label: string;
  subIndex: number;
}

export interface AirQualityIndex {
  value: number;
  category: AqiCategory;
  categoryLabel: string;
  dominant: PollutantKey;
  dominantLabel: string;
  breakdown: AqiBreakdown[];
}

export interface WeatherSnapshot {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherLabel: string;
}

export interface HourPoint {
  time: string;
  hour: number;
  pm25: number | null;
  pm10: number | null;
  aqi: number | null;
  temperature: number | null;
  windSpeed: number | null;
  humidity: number | null;
  precipitationProbability: number | null;
}

export interface DayWindow {
  startHour: number;
  endHour: number;
  label: string;
  avgPm25: number;
  avgAqi: number;
}

export interface Environment {
  location: GeoLocation;
  source: DataSourceKind;
  provenance: Provenance;
  fetchedAt: string;
  currentTime: string;
  aqi: AirQualityIndex | null;
  pollutants: Pollutant[];
  weather: WeatherSnapshot | null;
  hourly: HourPoint[];
  today: {
    avgAqi: number;
    peakAqi: number;
    peakHour: number;
    lowAqi: number;
    lowHour: number;
    bestWindow: DayWindow;
    worstWindow: DayWindow;
  } | null;
  yesterdayAvgAqi: number | null;
  freshnessMinutes: number;
  limitations: string[];
  dataNote: string;
}

export type HouseholdTag =
  | "adult"
  | "child"
  | "older-adult"
  | "respiratory"
  | "outdoor-worker"
  | "commuter"
  | "wfh";

export type TransportMode =
  | "walk"
  | "cycle"
  | "transit"
  | "two-wheeler"
  | "car"
  | "remote";

export type Ventilation = "purifier" | "natural" | "mechanical" | "shared";

export type CookingFrequency = "rarely" | "sometimes" | "daily";

export type WorkspaceKind = "home" | "office" | "outdoors" | "mixed";

export type ActivityKind = "run" | "walk" | "cycle" | "cricket" | "none";

export interface UserProfile {
  location: GeoLocation | null;
  household: HouseholdTag[];
  transport: TransportMode[];
  ventilation: Ventilation[];
  cooking: CookingFrequency;
  workspace: WorkspaceKind;
  commuteTime: string;
  commuteDistanceKm: number;
  activity: ActivityKind;
  activityTime: string;
  dataMode: "auto" | "demo";
  demoCity: string;
  onboarded: boolean;
}

export type PlanBlock =
  | "morning"
  | "commute"
  | "midday"
  | "afternoon"
  | "evening"
  | "night";

export type RecommendationCategory =
  | "outdoor"
  | "indoor"
  | "transport"
  | "rest";

export interface Recommendation {
  id: string;
  block: PlanBlock;
  blockLabel: string;
  timeRange: string;
  startHour: number;
  action: string;
  reason: string;
  why: string[];
  impact: { label: string; value: string; basis: string } | null;
  confidence: Confidence;
  basis: string[];
  category: RecommendationCategory;
}

export interface DailyPlan {
  available: boolean;
  generatedAt: string;
  summary: string;
  headline: string;
  blocks: Recommendation[];
  bestWindow: DayWindow | null;
  worstWindow: DayWindow | null;
  outdoorExposureProxy: number | null;
  baselineExposureProxy: number | null;
  sensitivity: "standard" | "sensitive";
}

export interface RoomEstimate {
  name: string;
  pm25: number;
  note: string;
}

export type IndoorPriority = "now" | "today" | "this-week";

export interface IndoorAction {
  id: string;
  title: string;
  reason: string;
  detail: string;
  priority: IndoorPriority;
  effort: "low" | "medium";
}

export interface IndoorOutlook {
  available: boolean;
  outdoorPm25: number | null;
  infiltration: number;
  estimatedPm25: number | null;
  purifierAvailable: boolean;
  rooms: RoomEstimate[];
  actions: IndoorAction[];
  ventilationWindow: DayWindow | null;
  method: string;
}

export interface CommuteOption {
  mode: TransportMode;
  label: string;
  durationMin: number;
  exposureProxy: number;
  co2Kg: number;
  comfort: string;
  exposureClass: string;
  recommended: boolean;
  why: string;
}

export interface CommuteComparison {
  available: boolean;
  distanceKm: number;
  departureHour: number;
  ambientPm25: number;
  options: CommuteOption[];
  note: string;
}

export interface SustainableSwap {
  id: string;
  title: string;
  change: string;
  why: string;
  impact: string;
  effort: "low" | "medium" | "high";
  frequency: string;
  horizon: string;
  basis: string;
  co2SavedKgPerYear: number | null;
}

export interface CopilotAnswer {
  recommendation: string;
  why: string[];
  whatToDo: string[];
  alternative: string;
  dataUsed: string[];
  safetyNote: string | null;
}

export interface CopilotMeta {
  provider: "gemini" | "nemotron" | "rules";
  model: string | null;
  fallbackReason: string | null;
  promptVersion: string;
  latencyMs: number;
}
