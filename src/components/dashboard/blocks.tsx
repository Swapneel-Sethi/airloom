"use client";

import { ChevronDown } from "lucide-react";
import type { DailyPlan, Environment, Recommendation } from "@/lib/types";
import { categoryColor } from "@/lib/aqi";
import { formatNumber, formatRelativeMinutes } from "@/lib/format";
import { StatusDot, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/format";

export function PageHeader({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <SectionLabel tone="dark">{label}</SectionLabel>
        <h1 className="mt-2 text-3xl tracking-[-0.02em] sm:text-4xl">{title}</h1>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

export function Provenance({
  environment,
  className,
}: {
  environment: Environment;
  className?: string;
}) {
  const sourceLabel =
    environment.source === "live"
      ? "Live model estimate"
      : environment.source === "cached"
        ? "Cached reading"
        : "Demo scenario";
  const dotColor =
    environment.source === "live"
      ? "var(--sev-good)"
      : environment.source === "cached"
        ? "var(--sev-elevated)"
        : "var(--sev-moderate)";
  const freshness =
    environment.source === "demo"
      ? "seeded values"
      : formatRelativeMinutes(environment.freshnessMinutes);

  return (
    <details className={cn("group max-w-xl text-[11px]", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-dark marker:hidden">
        <StatusDot color={dotColor} />
        <span>
          {sourceLabel}
          <span className="mx-1.5 text-line-dark">/</span>
          {freshness}
        </span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className="transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-2 space-y-1.5 rounded-lg border border-line-dark bg-surface p-3 leading-relaxed text-muted-dark">
        <p>{environment.dataNote}</p>
        <p>
          Data class: model estimate. Model hour: {environment.currentTime.replace("T", " ")}.{" "}
          {environment.location.name}
          {environment.location.country ? `, ${environment.location.country}` : ""}.
        </p>
        <ul className="space-y-1">
          {environment.limitations.map((limitation) => (
            <li key={limitation} className="flex gap-1.5">
              <span aria-hidden="true" className="text-line-dark">
                -
              </span>
              {limitation}
            </li>
          ))}
        </ul>
        <p className="pt-1 text-muted-dark">
          AQI uses US EPA breakpoints on the hourly model concentration. See the method notes in
          the repository.
        </p>
      </div>
    </details>
  );
}

export function ConfidenceTag({ confidence }: { confidence: Recommendation["confidence"] }) {
  const label =
    confidence === "high" ? "Higher confidence" : confidence === "medium" ? "Medium confidence" : "Lower confidence";
  return <span className="text-[11px] text-muted-dark">{label}</span>;
}

export function PlanList({
  plan,
  compact = false,
  limit,
}: {
  plan: DailyPlan;
  compact?: boolean;
  limit?: number;
}) {
  const blocks = limit ? plan.blocks.slice(0, limit) : plan.blocks;
  return (
    <ol className="relative">
      {blocks.map((block, index) => (
        <li key={`${block.id}-${block.timeRange}`} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="flex w-14 shrink-0 flex-col items-end pt-0.5">
            <span className="tnum text-xs text-muted-dark">
              {block.timeRange.match(/\d{2}:\d{2}/)?.[0] ?? ""}
            </span>
          </div>
          <div className="relative flex flex-col items-center">
            <span
              aria-hidden="true"
              className="mt-1.5 size-2 rounded-full"
              style={{
                backgroundColor:
                  block.category === "indoor"
                    ? "var(--sev-good)"
                    : block.category === "transport"
                      ? "var(--sev-moderate)"
                      : "var(--sev-elevated)",
              }}
            />
            {index < blocks.length - 1 ? (
              <span aria-hidden="true" className="mt-1 w-px flex-1 bg-line-dark" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">
                {block.blockLabel}
              </p>
              <p className="text-[11px] text-muted-dark">{block.timeRange}</p>
            </div>
            <p className="mt-1 text-[15px] leading-snug text-ink-light">{block.action}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-dark">{block.reason}</p>
            {!compact ? (
              <>
                <ul className="mt-2 space-y-1">
                  {block.why.map((item) => (
                    <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-muted-dark">
                      <span aria-hidden="true" className="text-line-dark">
                        -
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-dark">
                  {block.impact ? (
                    <span>
                      {block.impact.label}: <span className="tnum text-ink-light">{block.impact.value}</span>{" "}
                      <span className="text-muted-dark">({block.impact.basis})</span>
                    </span>
                  ) : null}
                  <ConfidenceTag confidence={block.confidence} />
                </div>
                <p className="mt-1 text-[11px] text-muted-dark">Basis: {block.basis.join(". ")}</p>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WindowSummary({ plan }: { plan: DailyPlan }) {
  if (!plan.bestWindow || !plan.worstWindow) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">Lowest window</p>
        <p className="tnum mt-1.5 text-lg">{plan.bestWindow.label}</p>
        <p className="mt-0.5 text-[12px] text-muted-dark">
          {formatNumber(plan.bestWindow.avgPm25, 0)} µg/m³ average PM2.5
        </p>
      </div>
      <div className="sm:border-l sm:border-line-dark sm:pl-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">Highest window</p>
        <p className="tnum mt-1.5 text-lg">{plan.worstWindow.label}</p>
        <p className="mt-0.5 text-[12px] text-muted-dark">
          {formatNumber(plan.worstWindow.avgPm25, 0)} µg/m³ average PM2.5
        </p>
      </div>
      <div className="sm:border-l sm:border-line-dark sm:pl-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">Planned exposure proxy</p>
        <p className="tnum mt-1.5 text-lg">
          {formatNumber(plan.outdoorExposureProxy ?? 0, 0)}{" "}
          <span className="text-xs text-muted-dark">µg/m³·h</span>
        </p>
        <p className="mt-0.5 text-[12px] text-muted-dark">
          {plan.baselineExposureProxy && plan.outdoorExposureProxy !== null
            ? `${Math.round(((plan.outdoorExposureProxy - plan.baselineExposureProxy) / plan.baselineExposureProxy) * 100)}% vs your current routine`
            : "No comparison available"}
        </p>
      </div>
    </div>
  );
}

export function AqiReadout({
  environment,
  size = "large",
}: {
  environment: Environment;
  size?: "large" | "medium";
}) {
  const aqi = environment.aqi;
  if (!aqi) {
    return (
      <div>
        <SectionLabel tone="dark">Air quality index</SectionLabel>
        <p className="mt-3 text-4xl text-muted-dark">Unavailable</p>
        <p className="mt-3 max-w-md text-sm text-muted-dark">
          The provider did not return PM2.5 or PM10 for this coordinate. The rest of your plan will
          return with the next reading.
        </p>
      </div>
    );
  }

  const pm25 = environment.pollutants.find((item) => item.key === "pm25");
  return (
    <div>
      <div className="flex items-center gap-2">
        <SectionLabel tone="dark">Air quality index</SectionLabel>
        <span className="text-[11px] text-muted-dark">US EPA scale</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
        <span
          className={cn(
            "tnum leading-[0.82] tracking-[-0.045em]",
            size === "large"
              ? "text-[clamp(4.5rem,13vw,7.5rem)]"
              : "text-[clamp(3.5rem,10vw,5.5rem)]",
          )}
        >
          {aqi.value}
        </span>
        <div className="pb-2">
          <div className="flex items-center gap-2">
            <StatusDot color={categoryColor(aqi.category)} pulse={aqi.value > 150} />
            <span className="text-sm text-ink-light">{aqi.categoryLabel}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-dark">{aqi.dominantLabel} dominant</p>
        </div>
      </div>
      {pm25 && pm25.value !== null ? (
        <p className="mt-4 text-sm text-ink-light">
          PM2.5 <span className="tnum">{formatNumber(pm25.value, 0)}</span> µg/m³
          {pm25.multipleOfGuideline ? (
            <span className="text-muted-dark">
              {" "}
              / {formatNumber(pm25.multipleOfGuideline, 1)}× the WHO 2021 24 hour guideline
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-label="Loading" role="status">
      <div className="h-8 w-2/3 rounded-md bg-surface" />
      <div className="h-24 w-full rounded-xl bg-surface" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 w-full rounded-lg bg-surface" />
      ))}
    </div>
  );
}
