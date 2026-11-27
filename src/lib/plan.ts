import { ACTIVITY_MET } from "./constants";
import { compareCommute, transportMeta } from "./commute";
import { formatNumber } from "./format";
import { estimateIndoorPm25 } from "./indoor";
import { hasSensitivity } from "./profile";
import type {
  Confidence,
  DailyPlan,
  DayWindow,
  Environment,
  PlanBlock,
  Recommendation,
  UserProfile,
} from "./types";
import {
  dateOf,
  findBestWindow,
  findWorstWindow,
  pm25AtHour,
  windowStats,
} from "./windows";

interface BlockDefinition {
  key: PlanBlock;
  label: string;
  start: number;
  end: number;
}

const BASE_BLOCKS: BlockDefinition[] = [
  { key: "morning", label: "Morning", start: 6, end: 9 },
  { key: "midday", label: "Midday", start: 11, end: 14 },
  { key: "afternoon", label: "Afternoon", start: 14, end: 17 },
  { key: "evening", label: "Evening", start: 17, end: 20 },
  { key: "night", label: "Night", start: 20, end: 23 },
];

const ACTIVITY_LABELS: Record<string, string> = {
  run: "run",
  walk: "walk",
  cycle: "ride",
  cricket: "outdoor sport session",
  none: "outdoor activity",
};

