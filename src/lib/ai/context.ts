import type {
  CommuteComparison,
  DailyPlan,
  Environment,
  IndoorOutlook,
  UserProfile,
} from "../types";
import { HOUSEHOLD_OPTIONS, TRANSPORT_OPTIONS } from "../constants";
import { formatNumber } from "../format";

export interface CopilotContext {
  location: string;
  localTime: string;
  dataSource: string;
  freshness: string;
  aqi: { value: number; category: string; dominant: string } | null;
  pollutants: Array<{
    label: string;
    value: number;
    unit: string;
    timesGuideline: number | null;
  }>;
  weather: { temperature: number; humidity: number; wind: number; condition: string } | null;
  dayAverages: { averageAqi: number; peakAqi: number; peakHour: string } | null;
  bestWindow: { label: string; pm25: number; aqi: number } | null;
  worstWindow: { label: string; pm25: number; aqi: number } | null;
  exposure: { plannedProxy: number | null; currentRoutineProxy: number | null };
  plan: Array<{
    block: string;
    time: string;
    action: string;
    reason: string;
    impact: string | null;
  }>;
  indoor: {
    outdoorPm25: number | null;
    estimatedPm25: number | null;
    ventilationWindow: string | null;
    actions: string[];
  };
  commute: {
    ambientPm25: number;
    distanceKm: number;
    departureHour: string;
    options: Array<{
      mode: string;
      minutes: number;
      exposureProxy: number;
      co2Kg: number;
      recommended: boolean;
    }>;
  };
  profile: {
    household: string[];
    transport: string[];
    ventilation: string[];
    cooking: string;
    workspace: string;
    commuteTime: string;
    activity: string;
    activityTime: string;
    sensitivity: string;
  };
}

function householdLabel(tag: string): string {
  return HOUSEHOLD_OPTIONS.find((option) => option.value === tag)?.label ?? tag;
}

function transportLabel(mode: string): string {
  return TRANSPORT_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}

export function buildCopilotContext(
  environment: Environment,
  profile: UserProfile,
  plan: DailyPlan,
  indoor: IndoorOutlook,
  commute: CommuteComparison,
): CopilotContext {
  return {
    location: environment.location.name,
    localTime: `${environment.currentTime.slice(0, 10)} ${environment.currentTime.slice(11, 16)} local`,
    dataSource:
      environment.source === "demo"
        ? "Demo scenario with seeded values"
        : environment.source === "cached"
          ? "Cached reading from an earlier request"
          : "Live Open-Meteo model output",
    freshness:
      environment.source === "demo"
        ? "Seeded scenario, not a live reading"
        : `${environment.freshnessMinutes} minutes since the model timestamp`,
    aqi: environment.aqi
      ? {
          value: environment.aqi.value,
          category: environment.aqi.categoryLabel,
          dominant: environment.aqi.dominantLabel,
        }
      : null,
    pollutants: environment.pollutants.map((item) => ({
      label: item.label,
      value: item.value ?? 0,
      unit: item.unit,
      timesGuideline: item.multipleOfGuideline,
    })),
    weather: environment.weather
      ? {
          temperature: environment.weather.temperature,
          humidity: environment.weather.humidity,
          wind: environment.weather.windSpeed,
          condition: environment.weather.weatherLabel,
        }
      : null,
    dayAverages: environment.today
      ? {
          averageAqi: environment.today.avgAqi,
          peakAqi: environment.today.peakAqi,
          peakHour: `${String(environment.today.peakHour).padStart(2, "0")}:00`,
        }
      : null,
    bestWindow: plan.bestWindow
      ? {
          label: plan.bestWindow.label,
          pm25: plan.bestWindow.avgPm25,
          aqi: plan.bestWindow.avgAqi,
        }
      : null,
    worstWindow: plan.worstWindow
      ? {
          label: plan.worstWindow.label,
          pm25: plan.worstWindow.avgPm25,
          aqi: plan.worstWindow.avgAqi,
        }
      : null,
    exposure: {
      plannedProxy: plan.outdoorExposureProxy,
      currentRoutineProxy: plan.baselineExposureProxy,
    },
    plan: plan.blocks.map((block) => ({
      block: block.blockLabel,
      time: block.timeRange,
      action: block.action,
      reason: block.reason,
      impact: block.impact
        ? `${block.impact.label}: ${block.impact.value} (${block.impact.basis})`
        : null,
    })),
    indoor: {
      outdoorPm25: indoor.outdoorPm25,
      estimatedPm25: indoor.estimatedPm25,
      ventilationWindow: indoor.ventilationWindow?.label ?? null,
      actions: indoor.actions.map((action) => action.title),
    },
    commute: {
      ambientPm25: commute.ambientPm25,
      distanceKm: commute.distanceKm,
      departureHour: `${String(commute.departureHour).padStart(2, "0")}:00`,
      options: commute.options.map((option) => ({
        mode: transportLabel(option.mode),
        minutes: option.durationMin,
        exposureProxy: option.exposureProxy,
        co2Kg: option.co2Kg,
        recommended: option.recommended,
      })),
    },
    profile: {
      household: profile.household.map(householdLabel),
      transport: profile.transport.map(transportLabel),
      ventilation: profile.ventilation,
      cooking: profile.cooking,
      workspace: profile.workspace,
      commuteTime: profile.commuteTime,
      activity: profile.activity,
      activityTime: profile.activityTime,
      sensitivity: plan.sensitivity,
    },
  };
}

export function contextSummary(context: CopilotContext): string {
  const parts: string[] = [];
  if (context.aqi) {
    parts.push(
      `AQI ${context.aqi.value} (${context.aqi.category}), driven by ${context.aqi.dominant}`,
    );
  }
  const pm25 = context.pollutants.find((item) => item.label === "PM2.5");
  if (pm25) {
    parts.push(`PM2.5 ${formatNumber(pm25.value, 0)} ${pm25.unit}`);
  }
  if (context.bestWindow) {
    parts.push(`best window ${context.bestWindow.label}`);
  }
  if (context.indoor.estimatedPm25 !== null) {
    parts.push(`indoor estimate ${formatNumber(context.indoor.estimatedPm25, 0)} µg/m³`);
  }
  return parts.join(". ");
}
