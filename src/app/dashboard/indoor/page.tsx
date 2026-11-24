"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { locationLabel } from "@/lib/profile";
import { useEnvironment, useProfile } from "@/components/providers";
import { useDerived } from "@/components/dashboard/use-derived";
import { PageHeader, Provenance } from "@/components/dashboard/blocks";
import { buttonClass, EmptyState, SectionLabel, StatusDot } from "@/components/ui";

const PRIORITY_LABEL: Record<string, string> = {
  now: "Do now",
  today: "Today",
  "this-week": "This week",
};

export default function IndoorPage() {
  const { profile } = useProfile();
  const { environment, status } = useEnvironment();
  const derived = useDerived();

  if (status === "loading" || !environment || !derived) {
    return (
      <div className="space-y-4">
        <PageHeader label="Indoor" title="Indoor air" />
        <EmptyState title="Reading outdoor air" body="The indoor estimate is built from the outdoor PM2.5 value and your setup." />
      </div>
    );
  }

  const { indoor } = derived;
  const maxValue = Math.max(indoor.outdoorPm25 ?? 1, ...indoor.rooms.map((room) => room.pm25), 1);

  return (
    <div className="space-y-10">
      <PageHeader label="Indoor" title={`Indoor air in ${locationLabel(environment.location)}`}>
        <Provenance environment={environment} />
      </PageHeader>

      {!indoor.available ? (
        <EmptyState
          title="Indoor estimate needs a PM2.5 value"
          body="The provider did not return PM2.5 for this location, so Airloom will not estimate indoor air. Retry from the overview."
          action={
            <Link href="/dashboard" className={buttonClass("dark")}>
              Back to overview
            </Link>
          }
        />
      ) : (
        <>
          <section className="grid gap-8 border-t border-line-dark pt-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <SectionLabel tone="dark">Outdoor against indoor</SectionLabel>
              <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
                <div>
                  <p className="text-[11px] text-muted-dark">Outdoor PM2.5</p>
                  <p className="tnum mt-1 text-4xl tracking-[-0.03em] sm:text-5xl">
                    {formatNumber(indoor.outdoorPm25 ?? 0, 0)}
                    <span className="ml-1 text-sm text-muted-dark">µg/m³</span>
                  </p>
                </div>
                <div className="pb-1">
                  <p className="text-[11px] text-muted-dark">Estimated occupied room</p>
                  <p className="tnum mt-1 text-4xl tracking-[-0.03em] sm:text-5xl">
                    {formatNumber(indoor.estimatedPm25 ?? 0, 0)}
                    <span className="ml-1 text-sm text-muted-dark">µg/m³</span>
                  </p>
                </div>
              </div>
              <div className="mt-5 max-w-xl">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full bg-[#3a3a3a]"
                    style={{ width: `${Math.round(((indoor.estimatedPm25 ?? 0) / maxValue) * 100)}%` }}
                  />
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.round((((indoor.outdoorPm25 ?? 0) - (indoor.estimatedPm25 ?? 0)) / maxValue) * 100)}%`,
                      backgroundColor: "var(--sev-elevated)",
                      opacity: 0.55,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-dark">
                  <span>Estimated indoor</span>
                  <span>Outdoor</span>
                </div>
              </div>
              <details className="group mt-5 max-w-xl text-[11px]">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-dark">
                  <StatusDot color="var(--sev-moderate)" />
                  How this is calculated
                </summary>
                <p className="mt-2 rounded-lg border border-line-dark bg-surface p-3 leading-relaxed text-muted-dark">
                  {indoor.method}
                </p>
              </details>
            </div>

            <div className="rounded-3xl border border-line-dark bg-surface p-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">Ventilation</p>
              <p className="mt-2 text-lg">
                {indoor.ventilationWindow
                  ? `Open windows ${indoor.ventilationWindow.label}`
                  : "Keep windows closed today"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-dark">
                {indoor.ventilationWindow
                  ? `The two hour average in that window is ${formatNumber(indoor.ventilationWindow.avgPm25, 0)} µg/m³, below the 30 µg/m³ threshold Airloom uses for ventilation.`
                  : `No two hour window today falls below 30 µg/m³. Ventilation would bring more particles in than it removes.`}
              </p>
              <p className="mt-4 border-t border-line-dark pt-3 text-[11px] text-muted-dark">
                Infiltration factor for your setup:{" "}
                <span className="tnum text-ink-light">{indoor.infiltration}</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-dark">
                {profile.ventilation.includes("purifier")
                  ? "A purifier is included in this factor."
                  : "No purifier is selected, so filtration is not included."}
              </p>
            </div>
          </section>

          <section aria-labelledby="rooms-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="rooms-heading" className="text-lg">
                Room estimates
              </h2>
              <p className="text-[11px] text-muted-dark">Planning model, not a sensor reading</p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {indoor.rooms.map((room) => (
                <div key={room.name} className="rounded-xl border border-line-dark bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm">{room.name}</p>
                    <p className="tnum text-sm">
                      {formatNumber(room.pm25, 0)}
                      <span className="ml-1 text-[11px] text-muted-dark">µg/m³</span>
                    </p>
                  </div>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-ink-light/70"
                      style={{ width: `${Math.max(4, Math.round((room.pm25 / maxValue) * 100))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-dark">{room.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="actions-heading" className="border-t border-line-dark pt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="actions-heading" className="text-lg">
                Indoor actions
              </h2>
              <p className="text-[11px] text-muted-dark">{indoor.actions.length} actions for today</p>
            </div>
            <ol className="mt-5 space-y-6">
              {indoor.actions.map((action) => (
                <li key={action.id} className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-dark">
                      {PRIORITY_LABEL[action.priority] ?? action.priority}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-dark/70">{action.effort} effort</p>
                  </div>
                  <div>
                    <p className="text-[15px] text-ink-light">{action.title}</p>
                    <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-dark">
                      {action.reason}
                    </p>
                    <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted-dark/80">
                      {action.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-t border-line-dark pt-8">
            <p className="max-w-3xl text-[11px] leading-relaxed text-muted-dark">
              The indoor estimate does not measure your home. It scales outdoor PM2.5 by an
              infiltration factor built from your window and filtration choices. Real indoor air
              depends on building age, gaps, cooking, and occupancy. A low cost indoor sensor is
              the only way to measure it.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/dashboard/swaps" className={buttonClass("darkOutline")}>
                Sustainable swaps
              </Link>
              <Link href="/dashboard/assistant" className={buttonClass("dark")}>
                Ask about tonight <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
