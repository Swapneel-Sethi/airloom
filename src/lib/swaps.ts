import { formatNumber } from "./format";
import type {
  CommuteComparison,
  DailyPlan,
  Environment,
  SustainableSwap,
  UserProfile,
} from "./types";

/**
 * Emission factors are per passenger km planning values, in the range published
 * by the UK Department for Energy Security and Net Zero conversion factors for
 * passenger transport. They are estimates, not measurements of this trip.
 */
const CAR_FACTOR = 0.17;
const TRANSIT_FACTOR = 0.103;

export function buildSwaps(
  environment: Environment,
  profile: UserProfile,
  plan: DailyPlan,
  commute: CommuteComparison,
): SustainableSwap[] {
  const swaps: SustainableSwap[] = [];
  const distance = profile.commuteDistanceKm;
  const hasCar = profile.transport.includes("car");
  const hasTwoWheeler = profile.transport.includes("two-wheeler");
  const hasTransit = profile.transport.includes("transit");

  if ((hasCar || hasTwoWheeler) && hasTransit && distance >= 2) {
    const factor = hasCar ? CAR_FACTOR : 0.085;
    const annualKm = distance * 2 * 2 * 48;
    const saved = Math.round(annualKm * (factor - TRANSIT_FACTOR));
    swaps.push({
      id: "commute-swap",
      title: "Swap two commute days for public transport",
      change: `Replace ${hasCar ? "car" : "two wheeler"} trips on two days a week with transit.`,
      why: `Your commute is ${formatNumber(distance, 1)} km each way. Transit carries more people per vehicle, so the emissions per passenger km fall even when the vehicle is full.`,
      impact:
        saved > 0
          ? `About ${formatNumber(saved, 0)} kg CO2 avoided a year, across roughly ${formatNumber(annualKm, 0)} km moved off a private vehicle.`
          : "Transit is not lower emission than a two wheeler on this trip length. Pick the days with the worst traffic instead.",
      effort: "medium",
      frequency: "Two days a week",
      horizon: "This season",
      basis:
        "Estimate using per passenger km emission factors of 0.17 kg CO2 for a car and 0.103 kg CO2 for bus transit.",
      co2SavedKgPerYear: Math.max(0, saved),
    });
  }

  if (distance < 6 && !profile.transport.includes("walk") && profile.transport.length > 0) {
    const annualKm = distance * 2 * 2 * 48;
    swaps.push({
      id: "short-walk",
      title: "Walk or cycle the shortest commute days",
      change: `Cover the ${formatNumber(distance, 1)} km trip under your own power on the two calmest days each week.`,
      why: "Short motor trips are inefficient while the engine is cold, and they add to the traffic that keeps pollution trapped at street level.",
      impact: `Removes about ${formatNumber(annualKm, 0)} vehicle km a year. On high pollution days, keep this swap for the low exposure window instead.`,
      effort: "medium",
      frequency: "Two days a week",
      horizon: "This season",
      basis: "Distance based estimate from your saved commute distance.",
      co2SavedKgPerYear: Math.round(annualKm * CAR_FACTOR),
    });
  }

  swaps.push({
    id: "errand-loop",
    title: "Turn separate errands into one loop",
    change: "Combine the pharmacy, grocery, and bank trip into a single outing.",
    why: "The first kilometre of a car trip carries most of the fuel and emission cost per km. Three short trips cost more than one loop of the same total distance.",
    impact:
      "A planning estimate of one 4 km trip avoided each week is about 35 kg CO2 a year.",
    effort: "low",
    frequency: "Weekly",
    horizon: "Ongoing",
    basis:
      "Estimate using 4 km per week avoided and 0.17 kg CO2 per car km. Actual distance depends on your errands.",
    co2SavedKgPerYear: 35,
  });

  if (plan.available && plan.bestWindow) {
    const current = plan.blocks.find((block) => block.impact?.label === "Activity exposure proxy");
    swaps.push({
      id: "timing-swap",
      title: "Move outdoor sessions to the low window",
      change: `Schedule outdoor activity between ${plan.bestWindow.label} instead of the morning.`,
      why: `The two hour average at ${plan.bestWindow.label} is ${formatNumber(plan.bestWindow.avgPm25, 0)} µg/m³, the lowest of the day. Timing changes exposure without changing your routine.`,
      impact:
        current && current.impact
          ? `${current.impact.value} on the activity exposure proxy for the same session length.`
          : "Lower exposure proxy for the same session length.",
      effort: "low",
      frequency: "Daily",
      horizon: "While smog persists",
      basis:
        "Calculated from the hourly PM2.5 model for this location and your saved activity time.",
      co2SavedKgPerYear: null,
    });
  }

  if (profile.ventilation.includes("purifier")) {
    swaps.push({
      id: "purifier-scope",
      title: "Filter the room you use, not the whole home",
      change: "Move the purifier with you and close the door, instead of running several units.",
      why: "A purifier is rated for one room volume. Running one unit in the occupied room gives a higher clean air delivery rate per unit of electricity than spreading units across empty rooms.",
      impact:
        "Lower electricity use with the same protection in the room that matters. Airloom does not estimate a kilowatt hour figure without a measured device rating.",
      effort: "low",
      frequency: "Daily",
      horizon: "Ongoing",
      basis: "Device sizing logic from the clean air delivery rate for a single room.",
      co2SavedKgPerYear: null,
    });
  }

  if (commute.options.length > 0) {
    const best = commute.options.find((option) => option.recommended);
    if (best && best.mode !== "walk" && best.mode !== "cycle") {
      swaps.push({
        id: "trip-mode",
        title: "Match the trip to the exposure window",
        change: `Use ${best.label.toLowerCase()} at ${String(commute.departureHour).padStart(2, "0")}:00 and shift the trip by an hour when the index falls.`,
        why: `At the saved departure time the ambient reading is ${formatNumber(commute.ambientPm25, 0)} µg/m³. An hour of shift can matter more than the mode when the index is falling.`,
        impact: `Estimated ${formatNumber(best.exposureProxy, 0)} µg/m³·h for this trip with your selected mode.`,
        effort: "low",
        frequency: "Daily",
        horizon: "While smog persists",
        basis:
          "Exposure proxy from ambient PM2.5, travel time, and the mode factor table.",
        co2SavedKgPerYear: null,
      });
    }
  }

  return swaps.slice(0, 5);
}
