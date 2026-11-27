import type { DayWindow, HourPoint } from "./types";
import { formatHourRange } from "./format";

export function hourOf(isoLocal: string): number {
  return Number(isoLocal.slice(11, 13));
}

export function dateOf(isoLocal: string): string {
  return isoLocal.slice(0, 10);
}

export function pointsForDay(hourly: HourPoint[], date: string): HourPoint[] {
  return hourly.filter((point) => point.time.slice(0, 10) === date);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function windowStats(
  hourly: HourPoint[],
  date: string,
  startHour: number,
  endHour: number,
): { avgPm25: number; avgAqi: number; count: number } {
  const points = pointsForDay(hourly, date).filter(
    (point) =>
      point.hour >= startHour &&
      point.hour < endHour &&
      point.pm25 !== null &&
      point.aqi !== null,
  );
  return {
    avgPm25: average(points.map((point) => point.pm25 as number)),
    avgAqi: average(points.map((point) => point.aqi as number)),
    count: points.length,
  };
}

export function makeWindow(
  hourly: HourPoint[],
  date: string,
  startHour: number,
  endHour: number,
): DayWindow {
  const stats = windowStats(hourly, date, startHour, endHour);
  return {
    startHour,
    endHour,
    label: formatHourRange(startHour, endHour),
    avgPm25: Math.round(stats.avgPm25 * 10) / 10,
    avgAqi: Math.round(stats.avgAqi),
  };
}

/**
 * Scans fixed span windows between the given hours and returns the one with the
 * lowest average PM2.5. Deterministic planning input, not a forecast guarantee.
 */
export function findBestWindow(
  hourly: HourPoint[],
  date: string,
  fromHour = 6,
  toHour = 24,
  span = 2,
): DayWindow | null {
  let best: DayWindow | null = null;
  for (let start = fromHour; start + span <= toHour; start += 1) {
    const window = makeWindow(hourly, date, start, start + span);
    const stats = windowStats(hourly, date, start, start + span);
    if (stats.count === 0) continue;
    if (!best || window.avgPm25 < best.avgPm25) best = window;
  }
  return best;
}

export function findWorstWindow(
  hourly: HourPoint[],
  date: string,
  fromHour = 6,
  toHour = 24,
  span = 2,
): DayWindow | null {
  let worst: DayWindow | null = null;
  for (let start = fromHour; start + span <= toHour; start += 1) {
    const window = makeWindow(hourly, date, start, start + span);
    const stats = windowStats(hourly, date, start, start + span);
    if (stats.count === 0) continue;
    if (!worst || window.avgPm25 > worst.avgPm25) worst = window;
  }
  return worst;
}

export function pm25AtHour(
  hourly: HourPoint[],
  date: string,
  hour: number,
): number | null {
  const point = hourly.find(
    (item) => item.time.slice(0, 10) === date && item.hour === hour,
  );
  return point?.pm25 ?? null;
}
