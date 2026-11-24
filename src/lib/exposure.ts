import type { DayWindow, Environment } from "./types";

export function exposureProxy(
  pm25: number,
  hours: number,
  factor = 1,
): number {
  return Math.round(pm25 * hours * factor * 10) / 10;
}

export function formatProxy(value: number | null): string {
  if (value === null) return "Unavailable";
  return `${Math.round(value)} µg/m³·h`;
}

export function proxyDelta(baseline: number | null, planned: number | null): number | null {
  if (baseline === null || planned === null || baseline <= 0) return null;
  return Math.round(((planned - baseline) / baseline) * 100);
}

export function windowExposure(
  window: DayWindow | null,
  hours: number,
): number | null {
  if (!window) return null;
  return exposureProxy(window.avgPm25, hours);
}

export function currentPm25(environment: Environment): number | null {
  return environment.pollutants.find((item) => item.key === "pm25")?.value ?? null;
}
