import { computeAqi } from "./aqi";
import { POLLUTANTS } from "./constants";
import type {
  Environment,
  GeoLocation,
  HourPoint,
  Pollutant,
  PollutantKey,
} from "./types";
import { findBestWindow, findWorstWindow, pointsForDay } from "./windows";

const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const LIVE_TTL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 45 * 60 * 1000;

interface CacheEntry {
  environment: Environment;
  storedAt: number;
}

const cacheHost = globalThis as unknown as {
  __airloomEnvironmentCache?: Map<string, CacheEntry>;
};
const cache = (cacheHost.__airloomEnvironmentCache ??= new Map());

export class EnvironmentError extends Error {
  code: "upstream-unavailable" | "invalid-location" | "invalid-response";

  constructor(code: EnvironmentError["code"], message: string) {
    super(message);
    this.name = "EnvironmentError";
    this.code = code;
  }
}

const WEATHER_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

export function weatherLabel(code: number): string {
  return WEATHER_LABELS[code] ?? "Mixed conditions";
}

interface AirCurrent {
  time: string;
  pm2_5: number | null;
  pm10: number | null;
  nitrogen_dioxide: number | null;
  sulphur_dioxide: number | null;
  ozone: number | null;
  carbon_monoxide: number | null;
}

interface AirResponse {
  utc_offset_seconds: number;
  current: AirCurrent;
  hourly: {
    time: string[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
  };
}

interface WeatherResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    wind_speed_10m: (number | null)[];
    precipitation_probability: (number | null)[];
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(9000),
    next: { revalidate: 600 },
  });
  if (!response.ok) {
    throw new EnvironmentError(
      "upstream-unavailable",
      `Upstream request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as T;
}

function buildUrl(base: string, params: Record<string, string | number>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function buildPollutants(current: AirCurrent): Pollutant[] {
  const mapping: Record<PollutantKey, number | null> = {
    pm25: current.pm2_5,
    pm10: current.pm10,
    no2: current.nitrogen_dioxide,
    so2: current.sulphur_dioxide,
    o3: current.ozone,
    co: current.carbon_monoxide,
  };

  return (Object.keys(mapping) as PollutantKey[])
    .filter((key) => mapping[key] !== null && Number.isFinite(mapping[key] as number))
    .map((key) => {
      const meta = POLLUTANTS[key];
      const value = Math.round((mapping[key] as number) * 10) / 10;
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

function combineHourly(
  air: AirResponse,
  weather: WeatherResponse | null,
): HourPoint[] {
  const weatherByTime = new Map<
    string,
    {
      temperature: number | null;
      humidity: number | null;
      windSpeed: number | null;
      precipitationProbability: number | null;
    }
  >();

  if (weather) {
    weather.hourly.time.forEach((time, index) => {
      weatherByTime.set(time, {
        temperature: weather.hourly.temperature_2m[index] ?? null,
        humidity: weather.hourly.relative_humidity_2m[index] ?? null,
        windSpeed: weather.hourly.wind_speed_10m[index] ?? null,
        precipitationProbability: weather.hourly.precipitation_probability[index] ?? null,
      });
    });
  }

  return air.hourly.time.map((time, index) => {
    const pm25 = air.hourly.pm2_5[index] ?? null;
    const pm10 = air.hourly.pm10[index] ?? null;
    const weatherPoint = weatherByTime.get(time);
    return {
      time,
      hour: Number(time.slice(11, 13)),
      pm25,
      pm10,
      aqi: computeAqi(pm25, pm10)?.value ?? null,
      temperature: weatherPoint?.temperature ?? null,
      humidity: weatherPoint?.humidity ?? null,
      windSpeed: weatherPoint?.windSpeed ?? null,
      precipitationProbability: weatherPoint?.precipitationProbability ?? null,
    };
  });
}

function dataEpoch(localIso: string, utcOffsetSeconds: number): number {
  return Date.parse(`${localIso}:00Z`) - utcOffsetSeconds * 1000;
}

function withFreshness(environment: Environment): Environment {
  const epoch = Date.parse(environment.fetchedAt);
  const minutes = Number.isFinite(epoch)
    ? Math.max(0, Math.round((Date.now() - epoch) / 60000))
    : 0;
  return { ...environment, freshnessMinutes: minutes };
}

export async function fetchLiveEnvironment(
  location: GeoLocation,
): Promise<Environment> {
  const key = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.storedAt < LIVE_TTL_MS) {
    return withFreshness(cached.environment);
  }

  try {
    const airUrl = buildUrl(AIR_URL, {
      latitude: location.latitude,
      longitude: location.longitude,
      current:
        "pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide",
      hourly: "pm2_5,pm10",
      past_days: 1,
      forecast_days: 2,
      timezone: "auto",
    });

    const weatherUrl = buildUrl(WEATHER_URL, {
      latitude: location.latitude,
      longitude: location.longitude,
      current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
      hourly:
        "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability",
      past_days: 1,
      forecast_days: 2,
      timezone: "auto",
    });

    const [airResult, weatherResult] = await Promise.allSettled([
      fetchJson<AirResponse>(airUrl),
      fetchJson<WeatherResponse>(weatherUrl),
    ]);

    if (airResult.status === "rejected") {
      throw airResult.reason instanceof EnvironmentError
        ? airResult.reason
        : new EnvironmentError("upstream-unavailable", "Air quality service unavailable");
    }

    const air = airResult.value;
    const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
    const hourly = combineHourly(air, weather);
    const today = air.current.time.slice(0, 10);
    const todayPoints = pointsForDay(hourly, today);
    const values = todayPoints
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

    const yesterday = new Date(`${today}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);
    const yesterdayValues = pointsForDay(hourly, yesterdayIso)
      .map((point) => point.aqi)
      .filter((value): value is number => value !== null);

    const bestWindow = findBestWindow(hourly, today);
    const worstWindow = findWorstWindow(hourly, today);
    const aqi = computeAqi(air.current.pm2_5, air.current.pm10);

    const limitations = [
      "Model estimate from the CAMS air quality model, not a monitoring station observation.",
      "Hourly concentration applied to 24 hour AQI breakpoints, so the index is an estimate.",
      "Grid average for the city coordinate, not a street level measurement.",
    ];
    if (!weather) {
      limitations.push("Weather data unavailable for this request.");
    }
    if (!aqi) {
      limitations.push("No PM2.5 or PM10 value returned for this location.");
    }

    const environment: Environment = {
      location,
      source: "live",
      provenance: "model-estimate",
      fetchedAt: new Date(dataEpoch(air.current.time, air.utc_offset_seconds)).toISOString(),
      currentTime: air.current.time,
      aqi,
      pollutants: buildPollutants(air.current),
      weather: weather
        ? {
            temperature: weather.current.temperature_2m,
            humidity: weather.current.relative_humidity_2m,
            windSpeed: weather.current.wind_speed_10m,
            weatherCode: weather.current.weather_code,
            weatherLabel: weatherLabel(weather.current.weather_code),
          }
        : null,
      hourly,
      today:
        todayPoints.length > 0 && values.length > 0
          ? {
              avgAqi: Math.round(
                values.reduce((sum, value) => sum + value, 0) / values.length,
              ),
              peakAqi: peakPoint?.aqi ?? 0,
              peakHour: peakPoint?.hour ?? 0,
              lowAqi: lowPoint?.aqi ?? 0,
              lowHour: lowPoint?.hour ?? 0,
              bestWindow: bestWindow ?? {
                startHour: 14,
                endHour: 16,
                label: "14:00 to 16:00",
                avgPm25: 0,
                avgAqi: 0,
              },
              worstWindow: worstWindow ?? {
                startHour: 7,
                endHour: 9,
                label: "07:00 to 09:00",
                avgPm25: 0,
                avgAqi: 0,
              },
            }
          : null,
      yesterdayAvgAqi:
        yesterdayValues.length > 0
          ? Math.round(
              yesterdayValues.reduce((sum, value) => sum + value, 0) /
                yesterdayValues.length,
            )
          : null,
      freshnessMinutes: 0,
      limitations,
      dataNote:
        "Live model output from CAMS global air quality via Open-Meteo, paired with Open-Meteo weather.",
    };

    cache.set(key, { environment, storedAt: Date.now() });
    return withFreshness(environment);
  } catch (error) {
    if (cached && Date.now() - cached.storedAt < STALE_TTL_MS) {
      return withFreshness({
        ...cached.environment,
        source: "cached",
        dataNote:
          "The live provider did not respond. This is the last reading Airloom fetched, kept for a limited time.",
      });
    }
    throw error instanceof EnvironmentError
      ? error
      : new EnvironmentError("upstream-unavailable", "Air quality service unavailable");
  }
}

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const response = await fetchJson<{
      results?: Array<{
        name: string;
        admin1?: string;
        country?: string;
        latitude: number;
        longitude: number;
        timezone: string;
      }>;
    }>(
      buildUrl(GEOCODING_URL, {
        name: trimmed,
        count: 6,
        language: "en",
        format: "json",
      }),
    );
    return (response.results ?? []).map((result) => ({
      name: result.name,
      admin1: result.admin1,
      country: result.country ?? "",
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ name: string; admin1?: string; country: string }> {
  try {
    const data = await fetchJson<{
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    }>(
      buildUrl(REVERSE_URL, {
        latitude,
        longitude,
        localityLanguage: "en",
      }),
    );
    return {
      name: data.city || data.locality || "Current location",
      admin1: data.principalSubdivision,
      country: data.countryName || "",
    };
  } catch {
    return { name: "Current location", country: "" };
  }
}
