"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  ACTIVITY_OPTIONS,
  COOKING_OPTIONS,
  DEMO_CITIES,
  HOUSEHOLD_OPTIONS,
  SITE,
  TRANSPORT_OPTIONS,
  VENTILATION_OPTIONS,
  WORKSPACE_OPTIONS,
} from "@/lib/constants";
import { locationLabel } from "@/lib/profile";
import { useProfile } from "@/components/providers";
import { LocationDialog } from "@/components/dashboard/location-dialog";
import { Field, inputClass, Segmented, ToggleChip } from "@/components/dashboard/controls";
import { PageHeader } from "@/components/dashboard/blocks";
import { buttonClass, SectionLabel } from "@/components/ui";

export default function SettingsPage() {
  const { profile, updateProfile, resetProfile } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  return (
    <div className="space-y-10">
      <PageHeader label="Settings" title="Your context" />

      <section className="border-t border-line-dark pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionLabel tone="dark">Location</SectionLabel>
            <p className="mt-2 flex items-center gap-2 text-lg">
              <MapPin size={16} className="text-muted-dark" aria-hidden="true" />
              {locationLabel(profile.location)}
            </p>
            <p className="mt-1 text-[11px] text-muted-dark">
              {profile.location
                ? `${profile.location.latitude.toFixed(3)}, ${profile.location.longitude.toFixed(3)}`
                : "No coordinates saved"}
            </p>
          </div>
          <button type="button" onClick={() => setDialogOpen(true)} className={buttonClass("darkOutline")}>
            Change location
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Data mode" hint="Demo scenarios are seeded and labelled everywhere they appear.">
            <Segmented
              label="Data mode"
              value={profile.dataMode}
              onChange={(value) => updateProfile({ dataMode: value })}
              options={[
                { value: "auto", label: "Live model" },
                { value: "demo", label: "Demo scenario" },
              ]}
            />
          </Field>
          {profile.dataMode === "demo" ? (
            <Field label="Demo city" htmlFor="demo-city">
              <select
                id="demo-city"
                value={profile.demoCity}
                onChange={(event) =>
                  updateProfile({
                    demoCity: event.target.value,
                    location: DEMO_CITIES[event.target.value].location,
                  })
                }
                className={inputClass}
              >
                {Object.entries(DEMO_CITIES).map(([key, city]) => (
                  <option key={key} value={key}>
                    {city.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      </section>

      <section className="border-t border-line-dark pt-8">
        <SectionLabel tone="dark">Household</SectionLabel>
        <p className="mt-2 text-[12px] text-muted-dark">
          Sensitive groups lower the exposure thresholds the planner uses.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {HOUSEHOLD_OPTIONS.map((option) => (
            <ToggleChip
              key={option.value}
              selected={profile.household.includes(option.value)}
              onClick={() =>
                updateProfile({ household: toggle(profile.household, option.value) })
              }
              hint={option.hint}
            >
              {option.label}
            </ToggleChip>
          ))}
        </div>
      </section>

      <section className="border-t border-line-dark pt-8">
        <SectionLabel tone="dark">Transport</SectionLabel>
        <p className="mt-2 text-[12px] text-muted-dark">
          Only the modes you can realistically use appear in the commute comparison.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {TRANSPORT_OPTIONS.map((option) => (
            <ToggleChip
              key={option.value}
              selected={profile.transport.includes(option.value)}
              onClick={() => updateProfile({ transport: toggle(profile.transport, option.value) })}
            >
              {option.label}
            </ToggleChip>
          ))}
        </div>
      </section>

      <section className="border-t border-line-dark pt-8">
        <SectionLabel tone="dark">Indoor environment</SectionLabel>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {VENTILATION_OPTIONS.map((option) => (
            <ToggleChip
              key={option.value}
              selected={profile.ventilation.includes(option.value)}
              onClick={() => updateProfile({ ventilation: toggle(profile.ventilation, option.value) })}
            >
              {option.label}
            </ToggleChip>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Cooking frequency" htmlFor="cooking">
            <select
              id="cooking"
              value={profile.cooking}
              onChange={(event) =>
                updateProfile({ cooking: event.target.value as typeof profile.cooking })
              }
              className={inputClass}
            >
              {COOKING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Workspace" htmlFor="workspace">
            <select
              id="workspace"
              value={profile.workspace}
              onChange={(event) =>
                updateProfile({ workspace: event.target.value as typeof profile.workspace })
              }
              className={inputClass}
            >
              {WORKSPACE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="border-t border-line-dark pt-8">
        <SectionLabel tone="dark">Routine</SectionLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Commute departure" htmlFor="settings-commute">
            <input
              id="settings-commute"
              type="time"
              value={profile.commuteTime}
              onChange={(event) => updateProfile({ commuteTime: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Commute distance" htmlFor="settings-distance" hint="One way, in kilometres">
            <input
              id="settings-distance"
              type="number"
              min={0.5}
              max={80}
              step={0.5}
              value={profile.commuteDistanceKm}
              onChange={(event) =>
                updateProfile({
                  commuteDistanceKm: Math.min(80, Math.max(0.5, Number(event.target.value) || 0.5)),
                })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Outdoor activity" htmlFor="settings-activity">
            <select
              id="settings-activity"
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
          <Field label="Activity time" htmlFor="settings-activity-time">
            <input
              id="settings-activity-time"
              type="time"
              value={profile.activityTime}
              onChange={(event) => updateProfile({ activityTime: event.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-line-dark pt-8">
        <SectionLabel tone="dark">Data and privacy</SectionLabel>
        <ul className="mt-3 max-w-2xl space-y-2 text-[12px] leading-relaxed text-muted-dark">
          <li>Your profile is stored in this browser only. No account, no server side profile store.</li>
          <li>Units are metric. Airloom reports µg/m³ and the US EPA index scale.</li>
          <li>Air quality and weather come from public Open-Meteo endpoints. No key is required.</li>
          <li>
            Assistant questions are sent to Gemini only when a server key is configured. Without a
            key the built in rule engine answers.
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/dashboard/assistant" className={buttonClass("darkOutline")}>
            Open assistant
          </Link>
          <button type="button" onClick={resetProfile} className={buttonClass("darkOutline")}>
            Reset to demo profile
          </button>
        </div>
        <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-muted-dark/80">
          {SITE.disclaimer}
        </p>
      </section>

      <LocationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
