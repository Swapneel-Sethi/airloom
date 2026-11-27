import { TRANSPORT_OPTIONS } from "./constants";
import { formatNumber } from "./format";
import type {
  CommuteComparison,
  CommuteOption,
  Environment,
  TransportMode,
  UserProfile,
} from "./types";
import { dateOf, pm25AtHour } from "./windows";

export function transportMeta(mode: TransportMode) {
  return TRANSPORT_OPTIONS.find((option) => option.value === mode);
}

export function compareCommute(
  environment: Environment,
  profile: UserProfile,
  hour: number,
): CommuteComparison {
  const date = dateOf(environment.currentTime);
  const ambient =
    pm25AtHour(environment.hourly, date, hour) ??
    environment.pollutants.find((item) => item.key === "pm25")?.value ??
    0;

  const selected = profile.transport.length > 0 ? profile.transport : [];
  const distance = profile.commuteDistanceKm;

  if (selected.length === 0) {
    return {
      available: false,
      distanceKm: distance,
      departureHour: hour,
      ambientPm25: ambient,
      options: [],
      note: "Add at least one way you travel to see commute options.",
    };
  }

  const options: CommuteOption[] = selected
    .map((mode): CommuteOption | null => {
      const meta = transportMeta(mode);
      if (!meta) return null;
      const durationMin =
        mode === "remote" ? 0 : Math.round((distance / meta.speedKmh) * 60);
      const hours = durationMin / 60;
      const exposureProxy =
        mode === "remote" ? ambient * 0.22 : ambient * meta.exposureFactor * hours;
      const co2Kg = Math.round(distance * meta.co2PerKm * 100) / 100;

      return {
        mode,
        label: meta.label,
        durationMin,
        exposureProxy: Math.round(exposureProxy * 10) / 10,
        co2Kg,
        comfort: meta.comfort,
        exposureClass: "",
        recommended: false,
        why: "",
      } satisfies CommuteOption;
    })
    .filter((option): option is CommuteOption => option !== null);

  if (options.length === 0) {
    return {
      available: false,
      distanceKm: distance,
      departureHour: hour,
      ambientPm25: ambient,
      options: [],
      note: "Add at least one way you travel to see commute options.",
    };
  }

  const lowestExposure = Math.min(...options.map((option) => option.exposureProxy));
  const withinBand = options.filter(
    (option) => option.exposureProxy <= lowestExposure * 1.15,
  );
  // Never recommend car when a cleaner alternative is available within 1.5x travel time.
  const nonCarOptions = withinBand.filter((o) => o.mode !== "car");
  const carOption = withinBand.find((o) => o.mode === "car");
  let recommended: CommuteOption;
  if (nonCarOptions.length > 0 && carOption) {
    // Prefer non-car within 1.5x of car's travel time
    const carTime = carOption.durationMin;
    const viableNonCar = nonCarOptions.filter(
      (o) => o.durationMin <= carTime * 1.5 || o.durationMin <= carTime + 10,
    );
    if (viableNonCar.length > 0) {
      recommended = viableNonCar.reduce((best, option) =>
        option.co2Kg < best.co2Kg ? option : best,
      );
    } else {
      recommended = withinBand.reduce((best, option) =>
        option.co2Kg < best.co2Kg ? option : best,
      );
    }
  } else {
    recommended = withinBand.reduce((best, option) =>
      option.co2Kg < best.co2Kg ? option : best,
    );
  }
  const maxExposure = Math.max(...options.map((option) => option.exposureProxy), 1);

  for (const option of options) {
    option.recommended = option.mode === recommended.mode;
    const ratio = option.exposureProxy / maxExposure;
    option.exposureClass =
      ratio < 0.45 ? "Lower" : ratio < 0.75 ? "Moderate" : "Higher";
    if (option.mode === "remote") {
      option.why = "No trip. Exposure reflects indoor air at home.";
    } else if (option.mode === recommended.mode) {
      option.why =
        option.exposureProxy <= lowestExposure * 1.05
          ? `Lowest exposure of your options at ${formatNumber(option.exposureProxy, 0)} µg/m³·h, with ${formatNumber(option.co2Kg, 2)} kg CO2.`
          : `Close to the lowest exposure option and lower emissions at ${formatNumber(option.co2Kg, 2)} kg CO2.`;
    } else if (option.mode === "walk" || option.mode === "cycle") {
      option.why = `No tailpipe emissions, but full ambient exposure across ${option.durationMin} min.`;
    } else if (option.mode === "car") {
      option.why = `Sheltered cabin but highest emissions at ${formatNumber(option.co2Kg, 2)} kg CO2; ${formatNumber(option.exposureProxy, 0)} µg/m³·h exposure proxy.`;
    } else {
      option.why = `${option.comfort}. Estimated ${formatNumber(option.exposureProxy, 0)} µg/m³·h and ${formatNumber(option.co2Kg, 2)} kg CO2.`;
    }
  }

  options.sort((a, b) => a.exposureProxy - b.exposureProxy);

  return {
    available: true,
    distanceKm: distance,
    departureHour: hour,
    ambientPm25: Math.round(ambient * 10) / 10,
    options,
    note:
      "Exposure proxy is ambient PM2.5 × mode factor × travel time. Mode factors are planning assumptions, not in cabin measurements. Emission factors are per passenger km planning values.",
  };
}
