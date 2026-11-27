"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { categoryColor, categoryFor } from "@/lib/aqi";
import { compareCommute } from "@/lib/commute";
import { formatNumber } from "@/lib/format";
import { locationLabel } from "@/lib/profile";
import type { CommuteComparison } from "@/lib/types";
import { useEnvironment, useProfile } from "@/components/providers";
import { useDerived } from "@/components/dashboard/use-derived";
import { PageHeader, Provenance, WindowSummary } from "@/components/dashboard/blocks";
import { TrendChart } from "@/components/charts/trend-chart";
import { Badge, buttonClass, EmptyState, SectionLabel, StatusDot } from "@/components/ui";
import { cn } from "@/lib/format";

type Metric = "pm25" | "pm10" | "aqi";

const METRICS: { key: Metric; label: string; unit: string; guideline: number }[] = [
  { key: "pm25", label: "PM2.5", unit: "µg/m³", guideline: 15 },
  { key: "pm10", label: "PM10", unit: "µg/m³", guideline: 45 },
  { key: "aqi", label: "AQI", unit: "index", guideline: 50 },
];

const HOUR_OPTIONS = [6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22];

export default function ExposurePage() {
  const { profile } = useProfile();
  const { environment, status } = useEnvironment();
  const derived = useDerived();
  const [metric, setMetric] = useState<Metric>("pm25");
  const [hour, setHour] = useState<number | null>(null);

  const compareHour = hour ?? Number(profile.commuteTime.slice(0, 2));

  const commute = useMemo<CommuteComparison | null>(() => {
    if (!environment) return null;
    return compareCommute(environment, profile, compareHour);
  }, [environment, profile, compareHour]);

  const chart = useMemo(() => {
    if (!environment) return { data: [], nowIndex: 0 };
    const today = environment.currentTime.slice(0, 10);
    const tomorrow = new Date(`${today}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);
    const slice = environment.hourly.filter((point) => {
      const date = point.time.slice(0, 10);
      return date === today || date === tomorrowIso;
    });
    const valueFor = (point: (typeof slice)[number]) =>
      metric === "pm25" ? point.pm25 : metric === "pm10" ? point.pm10 : point.aqi;
    const currentIndex = slice.findIndex((point) => point.time === environment.currentTime);
    return {
      data: slice.map((point) => ({ time: point.time, value: valueFor(point) })),
      nowIndex: currentIndex === -1 ? 0 : currentIndex,
    };
  }, [environment, metric]);

  if (status === "loading" || !environment || !derived) {
    return (
      <div className="space-y-4">
        <PageHeader label="Exposure" title="Exposure detail" />
        <EmptyState title="Reading the forecast" body="Loading hourly concentrations for this location." />
      </div>
    );
  }

  const selected = METRICS.find((item) => item.key === metric) ?? METRICS[0];
  const nowPoint = environment.hourly.find((point) => point.time === environment.currentTime);
  const startIndex = environment.hourly.findIndex(
    (point) => point.time === environment.currentTime,
  );
  const strip = environment.hourly.slice(
    startIndex === -1 ? 0 : startIndex,
    (startIndex === -1 ? 0 : startIndex) + 12,
  );

  return (
    <div className="space-y-10">
      <PageHeader label="Exposure" title={locationLabel(environment.location)}>
        <Provenance environment={environment} />
      </PageHeader>

      <section className="border-t border-line-dark pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel tone="dark">Hourly view</SectionLabel>
            <h2 className="mt-2 text-2xl tracking-[-0.02em]">When the air is workable</h2>
          </div>
          <div role="group" aria-label="Chart metric" className="inline-flex rounded-lg border border-line-dark p-0.5">
            {METRICS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={metric === item.key}
                onClick={() => setMetric(item.key)}
                className={cn(
                  "h-9 rounded-md px-3 text-xs transition-colors",
                  metric === item.key
                    ? "bg-white/10 text-ink-light"
                    : "text-muted-dark hover:text-ink-light",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-line-dark bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm">
              {selected.label}{" "}
              <span className="text-muted-dark">
                {selected.unit === "index" ? "on the US EPA scale" : `in ${selected.unit}`}
              </span>
            </p>
            <p className="text-[11px] text-muted-dark">
              Dashed line marks {selected.key === "aqi" ? "the good range edge (50)" : `the WHO 2021 guideline (${selected.guideline})`}
            </p>
          </div>
          <div className="mt-3">
            <TrendChart
              data={chart.data}
              label={`${selected.label} for today and tomorrow`}
              unit={selected.unit}
              guideline={selected.guideline}
              guidelineLabel={selected.key === "aqi" ? "Good 50" : `WHO ${selected.guideline}`}
              nowIndex={chart.nowIndex}
              height={280}
            />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-dark">
            {derived.plan.bestWindow
              ? `The lowest two hour window is ${derived.plan.bestWindow.label} at ${formatNumber(derived.plan.bestWindow.avgPm25, 0)} ${selected.unit === "index" ? "AQI" : selected.label}. The highest is ${derived.plan.worstWindow?.label ?? "unavailable"} at ${formatNumber(derived.plan.worstWindow?.avgPm25 ?? 0, 0)} ${selected.unit === "index" ? "AQI" : selected.label}. Plan outdoor time in the lower window and keep sessions short in the higher one.`
              : "A two hour window comparison needs a full day of hourly values."}
          </p>
        </div>
      </section>

      <section aria-labelledby="strip-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="strip-heading" className="text-lg">
            Next 12 hours
          </h2>
          <p className="text-[11px] text-muted-dark">Hourly model estimate</p>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 thin-scroll">
          {strip.map((point) => (
            <div
              key={point.time}
              className="min-w-[86px] flex-1 rounded-xl border border-line-dark bg-surface px-3 py-3"
            >
              <p className="tnum text-[11px] text-muted-dark">{point.time.slice(11, 16)}</p>
              <p className="tnum mt-2 text-lg">{point.pm25 !== null ? formatNumber(point.pm25, 0) : "-"}</p>
              <p className="text-[10px] text-muted-dark">µg/m³ PM2.5</p>
              <div className="mt-2 flex items-center gap-1.5">
                <StatusDot
                  color={point.aqi !== null ? categoryColor(categoryFor(point.aqi)) : "var(--sev-unavailable)"}
                />
                <span className="text-[10px] text-muted-dark">
                  {point.aqi !== null ? `AQI ${point.aqi}` : "no index"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="commute-heading" className="border-t border-line-dark pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="commute-heading" className="text-lg">
              Commute comparison
            </h2>
            <p className="mt-1 text-xs text-muted-dark">
              Ambient PM2.5 at {String(compareHour).padStart(2, "0")}:00 is{" "}
              <span className="tnum text-ink-light">
                {formatNumber(commute?.ambientPm25 ?? 0, 0)} µg/m³
              </span>{" "}
              over {formatNumber(profile.commuteDistanceKm, 1)} km.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="compare-hour" className="text-[11px] text-muted-dark">
              Compare at
            </label>
            <select
              id="compare-hour"
              value={compareHour}
              onChange={(event) => setHour(Number(event.target.value))}
              className="h-10 rounded-lg border border-line-dark bg-night px-2 text-xs text-ink-light [color-scheme:dark]"
            >
              {HOUR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {String(option).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line-dark text-[11px] uppercase tracking-[0.1em] text-muted-dark">
                <th scope="col" className="py-2 pr-4 font-normal">Mode</th>
                <th scope="col" className="py-2 pr-4 font-normal">Time</th>
                <th scope="col" className="py-2 pr-4 font-normal">Exposure proxy</th>
                <th scope="col" className="py-2 pr-4 font-normal">CO2</th>
                <th scope="col" className="py-2 font-normal">Why</th>
              </tr>
            </thead>
            <tbody>
              {(commute?.options ?? []).map((option) => (
                <tr
                  key={option.mode}
                  className={cn(
                    "border-b border-line-dark/70 align-top",
                    option.recommended ? "text-ink-light" : "text-muted-dark",
                  )}
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      {option.recommended ? <StatusDot color="var(--sev-good)" /> : null}
                      {option.label}
                    </span>
                    {option.recommended ? (
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.1em] text-green">
                        Recommended
                      </span>
                    ) : null}
                  </td>
                  <td className="tnum py-3 pr-4">{option.durationMin} min</td>
                  <td className="tnum py-3 pr-4">{formatNumber(option.exposureProxy, 0)}</td>
                  <td className="tnum py-3 pr-4">{formatNumber(option.co2Kg, 2)} kg</td>
                  <td className="py-3 text-[12px] leading-relaxed">{option.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-[11px] leading-relaxed text-muted-dark">
          {commute?.note}
        </p>
      </section>

      <section className="border-t border-line-dark pt-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <SectionLabel tone="dark">Model estimate</SectionLabel>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-dark">
              PM2.5, PM10, NO2, SO2, O3, CO, AQI, weather. Grid values from the CAMS model via
              Open-Meteo.
            </p>
          </div>
          <div>
            <SectionLabel tone="dark">Calculated</SectionLabel>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-dark">
              AQI sub indices, exposure proxy, two hour windows, planned versus current routine.
            </p>
          </div>
          <div>
            <SectionLabel tone="dark">Your input</SectionLabel>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-dark">
              Household, commute time and distance, activity, indoor setup. Stored in this browser
              only.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/indoor" className={buttonClass("darkOutline")}>
            Indoor guidance
          </Link>
          <Link href="/dashboard/assistant" className={buttonClass("dark")}>
            Ask about this window <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="pollutant-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="pollutant-heading" className="text-lg">
            What is driving the index
          </h2>
          {environment.aqi ? (
            <Badge tone="dark">
              <StatusDot color={categoryColor(environment.aqi.category)} />
              {environment.aqi.dominantLabel} dominant
            </Badge>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(environment.aqi?.breakdown ?? []).map((item) => (
            <div key={item.key} className="rounded-xl border border-line-dark bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">{item.label}</p>
                <p className="tnum text-sm">AQI {item.subIndex}</p>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((item.subIndex / 300) * 100))}%`,
                    backgroundColor: categoryColor(categoryFor(item.subIndex)),
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-dark">
                {item.label} sub index from the same hourly model value.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <WindowSummary plan={derived.plan} />
        </div>
        {nowPoint?.pm25 !== null && nowPoint?.pm25 !== undefined ? (
          <p className="mt-4 text-[11px] text-muted-dark">
            Current hour PM2.5 is {formatNumber(nowPoint.pm25, 0)} µg/m³. Values are hourly model
            concentrations, not a 24 hour station average.
          </p>
        ) : null}
      </section>
    </div>
  );
}
