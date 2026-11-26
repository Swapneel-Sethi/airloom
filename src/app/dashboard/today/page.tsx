"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { ACTIVITY_OPTIONS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { locationLabel } from "@/lib/profile";
import { useEnvironment, useProfile } from "@/components/providers";
import { useDerived } from "@/components/dashboard/use-derived";
import { Field, inputClass } from "@/components/dashboard/controls";
import { NumericField } from "@/components/dashboard/numeric-field";
import {
  PageHeader,
  PlanList,
  Provenance,
  WindowSummary,
} from "@/components/dashboard/blocks";
import { buttonClass, EmptyState, SectionLabel } from "@/components/ui";
import Link from "next/link";

export default function TodayPage() {
  const { profile, updateProfile } = useProfile();
  const { environment, status } = useEnvironment();
  const derived = useDerived();

  if (status === "loading" || !environment || !derived) {
    return (
      <div className="space-y-4">
        <PageHeader label="Today" title="Daily plan" />
        <EmptyState
          title="Building your plan"
          body="Airloom is reading the hourly forecast and your household profile."
        />
      </div>
    );
  }

  if (!derived.plan.available) {
    return (
      <div className="space-y-6">
        <PageHeader label="Today" title={locationLabel(environment.location)} />
        <EmptyState
          title="No plan without a reading"
          body="The provider did not return PM2.5 for this location, so Airloom cannot compare exposure windows honestly. Retry from the overview or open a demo scenario."
          action={
            <Link href="/dashboard" className={buttonClass("dark")}>
              Back to overview
            </Link>
          }
        />
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
      <PageHeader label="Today" title={locationLabel(environment.location)}>
        <Provenance environment={environment} />
      </PageHeader>

      <section className="border-t border-line-dark pt-8">
        <SectionLabel tone="dark">Plan summary</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-2xl leading-tight tracking-[-0.02em] sm:text-[30px]">
          {plan.headline}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-dark">{plan.summary}</p>
        <div className="mt-6">
          <WindowSummary plan={plan} />
        </div>
        {delta !== null ? (
          <div className="mt-6 max-w-xl">
            <div className="flex items-center justify-between text-[11px] text-muted-dark">
              <span>Exposure proxy with this plan</span>
              <span className="tnum">
                {formatNumber(plan.outdoorExposureProxy ?? 0, 0)} vs{" "}
                {formatNumber(plan.baselineExposureProxy ?? 0, 0)} µg/m³·h
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-ink-light"
                style={{
                  width: `${Math.max(6, Math.min(100, Math.round(((plan.outdoorExposureProxy ?? 0) / Math.max(1, plan.baselineExposureProxy ?? 1)) * 100)))}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-dark">
              {delta <= 0
                ? `${Math.abs(delta)}% lower than your current routine, calculated from PM2.5 × hours and your commute mode factors.`
                : `${delta}% higher than your current routine. The current routine is already close to the low window.`}
            </p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="builder-heading" className="rounded-3xl border border-line-dark bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="builder-heading" className="text-lg">
            Routine builder
          </h2>
          <p className="text-[11px] text-muted-dark">Changes save to this browser and rebuild the plan</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Commute departure" htmlFor="commute-time">
            <input
              id="commute-time"
              type="time"
              value={profile.commuteTime}
              onChange={(event) => updateProfile({ commuteTime: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Commute distance" htmlFor="commute-distance" hint="One way, in kilometres">
            <NumericField
              htmlFor="commute-distance"
              value={profile.commuteDistanceKm}
              min={0.5}
              max={80}
              step={0.5}
              onChange={(next) =>
                updateProfile({ commuteDistanceKm: next })
              }
            />
          </Field>
          <Field label="Outdoor activity" htmlFor="activity">
            <select
              id="activity"
              value={profile.activity}
              onChange={(event) =>
                updateProfile({ activity: event.target.value as typeof profile.activity })
              }
              className={inputClass}
            >
              {ACTIVITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Activity time" htmlFor="activity-time">
            <input
              id="activity-time"
              type="time"
              value={profile.activityTime}
              onChange={(event) => updateProfile({ activityTime: event.target.value })}
              className={inputClass}
              disabled={profile.activity === "none"}
            />
          </Field>
        </div>
      </section>

      <section aria-labelledby="blocks-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="blocks-heading" className="text-lg">
            Block by block
          </h2>
          <p className="text-[11px] text-muted-dark">
            {plan.sensitivity === "sensitive" ? "Sensitive thresholds" : "Standard thresholds"}
          </p>
        </div>
        <div className="mt-6">
          <PlanList plan={plan} />
        </div>
      </section>

      <section className="border-t border-line-dark pt-8">
        <SectionLabel tone="dark">What this plan cannot know</SectionLabel>
        <ul className="mt-3 max-w-3xl space-y-2 text-[12px] leading-relaxed text-muted-dark">
          <li>
            The reading is a city grid model, not the air at your door. Street level differences
            inside a city can be large.
          </li>
          <li>
            The exposure proxy is concentration × time. It is a planning tool, not inhaled dose and
            not a health risk estimate.
          </li>
          <li>
            Forecast values beyond 24 hours carry more uncertainty. Each block shows a confidence
            label for that reason.
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/dashboard/exposure" className={buttonClass("darkOutline")}>
            <ArrowLeft size={15} aria-hidden="true" /> Exposure detail
          </Link>
          <Link href="/dashboard/assistant" className={buttonClass("dark")}>
            Ask about this plan <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