function shiftDate(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function resolveDate(
  start: number,
  end: number,
  currentHour: number,
  today: string,
): string {
  return end <= currentHour ? shiftDate(today, 1) : today;
}

function parseHour(time: string): number {
  const value = Number(time.slice(0, 2));
  return Number.isFinite(value) ? Math.min(23, Math.max(0, value)) : 8;
}

function timeLabel(date: string, start: number, end: number, today: string): string {
  const prefix = date === today ? "" : "Tomorrow, ";
  return `${prefix}${String(start).padStart(2, "0")}:00 to ${String(end).padStart(2, "0")}:00`;
}

function confidenceFor(
  start: number,
  date: string,
  today: string,
  source: Environment["source"],
): Confidence {
  if (source === "cached") return "medium";
  if (date !== today) return "medium";
  if (start <= 18) return "high";
  return "medium";
}

export function buildPlan(
  environment: Environment,
  profile: UserProfile,
): DailyPlan {
  const unavailable: DailyPlan = {
    available: false,
    generatedAt: new Date().toISOString(),
    summary:
      "A personalized plan needs a PM2.5 reading. The provider did not return one for this location.",
    headline: "Air quality data is unavailable for this location",
    blocks: [],
    bestWindow: null,
    worstWindow: null,
    outdoorExposureProxy: null,
    baselineExposureProxy: null,
    sensitivity: "standard",
  };

  if (!environment.aqi || !environment.today) return unavailable;

  const today = dateOf(environment.currentTime);
  const currentHour = Number(environment.currentTime.slice(11, 13));
  const sensitive = hasSensitivity(profile);
  const caution = sensitive ? 30 : 40;
  const high = sensitive ? 55 : 75;

  const windowCache = new Map<
    string,
    { best: DayWindow | null; worst: DayWindow | null }
  >();
  function windowsFor(date: string) {
    const existing = windowCache.get(date);
    if (existing) return existing;
    const fromHour = date === today ? currentHour : 6;
    const value = {
      best: findBestWindow(environment.hourly, date, fromHour),
      worst: findWorstWindow(environment.hourly, date, fromHour),
    };
    windowCache.set(date, value);
    return value;
  }

  const commuteHour = parseHour(profile.commuteTime);
  const commuteBlock: BlockDefinition = {
    key: "commute",
    label: "Commute",
    start: commuteHour,
    end: Math.min(24, commuteHour + 1),
  };

  const blocks = [...BASE_BLOCKS, commuteBlock].sort((a, b) => a.start - b.start);

  const activityHour = parseHour(profile.activityTime);
  const activityLabel = ACTIVITY_LABELS[profile.activity] ?? "outdoor activity";
  const activityMet = ACTIVITY_MET[profile.activity] ?? 1;
  const activityBlockKey: PlanBlock =
    activityHour < 11
      ? "morning"
      : activityHour < 14
        ? "midday"
        : activityHour < 17
          ? "afternoon"
          : activityHour < 20
            ? "evening"
            : "night";

  const activityDate = activityHour <= currentHour ? shiftDate(today, 1) : today;
  const activityPm =
    pm25AtHour(environment.hourly, activityDate, activityHour) ??
    windowStats(environment.hourly, activityDate, activityHour, activityHour + 1)
      .avgPm25;
  const activityBest = windowsFor(activityDate).best;
  const shouldMoveActivity =
    profile.activity !== "none" &&
    activityBest !== null &&
    activityPm > caution &&
    activityBest.avgPm25 < activityPm * 0.85;

  const commuteComparison = compareCommute(environment, profile, commuteHour);
  const recommendedCommute = commuteComparison.options.find(
    (option) => option.recommended,
  );
  const highestCommute = commuteComparison.options.reduce(
    (worst, option) => (option.exposureProxy > worst.exposureProxy ? option : worst),
    commuteComparison.options[0],
  );

  const indoorEstimate = estimateIndoorPm25(
    environment.pollutants.find((item) => item.key === "pm25")?.value ?? null,
    profile,
  );

  const recommendations: Recommendation[] = blocks.map((block) => {
    const date = resolveDate(block.start, block.end, currentHour, today);
    const stats = windowStats(environment.hourly, date, block.start, block.end);
    const windows = windowsFor(date);
    const pm = Math.round(stats.avgPm25 * 10) / 10;
    const aqi = Math.round(stats.avgAqi);
    const confidence = confidenceFor(block.start, date, today, environment.source);
    const baseBasis = [
      `${formatNumber(stats.count, 0)} hourly value${stats.count === 1 ? "" : "s"} averaged for ${block.label.toLowerCase()}`,
      environment.source === "demo"
        ? "Seeded demo scenario using Airloom's deterministic diurnal model"
        : "Open-Meteo CAMS PM2.5 model estimate",
    ];
    const sensitivityBasis = sensitive
      ? ["Household sensitivity selected, thresholds tightened by 25 percent"]
      : [];

    const base = {
      id: block.key,
      block: block.key,
      blockLabel: block.label,
      timeRange: timeLabel(date, block.start, block.end, today),
      startHour: block.start,
      confidence,
      basis: [...baseBasis, ...sensitivityBasis],
      category: "outdoor" as const,
      impact: null as Recommendation["impact"],
      action: "",
      reason: "",
      why: [] as string[],
    };

    if (block.key === "commute" && recommendedCommute) {
      const switchMode =
        recommendedCommute.mode !== profile.transport[0] &&
        commuteComparison.ambientPm25 >= caution;
      const exposureSaving =
        highestCommute && highestCommute.exposureProxy > 0
          ? Math.round(
              ((highestCommute.exposureProxy - recommendedCommute.exposureProxy) /
                highestCommute.exposureProxy) *
                100,
            )
          : 0;
      return {
        ...base,
        category: "transport",
        action: switchMode
          ? `Take ${recommendedCommute.label.toLowerCase()} for this trip`
          : `Keep ${recommendedCommute.label.toLowerCase()} for this trip`,
        reason: `Ambient PM2.5 at ${String(commuteHour).padStart(2, "0")}:00 is ${formatNumber(commuteComparison.ambientPm25, 0)} µg/m³. ${recommendedCommute.label} gives the lowest exposure proxy of your options at ${formatNumber(recommendedCommute.exposureProxy, 0)} µg/m³·h.`,
        why: [
          `Travel time is about ${recommendedCommute.durationMin} minutes for ${formatNumber(profile.commuteDistanceKm, 1)} km.`,
          `${recommendedCommute.comfort}.`,
          `Emissions estimate for this trip is ${formatNumber(recommendedCommute.co2Kg, 2)} kg CO2.`,
        ],
        impact: {
          label: "Commute exposure proxy",
          value:
            exposureSaving > 0
              ? `${exposureSaving}% below ${highestCommute?.label.toLowerCase()}`
              : `${formatNumber(recommendedCommute.exposureProxy, 0)} µg/m³·h`,
          basis: "Mode factor estimate",
        },
        basis: [
          ...base.basis,
          "Transport mode factors and emission factors from the planning table",
        ],
      };
    }

    if (block.key === activityBlockKey && profile.activity !== "none") {
      if (shouldMoveActivity && activityBest) {
        const delta = Math.round(
          ((activityBest.avgPm25 - activityPm) / activityPm) * 100,
        );
        return {
          ...base,
          action: `Move your ${activityLabel} to ${activityBest.label}`,
          reason: `PM2.5 at ${String(activityHour).padStart(2, "0")}:00 is ${formatNumber(activityPm, 0)} µg/m³. The lowest two hour window is ${activityBest.label} at ${formatNumber(activityBest.avgPm25, 0)} µg/m³.`,
          why: [
            `Moving the session lowers the exposure proxy by about ${Math.abs(delta)} percent for the same effort.`,
            `Your household includes ${sensitive ? "a sensitive group, so the activity threshold is 30 µg/m³" : "no flagged sensitive group, so the activity threshold is 40 µg/m³"}.`,
            "Forecast confidence is higher inside the next 12 hours.",
          ],
          impact: {
            label: "Activity exposure proxy",
            value: `${Math.abs(delta)}% lower`,
            basis: "PM2.5 × session hours, calculated",
          },
        };
      }
      return {
        ...base,
        action:
          activityPm >= high
            ? `Keep the ${activityLabel} indoors today`
            : activityPm >= caution
              ? `Keep your ${activityLabel} short — PM2.5 is above your ${caution} µg/m³ threshold`
              : `Keep your ${activityLabel} at ${profile.activityTime}`,
        reason:
          activityPm >= high
            ? `PM2.5 at ${profile.activityTime} is ${formatNumber(activityPm, 0)} µg/m³. No lower window in the day is more than 15 percent better, so moving it would not meaningfully change exposure.`
            : activityPm >= caution
              ? `PM2.5 at ${profile.activityTime} is ${formatNumber(activityPm, 0)} µg/m³, above your ${caution} µg/m³ planning threshold but below the ${high} µg/m³ high threshold. Shorten the session or move it indoors.`
              : `PM2.5 at ${profile.activityTime} is ${formatNumber(activityPm, 0)} µg/m³, below your ${caution} µg/m³ planning threshold.`,
        why: [
          `The lowest two hour window is ${activityBest?.label ?? "unavailable"} at ${formatNumber(activityBest?.avgPm25 ?? 0, 0)} µg/m³.`,
          "A shorter session lowers the exposure proxy in direct proportion to time.",
        ],
        impact: {
          label: "Activity exposure proxy",
          value: `${formatNumber(activityPm * activityMet, 0)} µg/m³·h`,
          basis: "PM2.5 × session hours, calculated",
        },
      };
    }

    if (block.key === "morning") {
      return {
        ...base,
        action:
          pm >= high
            ? "Keep the early morning indoors"
            : pm >= caution
              ? "Keep morning outdoor time short"
              : "Morning outdoor time is reasonable",
        reason: `The morning average is ${formatNumber(pm, 0)} µg/m³ of PM2.5, ${pm >= high ? "above" : "below"} the ${high} µg/m³ high exposure threshold for your household.`,
        why: [
          `AQI for this block averages ${aqi}.`,
          `The day's worst window is ${windows.worst?.label ?? "unavailable"} at ${formatNumber(windows.worst?.avgPm25 ?? 0, 0)} µg/m³.`,
          pm >= high
            ? "Morning inversions trap pollution close to the ground, so early hours are often the dirtiest."
            : "Wind and mixing are doing some of the work for you in this window.",
        ],
        impact:
          indoorEstimate !== null
            ? {
                label: "Estimated indoor PM2.5",
                value: `${formatNumber(indoorEstimate, 0)} µg/m³`,
                basis: "Infiltration model estimate",
              }
            : null,
      };
    }

    if (block.key === "midday") {
      const bestHere =
        windows.best !== null &&
        windows.best.startHour >= block.start &&
        windows.best.startHour < block.end;
      return {
        ...base,
        action: bestHere
          ? "Use midday for errands and outdoor time"
          : "Keep midday errands short",
        reason: bestHere
          ? `The lowest two hour window falls inside this block at ${formatNumber(windows.best?.avgPm25 ?? 0, 0)} µg/m³.`
          : `Midday averages ${formatNumber(pm, 0)} µg/m³, and the day's best window is ${windows.best?.label ?? "unavailable"} at ${formatNumber(windows.best?.avgPm25 ?? 0, 0)} µg/m³.`,
        why: [
          `AQI for this block averages ${aqi}.`,
          "Daylight mixing usually lowers ground level concentrations in the afternoon.",
          bestHere
            ? "Grouping errands into one trip reduces total outdoor minutes."
            : "Deferring non urgent errands to the best window lowers total exposure.",
        ],
        impact: {
          label: "Block exposure proxy",
          value: `${formatNumber(pm, 0)} µg/m³·h`,
          basis: "PM2.5 × 1 hour, calculated",
        },
      };
    }

    if (block.key === "afternoon") {
      return {
        ...base,
        action:
          pm < caution
            ? "Afternoon is the cleaner half of the day"
            : "Keep the afternoon indoors where you can",
        reason: `The afternoon average is ${formatNumber(pm, 0)} µg/m³ of PM2.5, against a daily average AQI of ${environment.today?.avgAqi ?? 0}.`,
        why: [
          "Afternoon mixing typically lowers PM2.5 before the evening build up.",
          pm < caution
            ? "This is a reasonable window for outdoor errands if you need one."
            : "Long outdoor blocks add up quickly at this concentration.",
        ],
        impact: {
          label: "Block exposure proxy",
          value: `${formatNumber(pm, 0)} µg/m³·h`,
          basis: "PM2.5 × 1 hour, calculated",
        },
      };
    }

    if (block.key === "evening") {
      const rising =
        windows.worst !== null && windows.worst.startHour >= block.start;
      const ventWindow = findBestWindow(
        environment.hourly,
        today,
        block.start,
        block.end,
        2,
      );
      const canVentilate =
        ventWindow !== null &&
        ventWindow.avgPm25 < (sensitive ? 30 : 40);
      return {
        ...base,
        category: "indoor",
        action: rising
          ? "Close windows before the evening rise"
          : canVentilate
            ? `Ventilate briefly between ${ventWindow.label}, then close up`
            : "Keep windows closed through the evening",
        reason: rising
          ? `Evening averages ${formatNumber(pm, 0)} µg/m³ and the day's worst window starts at ${String(windows.worst?.startHour ?? 18).padStart(2, "0")}:00.`
          : canVentilate
            ? `Evening averages ${formatNumber(pm, 0)} µg/m³. The ${ventWindow.label} window averages ${formatNumber(ventWindow.avgPm25, 0)} µg/m³, below your ${sensitive ? 30 : 40} µg/m³ ventilation threshold.`
            : `Evening averages ${formatNumber(pm, 0)} µg/m³. No evening window falls below your ${sensitive ? 30 : 40} µg/m³ ventilation threshold, so keep windows closed.`,
        why: [
          `Outdoor PM2.5 is ${formatNumber(pm, 0)} µg/m³ in this block.`,
          indoorEstimate !== null
            ? `Your indoor estimate is ${formatNumber(indoorEstimate, 0)} µg/m³ while windows stay closed.`
            : "Keep windows closed if you cannot filter indoor air.",
          "Cooking and traffic both add particles in the evening, so source control matters more than ventilation.",
        ],
        impact:
          indoorEstimate !== null
            ? {
                label: "Estimated indoor PM2.5",
                value: `${formatNumber(indoorEstimate, 0)} µg/m³`,
                basis: "Infiltration model estimate",
              }
            : null,
      };
    }

    return {
      ...base,
      category: "rest",
      action:
        indoorEstimate !== null && indoorEstimate < 35
          ? "Sleep with the bedroom door closed and the purifier on low"
          : profile.ventilation.includes("purifier")
            ? "Run the purifier in the bedroom through the night"
            : "Keep the bedroom door closed and windows shut through the night",
      reason:
        indoorEstimate !== null
          ? `Indoor PM2.5 is estimated at ${formatNumber(indoorEstimate, 0)} µg/m³ with your current setup. A closed bedroom keeps that volume stable overnight.`
          : `Night outdoor PM2.5 averages ${formatNumber(pm, 0)} µg/m³.`,
      why: [
        `Outdoor PM2.5 in this block averages ${formatNumber(pm, 0)} µg/m³.`,
        "Night time mixing is weak, so outdoor concentrations often stay flat until morning.",
        profile.ventilation.includes("purifier")
          ? "A purifier sized for the bedroom is more effective than moving one unit between rooms."
          : "Without a purifier, keeping the bedroom closed limits outdoor particles from entering.",
      ],
      impact:
        indoorEstimate !== null
          ? {
              label: "Estimated indoor PM2.5",
              value: `${formatNumber(indoorEstimate, 0)} µg/m³`,
              basis: "Infiltration model estimate",
            }
          : null,
    };
  });

  const primaryMode = profile.transport[0] ?? "transit";
  const primaryMeta = transportMeta(primaryMode);
  const commuteHours =
    primaryMode === "remote"
      ? 0
      : profile.commuteDistanceKm / (primaryMeta?.speedKmh ?? 18);
  const baselineCommutePm =
    pm25AtHour(environment.hourly, resolveDate(commuteHour, commuteHour + 1, currentHour, today), commuteHour) ??
    commuteComparison.ambientPm25;
  const baselineExposure =
    activityPm * activityMet +
    baselineCommutePm * (primaryMeta?.exposureFactor ?? 1) * commuteHours;
  const plannedActivityPm = shouldMoveActivity && activityBest ? activityBest.avgPm25 : activityPm;
  const plannedExposure =
    plannedActivityPm * activityMet +
    (recommendedCommute?.exposureProxy ?? baselineCommutePm * commuteHours);

  const top =
    recommendations.find((item) => item.block === "commute") ??
    recommendations[0];

  const bestWindow = windowsFor(today).best;
  const worstWindow = windowsFor(today).worst;

  return {
    available: true,
    generatedAt: new Date().toISOString(),
    summary: `${environment.location.name} averages AQI ${environment.today.avgAqi} today and peaks near ${String(environment.today.peakHour).padStart(2, "0")}:00. ${bestWindow ? `${bestWindow.label} is the lowest exposure window.` : ""} ${sensitive ? "Thresholds are tightened because your household includes a sensitive group." : ""}`.trim(),
    headline: top.action,
    blocks: recommendations,
    bestWindow,
    worstWindow,
    outdoorExposureProxy: Math.round(plannedExposure),
    baselineExposureProxy: Math.round(baselineExposure),
    sensitivity: sensitive ? "sensitive" : "standard",
  };
}
