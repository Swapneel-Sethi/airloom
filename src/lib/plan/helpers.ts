import type { Confidence, Environment } from "../types";

export function shiftDate(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function resolveDate(
  start: number,
  end: number,
  currentHour: number,
  today: string,
): string {
  return end <= currentHour ? shiftDate(today, 1) : today;
}

export function parseHour(time: string): number {
  const value = Number(time.slice(0, 2));
  return Number.isFinite(value) ? Math.min(23, Math.max(0, value)) : 8;
}

export function timeLabel(date: string, start: number, end: number, today: string): string {
  const prefix = date === today ? "" : "Tomorrow, ";
  return `${prefix}${String(start).padStart(2, "0")}:00 to ${String(end).padStart(2, "0")}:00`;
}

export function confidenceFor(
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
