import { DEMO_CITIES, POLLUTANTS } from "./constants";
import { computeAqi } from "./aqi";
import type {
  Environment,
  GeoLocation,
  HourPoint,
  Pollutant,
  PollutantKey,
} from "./types";
import { findBestWindow, findWorstWindow, pointsForDay } from "./windows";

interface DemoProfile {
  basePm25: number;
  amplitude: number;
  pm10Ratio: number;
  temperature: number;
  humidity: number;
  wind: number;
}

const DEMO_PROFILES: Record<string, DemoProfile> = {
  delhi: {
    basePm25: 148,
    amplitude: 1,
    pm10Ratio: 1.65,
    temperature: 19,
    humidity: 62,
    wind: 3.4,
  },
  mumbai: {
    basePm25: 44,
    amplitude: 0.55,
    pm10Ratio: 1.9,
    temperature: 29,
    humidity: 68,
    wind: 9.2,
  },
  bengaluru: {
    basePm25: 24,
    amplitude: 0.5,
    pm10Ratio: 1.8,
    temperature: 24,
    humidity: 54,
    wind: 7.1,
  },
  kolkata: {
    basePm25: 88,
    amplitude: 0.8,
    pm10Ratio: 1.75,
    temperature: 24,
    humidity: 72,
    wind: 5.3,
  },
  lucknow: {
    basePm25: 205,
    amplitude: 1.1,
    pm10Ratio: 1.6,
    temperature: 16,
    humidity: 70,
    wind: 2.1,
  },
};

function diurnal(hour: number): number {
  const morning = Math.exp(-Math.pow(hour - 7, 2) / 10);
  const evening = Math.exp(-Math.pow(hour - 21, 2) / 14);
  const afternoon = Math.exp(-Math.pow(hour - 15, 2) / 18);
  return 1 + 0.52 * morning + 0.36 * evening - 0.3 * afternoon;
}

function localParts(timezone: string): { date: string; hour: number } {
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hourFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  });
  return {
    date: dateFormatter.format(now),
    hour: Number(hourFormatter.format(now)) % 24,
  };
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function buildPollutants(
  pm25: number,
  pm10: number,
  no2: number,
  so2: number,
  o3: number,
  co: number,
): Pollutant[] {
  const values: Record<PollutantKey, number> = { pm25, pm10, no2, so2, o3, co };
  return (Object.keys(values) as PollutantKey[]).map((key) => {
    const meta = POLLUTANTS[key];
    const value = Math.round(values[key] * 10) / 10;
    return {
      key,
      label: meta.label,
      value,
      unit: meta.unit,
      guideline: meta.guideline,
      guidelineLabel: meta.guidelineLabel,
      multipleOfGuideline:
        meta.guideline === null ? null : Math.round((value / meta.guideline) * 10) / 10,
    };
  });
}

