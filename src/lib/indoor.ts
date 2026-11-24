import type {
  Environment,
  IndoorAction,
  IndoorOutlook,
  RoomEstimate,
  UserProfile,
} from "./types";
import { dateOf } from "./windows";
import { findBestWindow } from "./windows";
import { formatNumber } from "./format";

/**
 * Simple mass balance style planning model. Indoor PM2.5 is estimated as a
 * fraction of outdoor PM2.5. The fraction reflects window state and filtration.
 * It is a planning estimate, not a measurement.
 */
export function infiltrationFactor(profile: UserProfile): number {
  const purifier = profile.ventilation.includes("purifier");
  const natural = profile.ventilation.includes("natural");
  const mechanical = profile.ventilation.includes("mechanical");

  let factor = 0.62;
  if (natural) factor = 0.8;
  if (mechanical) factor = 0.45;
  if (purifier) factor = factor * 0.38;

  return Math.round(factor * 100) / 100;
}

export function estimateIndoorPm25(
  outdoorPm25: number | null,
  profile: UserProfile,
): number | null {
  if (outdoorPm25 === null) return null;
  return Math.round(outdoorPm25 * infiltrationFactor(profile) * 10) / 10;
}

function cookingBump(profile: UserProfile): number {
  if (profile.cooking === "daily") return 18;
  if (profile.cooking === "sometimes") return 9;
  return 3;
}

export function buildIndoorOutlook(
  environment: Environment,
  profile: UserProfile,
): IndoorOutlook {
  const outdoorPm25 =
    environment.pollutants.find((item) => item.key === "pm25")?.value ?? null;
  const factor = infiltrationFactor(profile);
  const estimated = estimateIndoorPm25(outdoorPm25, profile);
  const purifierAvailable = profile.ventilation.includes("purifier");
  const date = dateOf(environment.currentTime);
  const bestWindow = findBestWindow(environment.hourly, date, 6, 22, 2);
  const ventilationWindow =
    bestWindow && bestWindow.avgPm25 < 30 ? bestWindow : null;

  if (outdoorPm25 === null || estimated === null) {
    return {
      available: false,
      outdoorPm25,
      infiltration: factor,
      estimatedPm25: null,
      purifierAvailable,
      rooms: [],
      actions: [],
      ventilationWindow: null,
      method:
        "Indoor estimate needs a PM2.5 reading. The provider did not return one for this location.",
    };
  }

  const rooms: RoomEstimate[] = [
    {
      name: "Living room",
      pm25: estimated,
      note: purifierAvailable
        ? "Purifier running on the room size setting"
        : "Windows closed, no filtration assumed",
    },
    {
      name: "Bedroom",
      pm25: Math.round(estimated * 0.9 * 10) / 10,
      note: "Door closed through the night",
    },
    {
      name: "Kitchen",
      pm25:
        Math.round(
          (estimated * 1.08 + cookingBump(profile)) * 10,
        ) / 10,
      note:
        profile.cooking === "daily"
          ? "Cooking most days, extractor assumed"
          : "Occasional cooking",
    },
    {
      name: "Workspace",
      pm25:
        Math.round(
          estimated *
            (profile.workspace === "home"
              ? 1.05
              : profile.workspace === "office"
                ? 1.15
                : 1.3) *
            10,
        ) / 10,
      note:
        profile.workspace === "home"
          ? "Same building as your living room"
          : profile.workspace === "office"
            ? "Shared building ventilation assumed"
            : "Shared indoor space with mixed ventilation",
    },
  ];

  const actions: IndoorAction[] = [];

  if (purifierAvailable) {
    actions.push({
      id: "purifier-room",
      title: "Run the purifier in the room you are using",
      reason: `Outdoor PM2.5 is ${formatNumber(outdoorPm25, 0)} µg/m³. With filtration your living room estimate is ${formatNumber(estimated, 0)} µg/m³, which is ${formatNumber((outdoorPm25 / Math.max(estimated, 1)), 1)} times lower than the outdoor reading.`,
      detail:
        "Close the door of that room while it runs. A purifier works on one room volume, not the whole home.",
      priority: "now",
      effort: "low",
    });
    actions.push({
      id: "filter-check",
      title: "Check the filter and the prefilter",
      reason:
        "A loaded filter reduces airflow and the clean air delivery rate, so the same room takes longer to clear.",
      detail:
        "Vacuum the prefilter monthly and replace the main filter on the interval printed on the unit.",
      priority: "this-week",
      effort: "low",
    });
  } else {
    actions.push({
      id: "room-choice",
      title: "Use the room furthest from the street",
      reason: `Without filtration, the indoor estimate is ${formatNumber(estimated, 0)} µg/m³, close to ${formatNumber(factor * 100, 0)} percent of outdoor air.`,
      detail:
        "Road facing rooms take in more traffic related pollution through gaps and doors.",
      priority: "today",
      effort: "low",
    });
  }

  if (ventilationWindow) {
    actions.push({
      id: "ventilate-window",
      title: `Ventilate between ${ventilationWindow.label}`,
      reason: `Outdoor PM2.5 averages ${formatNumber(ventilationWindow.avgPm25, 0)} µg/m³ in that window, the lowest of the day.`,
      detail:
        "Open opposite windows for 10 to 20 minutes, then close them. Short exchanges limit the pollution that settles indoors.",
      priority: "today",
      effort: "low",
    });
  } else {
    actions.push({
      id: "keep-closed",
      title: "Keep windows closed through the day",
      reason: `The lowest two hour outdoor average is ${formatNumber(bestWindow?.avgPm25 ?? outdoorPm25, 0)} µg/m³, above the 30 µg/m³ threshold Airloom uses for ventilation.`,
      detail:
        "Ventilate briefly after cooking instead, and let the purifier handle the room you occupy.",
      priority: "today",
      effort: "low",
    });
  }

  actions.push({
    id: "cooking-hood",
    title: "Run the kitchen extractor while cooking",
    reason:
      profile.cooking === "daily"
        ? "Cooking most days is the largest indoor source in this home. The kitchen estimate adds cooking load on top of outdoor air."
        : "Cooking adds fine particles even on days when outdoor air is cleaner.",
    detail:
      "Turn the extractor on before the pan heats and leave it running for 10 minutes after cooking.",
    priority: "today",
    effort: "low",
  });

  actions.push({
    id: "dust",
    title: "Clean with a damp cloth instead of dry sweeping",
    reason:
      "Dry sweeping lifts settled dust back into the air. That dust carries the same fine particles the outdoor reading measures.",
    detail:
      "Wipe surfaces and mop once. If you vacuum, use a machine with a sealed HEPA filter.",
    priority: "this-week",
    effort: "medium",
  });

  actions.push({
    id: "occupancy",
    title: "Keep bedroom doors closed at night",
    reason:
      "A closed door keeps the room volume stable so a purifier or a cracked window has a smaller space to work on.",
    detail:
      "If you share the room, keep the purifier between the occupants and away from the wall.",
    priority: "today",
    effort: "low",
  });

  return {
    available: true,
    outdoorPm25,
    infiltration: factor,
    estimatedPm25: estimated,
    purifierAvailable,
    rooms,
    actions,
    ventilationWindow,
    method: `Indoor PM2.5 = outdoor PM2.5 × ${factor}. The factor combines a closed window baseline with your selected ventilation and filtration. This is a planning estimate, not a sensor reading.`,
  };
}
