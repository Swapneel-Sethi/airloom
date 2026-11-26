import { AQI_CATEGORIES, POLLUTANTS } from "./constants";
import type {
  AirQualityIndex,
  AqiBreakdown,
  AqiCategory,
  PollutantKey,
} from "./types";

/**
 * US EPA AQI breakpoints applied to PM2.5 and PM10 concentrations in µg/m³.
 * PM2.5 breakpoints revised February 2024 (EPA PM NAAQS revision).
 * Source: US EPA AQS AQI Breakpoints (aqs.epa.gov), Table for 24-hour PM2.5.
 *
 * The source data is an hourly model concentration, not a 24 hour average, so
 * the result is an estimate. See docs/DATA_METHODOLOGY.md.
 */
const PM25_BREAKPOINTS: [number, number, number, number][] = [
  [0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];

const PM10_BREAKPOINTS: [number, number, number, number][] = [
  [0, 54, 0, 50],
  [55, 154, 51, 100],
  [155, 254, 101, 150],
  [255, 354, 151, 200],
  [355, 424, 201, 300],
  [425, 604, 301, 500],
];

function interpolate(
  concentration: number,
  breakpoints: [number, number, number, number][],
): number | null {
  if (!Number.isFinite(concentration) || concentration < 0) return null;
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (concentration <= cHigh) {
      const value =
        ((iHigh - iLow) / (cHigh - cLow)) * (concentration - cLow) + iLow;
      return Math.round(value);
    }
  }
  return 500;
}

export function pm25SubIndex(pm25: number | null): number | null {
  if (pm25 === null) return null;
  return interpolate(pm25, PM25_BREAKPOINTS);
}

export function pm10SubIndex(pm10: number | null): number | null {
  if (pm10 === null) return null;
  return interpolate(pm10, PM10_BREAKPOINTS);
}

export function categoryFor(value: number): AqiCategory {
  if (value <= 50) return "good";
  if (value <= 100) return "moderate";
  if (value <= 150) return "elevated";
  if (value <= 200) return "high";
  if (value <= 300) return "very-high";
  return "severe";
}

export function categoryLabel(category: AqiCategory): string {
  return AQI_CATEGORIES[category].label;
}

export function categoryColor(category: AqiCategory | null): string {
  if (!category) return "var(--sev-unavailable)";
  return AQI_CATEGORIES[category].token;
}

export function computeAqi(
  pm25: number | null,
  pm10: number | null,
): AirQualityIndex | null {
  const pm25Index = pm25SubIndex(pm25);
  const pm10Index = pm10SubIndex(pm10);
  const candidates: AqiBreakdown[] = [];

  if (pm25Index !== null) {
    candidates.push({ key: "pm25", label: POLLUTANTS.pm25.label, subIndex: pm25Index });
  }
  if (pm10Index !== null) {
    candidates.push({ key: "pm10", label: POLLUTANTS.pm10.label, subIndex: pm10Index });
  }
  if (candidates.length === 0) return null;

  const dominant = candidates.reduce((a, b) => (b.subIndex > a.subIndex ? b : a));
  const value = Math.min(500, dominant.subIndex);
  const category = categoryFor(value);

  return {
    value,
    category,
    categoryLabel: categoryLabel(category),
    dominant: dominant.key as PollutantKey,
    dominantLabel: dominant.label,
    breakdown: candidates,
  };
}

export function aqiDescriptor(value: number): string {
  if (value <= 50) return "Air is within the good range for most people.";
  if (value <= 100) return "Air is acceptable, with some pollutants above guideline levels.";
  if (value <= 150) return "Sensitive groups may notice symptoms during long outdoor exposure.";
  if (value <= 200) return "Outdoor exposure carries a measurable pollution load today.";
  if (value <= 300) return "Long outdoor periods carry a high pollution load today.";
  return "Outdoor air carries an extreme pollution load today.";
}