export function buildDemoEnvironment(cityKey: string): Environment {
  const key = DEMO_PROFILES[cityKey] ? cityKey : "delhi";
  const city = DEMO_CITIES[key];
  const profile = DEMO_PROFILES[key];
  const { date: today, hour: currentHour } = localParts(city.location.timezone);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const hourly: HourPoint[] = [];
  const dates = [yesterday, today, tomorrow];

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const shape = diurnal(hour);
      const noise = 4.2 * Math.sin(hour * 1.7 + dayIndex * 2.1);
      const pm25 = Math.max(
        4,
        Math.round((profile.basePm25 * (1 + (shape - 1) * profile.amplitude) + noise) * 10) / 10,
      );
      const pm10 = Math.round(pm25 * profile.pm10Ratio * 10) / 10;
      const aqi = computeAqi(pm25, pm10);
      hourly.push({
        time: `${dates[dayIndex]}T${String(hour).padStart(2, "0")}:00`,
        hour,
        pm25,
        pm10,
        aqi: aqi?.value ?? null,
        temperature:
          Math.round(
            (profile.temperature +
              4 * Math.sin(((hour - 9) / 24) * Math.PI * 2) +
              dayIndex * 0.4) *
              10,
          ) / 10,
        windSpeed:
          Math.round((profile.wind + 1.8 * Math.sin(((hour - 4) / 24) * Math.PI * 2)) * 10) /
          10,
        humidity: Math.round(profile.humidity + 8 * Math.cos(((hour - 6) / 24) * Math.PI * 2)),
        precipitationProbability: 0,
      });
    }
  }

  const currentPoint =
    hourly.find((point) => point.time === `${today}T${String(currentHour).padStart(2, "0")}:00`) ??
    hourly[24];
  const pm25 = currentPoint.pm25 ?? 0;
  const pm10 = currentPoint.pm10 ?? 0;
  const aqi = computeAqi(pm25, pm10);
  const todayPoints = pointsForDay(hourly, today);
  const yesterdayPoints = pointsForDay(hourly, yesterday);

  const todayValues = todayPoints
    .map((point) => point.aqi)
    .filter((value): value is number => value !== null);
  const yesterdayValues = yesterdayPoints
    .map((point) => point.aqi)
    .filter((value): value is number => value !== null);

  const peakPoint = todayPoints.reduce(
    (best, point) => ((point.aqi ?? 0) > (best.aqi ?? 0) ? point : best),
    todayPoints[0],
  );
  const lowPoint = todayPoints.reduce(
    (best, point) => ((point.aqi ?? 999) < (best.aqi ?? 999) ? point : best),
    todayPoints[0],
  );

  return {
    location: city.location,
    source: "demo",
    provenance: "demo-seed",
    fetchedAt: new Date().toISOString(),
    currentTime: currentPoint.time,
    aqi,
    pollutants: buildPollutants(
      pm25,
      pm10,
      Math.round(pm25 * 0.62 + 14),
      Math.round(pm25 * 0.28 + 6),
      Math.round(38 + 12 * Math.sin(currentHour / 4)),
      Math.round(pm25 * 11 + 420),
    ),
    weather: {
      temperature: currentPoint.temperature ?? profile.temperature,
      humidity: currentPoint.humidity ?? profile.humidity,
      windSpeed: currentPoint.windSpeed ?? profile.wind,
      weatherCode: 45,
      weatherLabel: key === "bengaluru" ? "Clear" : "Haze",
    },
    hourly,
    today: {
      avgAqi: Math.round(todayValues.reduce((a, b) => a + b, 0) / Math.max(1, todayValues.length)),
      peakAqi: peakPoint.aqi ?? 0,
      peakHour: peakPoint.hour,
      lowAqi: lowPoint.aqi ?? 0,
      lowHour: lowPoint.hour,
      bestWindow: findBestWindow(hourly, today) ?? {
        startHour: 14,
        endHour: 16,
        label: "14:00 to 16:00",
        avgPm25: 0,
        avgAqi: 0,
      },
      worstWindow: findWorstWindow(hourly, today) ?? {
        startHour: 7,
        endHour: 9,
        label: "07:00 to 09:00",
        avgPm25: 0,
        avgAqi: 0,
      },
    },
    yesterdayAvgAqi:
      yesterdayValues.length > 0
        ? Math.round(
            yesterdayValues.reduce((a, b) => a + b, 0) / yesterdayValues.length,
          )
        : null,
    freshnessMinutes: 0,
    limitations: [
      "Demo scenario. Values are seeded to resemble a realistic smog day and are not a live reading.",
      "Hourly concentration used with 24 hour AQI breakpoints, so the index is an estimate.",
      "Pollutant values are a city scale model, not a street level measurement.",
    ],
    dataNote: `Demo scenario for ${city.label}. ${city.condition}.`,
  };
}

export function demoLocation(cityKey: string): GeoLocation {
  const key = DEMO_CITIES[cityKey] ? cityKey : "delhi";
  return DEMO_CITIES[key].location;
}
