"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Droplets,
  RefreshCw,
  Thermometer,
  Wind,
} from "lucide-react";
import { categoryColor } from "@/lib/aqi";
import { formatNumber, formatRelativeMinutes } from "@/lib/format";
import { locationLabel } from "@/lib/profile";
import { buildSwaps } from "@/lib/swaps";
import { useEnvironment, useProfile } from "@/components/providers";
import { useDerived } from "@/components/dashboard/use-derived";
import {
  AqiReadout,
  LoadingBlock,
  PageHeader,
  PlanList,
  Provenance,
  WindowSummary,
} from "@/components/dashboard/blocks";
import { TrendChart } from "@/components/charts/trend-chart";
import { Badge, buttonClass, EmptyState, SectionLabel, StatusDot } from "@/components/ui";

export default function OverviewPage() {
  const { profile, updateProfile } = useProfile();
  const { environment, status, error, refresh, isRefreshing } = useEnvironment();
  const derived = useDerived();

  const swaps = useMemo(() => {
    if (!environment || !derived) return [];
    return buildSwaps(environment, profile, derived.plan, derived.commute);
  }, [environment, derived, profile]);

  const chart = useMemo(() => {
    if (!environment) return { data: [], nowIndex: 0 };
    const currentIndex = environment.hourly.findIndex(
      (point) => point.time === environment.currentTime,
    );
    const start = Math.max(0, currentIndex === -1 ? 0 : currentIndex - 2);
    const slice = environment.hourly.slice(start, start + 26);
    return {
      data: slice.map((point) => ({ time: point.time, value: point.pm25 })),
      nowIndex: currentIndex === -1 ? 0 : Math.min(2, slice.length - 1),
    };
  }, [environment]);

  if (status === "loading" || !environment) {
    return (
      <div className="space-y-6">
        <div>
          <SectionLabel tone="dark">Overview</SectionLabel>
          <div className="mt-3 h-9 w-56 rounded-md bg-surface" />
        </div>
        <LoadingBlock rows={4} />
      </div>
    );
  }

  if (!environment.aqi || !derived) {
    return (
      <div className="space-y-6">
        <PageHeader label="Overview" title={locationLabel(environment.location)} />
        <EmptyState
          title="Air quality data is unavailable for this location"
          body="The provider did not return a usable PM2.5 or PM10 reading. Airloom will not invent one. Retry the request, or open a demo scenario to see how the plan works."
          action={
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={refresh} className={buttonClass("dark")}>
                Try again
              </button>
              <Link href="/dashboard/settings" className={buttonClass("darkOutline")}>
                Open demo scenarios
              </Link>
            </div>
          }
        />
        {error ? <p className="text-xs text-muted-dark">{error}</p> : null}
      </div>
    );
  }

  const { plan, indoor } = derived;
  const aqi = environment.aqi;
  const top = plan.blocks.find((block) => block.block === "commute") ?? plan.blocks[0];
  const trend =
    chart.data.length > 1
      ? (chart.data[chart.data.length - 1].value ?? 0) - (chart.data[0].value ?? 0)
      : 0;

  return (
    <div className="space-y-10">
      <PageHeader label="Overview" title={locationLabel(environment.location)}>
        {environment.source === "demo" ? <Badge tone="dark">Demo scenario</Badge> : null}
        <span className="text-[11px] text-muted-dark">
          {environment.source === "demo"
            ? "Seeded values"
            : `Updated ${formatRelativeMinutes(environment.freshnessMinutes)}`}
        </span>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex h-11 items-center gap-2 rounded-lg px-2.5 text-[12px] text-muted-dark hover:bg-white/5 hover:text-ink-light"
          aria-label="Refresh air quality"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : undefined} />
          Refresh
        </button>
      </PageHeader>

      {error ? (
        <p className="rounded-lg border border-amber/30 bg-amber/5 px-3 py-2 text-xs text-amber" role="status">
          Live refresh failed. Showing the last reading Airloom holds. {error}
        </p>
      ) : null}

      {!profile.onboarded ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line-dark bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-dark">
            You are viewing a seeded Delhi scenario. Set your city and household to see your own
            plan.
          </p>
          <div className="flex gap-2">
            <Link href="/onboarding" className={buttonClass("darkOutline", "h-10 px-3.5 text-xs")}>
              Set up
            </Link>
            <button
              type="button"
              onClick={() => updateProfile({ onboarded: true })}
              className={buttonClass("dark", "h-10 px-3.5 text-xs")}
            >
              Keep demo
            </button>
          </div>
        </div>
      ) : null}

      <section aria-labelledby="aqi-heading" className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <h2 id="aqi-heading" className="sr-only">
            Current air quality
          </h2>
          <AqiReadout environment={environment} />
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-dark">
            {aqi.category === "good"
              ? "Air is within the good range for most people today."
              : aqi.category === "moderate"
                ? "Air is acceptable for most people, with pollutants above guideline levels."
                : aqi.category === "elevated"
                  ? "Sensitive groups may notice effects during long outdoor exposure."
                  : aqi.category === "high"
                    ? "Outdoor exposure carries a measurable pollution load today."
                    : aqi.category === "very-high"
                      ? "Long outdoor periods carry a high pollution load today."
                      : "Outdoor air carries an extreme pollution load today."}
          </p>
          <Provenance environment={environment} className="mt-4" />
        </div>

        <div className="rounded-3xl border border-line-dark bg-surface p-5">
          <dl className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-xs text-muted-dark">
                <Thermometer size={14} aria-hidden="true" /> Temperature
              </dt>
              <dd className="tnum text-sm">
                {environment.weather ? `${formatNumber(environment.weather.temperature, 0)} °C` : "Unavailable"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line-dark pt-4">
              <dt className="flex items-center gap-2 text-xs text-muted-dark">
                <Droplets size={14} aria-hidden="true" /> Humidity
              </dt>
              <dd className="tnum text-sm">
                {environment.weather ? `${formatNumber(environment.weather.humidity, 0)}%` : "Unavailable"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line-dark pt-4">
              <dt className="flex items-center gap-2 text-xs text-muted-dark">
                <Wind size={14} aria-hidden="true" /> Wind
              </dt>
              <dd className="tnum text-sm">
                {environment.weather ? `${formatNumber(environment.weather.windSpeed, 0)} km/h` : "Unavailable"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line-dark pt-4">
              <dt className="text-xs text-muted-dark">Dominant pollutant</dt>
              <dd className="text-sm">{aqi.dominantLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line-dark pt-4">
              <dt className="text-xs text-muted-dark">Day average</dt>
              <dd className="tnum text-sm">
                AQI {environment.today?.avgAqi ?? aqi.value}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line-dark pt-4">
              <dt className="text-xs text-muted-dark">Peak</dt>
              <dd className="tnum text-sm">
                {environment.today ? `${environment.today.peakAqi} at ${String(environment.today.peakHour).padStart(2, "0")}:00` : "Unavailable"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="call-heading" className="border-t border-line-dark pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel tone="dark">Today&apos;s call</SectionLabel>
          <div className="flex items-center gap-2 text-[11px] text-muted-dark">
            <StatusDot color={categoryColor(aqi.category)} />
            {plan.sensitivity === "sensitive" ? "Sensitive household thresholds" : "Standard thresholds"}
          </div>
        </div>
        <h2 id="call-heading" className="mt-3 max-w-3xl text-2xl leading-tight tracking-[-0.02em] sm:text-[32px]">
          {top?.action ?? plan.headline}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-dark">
          {top?.reason ?? plan.summary}
        </p>
        <div className="mt-6">
          <WindowSummary plan={plan} />
        </div>
        {top?.impact ? (
          <p className="mt-5 text-[12px] text-muted-dark">
            {top.impact.label}:{" "}
            <span className="tnum text-ink-light">{top.impact.value}</span>{" "}
            <span className="text-muted-dark">({top.impact.basis})</span>
          </p>
        ) : null}
      </section>

      <section aria-labelledby="trend-heading" className="rounded-3xl border border-line-dark bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="trend-heading" className="text-lg">
              Next 24 hours
            </h2>
            <p className="mt-1 text-xs text-muted-dark">
              PM2.5 model estimate in µg/m³. Dashed line marks the WHO 2021 24 hour guideline.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-dark">
            <StatusDot color="#f4f3f0" /> PM2.5
          </div>
        </div>
        <div className="mt-4">
          <TrendChart
            data={chart.data}
            label="PM2.5 over the next 24 hours"
            unit="µg/m³"
            guideline={15}
            guidelineLabel="WHO 15"
            nowIndex={chart.nowIndex}
            height={240}
          />
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-dark">
          {trend > 10
            ? "PM2.5 is expected to rise through this window. Plan outdoor time earlier."
            : trend < -10
              ? "PM2.5 is expected to ease through this window. The later hours are the lower exposure option."
              : "PM2.5 stays close to its current level through this window. Timing matters less than duration."}{" "}
          The lowest two hour window is {plan.bestWindow?.label ?? "unavailable"} at{" "}
          <span className="tnum text-ink-light">
            {formatNumber(plan.bestWindow?.avgPm25 ?? 0, 0)} µg/m³
          </span>
          .
        </p>
      </section>

      <section aria-labelledby="day-heading" className="grid gap-8 border-t border-line-dark pt-8 lg:grid-cols-[1.45fr_1fr]">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 id="day-heading" className="text-lg">
              Your day
            </h2>
            <Link
              href="/dashboard/today"
              className="inline-flex h-11 items-center gap-1.5 text-xs text-muted-dark hover:text-ink-light"
            >
              Full plan <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5">
            <PlanList plan={plan} compact limit={4} />
          </div>
        </div>

        <div className="rounded-3xl border border-line-dark bg-surface p-5">
          <h2 className="text-lg">Indoor now</h2>
          <p className="mt-2 text-xs text-muted-dark">
            Outdoor PM2.5 is {formatNumber(indoor.outdoorPm25 ?? 0, 0)} µg/m³. With your setup the
            occupied room is estimated at{" "}
            <span className="tnum text-ink-light">{formatNumber(indoor.estimatedPm25 ?? 0, 0)} µg/m³</span>.
          </p>
          <div className="mt-4 space-y-2">
            {indoor.actions.slice(0, 2).map((action) => (
              <div key={action.id} className="border-t border-line-dark pt-2 first:border-0 first:pt-0">
                <p className="text-[13px] leading-snug text-ink-light">{action.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-dark">{action.reason}</p>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/indoor"
            className="mt-4 inline-flex h-11 items-center gap-1.5 text-xs text-muted-dark hover:text-ink-light"
          >
            Indoor guidance <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="swaps-heading" className="border-t border-line-dark pt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="swaps-heading" className="text-lg">
            Lower exposure swaps
          </h2>
          <Link
            href="/dashboard/swaps"
            className="inline-flex h-11 items-center gap-1.5 text-xs text-muted-dark hover:text-ink-light"
          >
            All swaps <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {swaps.slice(0, 2).map((swap) => (
            <div key={swap.id}>
              <p className="text-sm text-ink-light">{swap.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-dark">{swap.impact}</p>
              <p className="mt-2 text-[11px] text-muted-dark">
                {swap.frequency} · {swap.effort} effort · estimate
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line-dark bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg">Ask Airloom about today</h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-dark">
              Answers use this location, your household, your commute, and the plan above. The
              assistant explains the numbers, it does not invent them.
            </p>
          </div>
          <Link href="/dashboard/assistant" className={buttonClass("dark", "shrink-0")}>
            Open assistant <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
