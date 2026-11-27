import type { CopilotContext } from "@/lib/ai/context";

export function pm25(context: CopilotContext): number | null {
  const item = context.pollutants.find((entry) => entry.label === "PM2.5");
  return item ? item.value : null;
}

export function householdPhrase(context: CopilotContext): string {
  const household = context.profile.household;
  if (household.length === 0) return "your household";
  return household.length === 1 ? household[0] : `${household.slice(0, 2).join(" and ")}`;
}

export function baseDataUsed(context: CopilotContext): string[] {
  const used = ["AQI and dominant pollutant"];
  if (pm25(context) !== null) used.push("PM2.5 model value");
  if (context.bestWindow) used.push("Hourly PM2.5 forecast");
  if (context.aqi) used.push(`Data source: ${context.dataSource}`);
  return used;
}

export function getThreshold(context: CopilotContext): { value: number; basis: string } {
  return {
    value: context.planningThreshold,
    basis: context.planningThresholdBasis,
  };
}