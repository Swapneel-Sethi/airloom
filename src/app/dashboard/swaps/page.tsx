"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { locationLabel } from "@/lib/profile";
import { buildSwaps } from "@/lib/swaps";
import { useEnvironment, useProfile } from "@/components/providers";
import { useDerived } from "@/components/dashboard/use-derived";
import { PageHeader, Provenance } from "@/components/dashboard/blocks";
import { buttonClass, EmptyState, SectionLabel } from "@/components/ui";

const EFFORT_LABEL: Record<string, string> = {
  low: "Low effort",
  medium: "Medium effort",
  high: "High effort",
};

export default function SwapsPage() {
  const { profile } = useProfile();
  const { environment, status } = useEnvironment();
  const derived = useDerived();

  const swaps = useMemo(() => {
    if (!environment || !derived) return [];
    return buildSwaps(environment, profile, derived.plan, derived.commute);
  }, [environment, derived, profile]);

  if (status === "loading" || !environment || !derived) {
    return (
      <div className="space-y-4">
        <PageHeader label="Swaps" title="Sustainable swaps" />
        <EmptyState title="Comparing your routine" body="Loading the exposure and emission comparison." />
      </div>
    );
  }

  const { plan } = derived;
  const delta =
    plan.baselineExposureProxy && plan.outdoorExposureProxy !== null && plan.baselineExposureProxy > 0
      ? Math.round(
          ((plan.outdoorExposureProxy - plan.baselineExposureProxy) / plan.baselineExposureProxy) * 100,
        )
      : null;

  return (
    <div className="space-y-10">
      <PageHeader label="Swaps" title={locationLabel(environment.location)}>
        <Provenance environment={environment} />
      </PageHeader>

      <section className="border-t border-line-dark pt-8">
        <SectionLabel tone="dark">Impact simulator</SectionLabel>
        <h2 className="mt-2 text-2xl tracking-[-0.02em]">Your routine against the adjusted one</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-dark">
          Both numbers use the same PM2.5 forecast, the same commute distance, and the same session
          length. Only timing and mode change.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">Current routine</p>
            <p className="tnum mt-1.5 text-2xl">
              {formatNumber(plan.baselineExposureProxy ?? 0, 0)}
              <span className="ml-1 text-xs text-muted-dark">µg/m³·h</span>
            </p>
          </div>
          <div className="sm:border-l sm:border-line-dark sm:pl-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">With this plan</p>
            <p className="tnum mt-1.5 text-2xl">
              {formatNumber(plan.outdoorExposureProxy ?? 0, 0)}
              <span className="ml-1 text-xs text-muted-dark">µg/m³·h</span>
            </p>
          </div>
          <div className="sm:border-l sm:border-line-dark sm:pl-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">Difference</p>
            <p className="tnum mt-1.5 text-2xl">
              {delta === null ? "Unavailable" : `${delta > 0 ? "+" : ""}${delta}%`}
            </p>
          </div>
        </div>
        <div className="mt-4 max-w-2xl">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-ink-light"
              style={{
                width: `${Math.max(6, Math.min(100, Math.round(((plan.outdoorExposureProxy ?? 0) / Math.max(1, plan.baselineExposureProxy ?? 1)) * 100)))}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-dark">
            Exposure proxy is concentration × time. It is not inhaled dose and not a health risk
            estimate. Lower is better for planning.
          </p>
        </div>
      </section>

      <section aria-labelledby="swaps-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="swaps-heading" className="text-lg">
            Swaps that fit this week
          </h2>
          <p className="text-[11px] text-muted-dark">All figures are estimates</p>
        </div>
        <ol className="mt-5 divide-y divide-line-dark border-y border-line-dark">
          {swaps.map((swap, index) => (
            <li key={swap.id} className="grid gap-4 py-6 sm:grid-cols-[40px_1fr_200px]">
              <p className="tnum text-[11px] text-muted-dark">{String(index + 1).padStart(2, "0")}</p>
              <div>
                <p className="text-[15px] text-ink-light">{swap.title}</p>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-dark">
                  {swap.change}
                </p>
                <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted-dark">
                  {swap.why}
                </p>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-muted-dark/60">
                  Basis: {swap.basis}
                </p>
              </div>
              <div>
                <p className="text-[13px] leading-relaxed text-ink-light">{swap.impact}</p>
                <dl className="mt-3 space-y-1 text-[11px] text-muted-dark">
                  <div className="flex justify-between gap-2">
                    <dt>Effort</dt>
                    <dd>{EFFORT_LABEL[swap.effort]}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Frequency</dt>
                    <dd>{swap.frequency}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Horizon</dt>
                    <dd>{swap.horizon}</dd>
                  </div>
                  {swap.co2SavedKgPerYear !== null ? (
                    <div className="flex justify-between gap-2">
                      <dt>Annual estimate</dt>
                      <dd className="tnum">{formatNumber(swap.co2SavedKgPerYear, 0)} kg CO2</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </li>
          ))}
        </ol>
        {swaps.length === 0 ? (
          <p className="mt-4 text-sm text-muted-dark">
            Add transport and indoor details in settings to see swaps for your routine.
          </p>
        ) : null}
      </section>

      <section className="border-t border-line-dark pt-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <SectionLabel tone="dark">What is calculated</SectionLabel>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-dark">
              Exposure proxy from the hourly PM2.5 model and your saved times. Commute emissions
              from per passenger km planning factors. Both are labelled where they appear.
            </p>
          </div>
          <div>
            <SectionLabel tone="dark">What is not</SectionLabel>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-dark">
              Airloom does not measure your vehicle, your route, or your indoor air. It does not
              convert the exposure proxy into a health outcome.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/dashboard/today" className={buttonClass("darkOutline")}>
            Rebuild the plan
          </Link>
          <Link href="/dashboard/assistant" className={buttonClass("dark")}>
            Ask which swap matters most <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
