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

  const available = profile.transport.length
    ? profile.transport
    : (["walk", "transit", "car"] as TransportMode[]);

  const distance = profile.commuteDistanceKm;

  const options: CommuteOption[] = available
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
      note: "No transport options selected in your profile.",
    };
  }

  const lowestExposure = Math.min(...options.map((option) => option.exposureProxy));
  const withinBand = options.filter(
    (option) => option.exposureProxy <= lowestExposure * 1.1,
  );
  const recommended = withinBand.reduce((best, option) =>
    option.co2Kg < best.co2Kg ? option : best,
  );
  const maxExposure = Math.max(...options.map((option) => option.exposureProxy), 1);

  for (const option of options) {
    option.recommended = option.mode === recommended.mode;
    const ratio = option.exposureProxy / maxExposure;
    option.exposureClass =
      ratio < 0.45 ? "Lower" : ratio < 0.75 ? "Moderate" : "Higher";
    if (option.mode === "remote") {
      option.why = "No travel. Exposure proxy reflects indoor air at home.";
    } else if (option.mode === recommended.mode) {
      option.why =
        option.exposureProxy <= lowestExposure * 1.05
          ? `Lowest exposure of your options at ${formatNumber(option.exposureProxy, 0)} µg/m³·h, with ${formatNumber(option.co2Kg, 2)} kg CO2.`
          : `Close to the lowest exposure option and lower emissions at ${formatNumber(option.co2Kg, 2)} kg CO2.`;
    } else if (option.mode === "walk" || option.mode === "cycle") {
      option.why = `No tailpipe emissions, but full ambient exposure across ${option.durationMin} min.`;
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
