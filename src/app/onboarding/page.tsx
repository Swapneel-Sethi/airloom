"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, LocateFixed, MapPin, Search } from "lucide-react";
import {
  ACTIVITY_OPTIONS,
  DEMO_CITIES,
  HOUSEHOLD_OPTIONS,
  TRANSPORT_OPTIONS,
  VENTILATION_OPTIONS,
} from "@/lib/constants";
import type { GeoLocation } from "@/lib/types";
import { useProfile } from "@/components/providers";
import { Field, inputClass, ToggleChip } from "@/components/dashboard/controls";
import { NumericField } from "@/components/dashboard/numeric-field";
import { Wordmark } from "@/components/logo";
import { buttonClass, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/format";

const STEPS = ["Location", "Household", "Indoor and routine"];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, updateProfile, hydrated, activeId, startJudgeScenario } = useProfile();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !activeId) router.replace("/profiles");
  }, [hydrated, activeId, router]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/locations?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: { results?: GeoLocation[] }) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 320);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function useMyLocation() {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("This browser does not expose location. Choose a city instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let name = "Current location";
        let admin1: string | undefined;
        let country = "";
        try {
          const response = await fetch(`/api/reverse?lat=${latitude}&lon=${longitude}`);
          const data = (await response.json()) as {
            name?: string;
            admin1?: string;
            country?: string;
          };
          name = data.name || name;
          admin1 = data.admin1;
          country = data.country ?? "";
        } catch {
          // Keep the generic label when reverse geocoding fails.
        }
        updateProfile({
          location: {
            name,
            admin1,
            country,
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          dataMode: "auto",
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setGeoError("Location permission was denied. Choose a city instead.");
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  function finish() {
    updateProfile({ onboarded: true });
    router.push("/dashboard");
  }

  const canContinue = step > 0 || profile.location !== null;

  if (!hydrated || !activeId) {
    return <div className="min-h-dvh bg-night" />;
  }

  return (
    <div className="min-h-dvh bg-night text-ink-light">
      <header className="shell flex h-16 items-center justify-between">
        <Wordmark tone="dark" />
        <button
          type="button"
          onClick={() => {
            startJudgeScenario();
            router.push("/dashboard");
          }}
          className="text-[11px] text-muted-dark hover:text-ink-light"
        >
          Open the Delhi demo instead
        </button>
      </header>

      <main className="shell max-w-2xl pb-20 pt-8">
        <div className="flex items-center gap-3">
          {STEPS.map((label, index) => (
            <div key={label} className="flex-1">
              <div
                className={cn(
                  "h-0.5 w-full rounded-full",
                  index <= step ? "bg-ink-light" : "bg-surface-2",
                )}
              />
              <p
                className={cn(
                  "mt-2 text-[10px] uppercase tracking-[0.1em]",
                  index <= step ? "text-ink-light" : "text-muted-dark",
                )}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <SectionLabel tone="dark">
            Step {step + 1} of {STEPS.length}
          </SectionLabel>

          {step === 0 ? (
            <div className="mt-3">
              <h1 className="text-2xl tracking-[-0.02em] sm:text-3xl">
                Where should Airloom read the air?
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-dark">
                Live readings use the Open-Meteo model for the city coordinate. Nothing is stored
                on a server.
              </p>

              <div className="mt-6 flex items-center gap-2 rounded-xl border border-line-dark bg-surface px-3">
                <Search size={16} className="text-muted-dark" aria-hidden="true" />
                <label htmlFor="onboarding-search" className="sr-only">
                  Search a city
                </label>
                <input
                  id="onboarding-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search a city"
                  className="h-12 w-full bg-transparent text-sm text-ink-light outline-none placeholder:text-muted-dark"
                  autoComplete="off"
                />
                {searching ? <LoaderCircle size={15} className="animate-spin text-muted-dark" /> : null}
              </div>

              {results.length > 0 ? (
                <ul className="mt-2 max-h-52 overflow-y-auto thin-scroll">
                  {results.map((result) => (
                    <li key={`${result.latitude}-${result.longitude}`}>
                      <button
                        type="button"
                        onClick={() => {
                          updateProfile({ location: result, dataMode: "auto" });
                          setQuery("");
                          setResults([]);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-3 text-left text-sm hover:bg-white/5"
                      >
                        <MapPin size={15} className="text-muted-dark" aria-hidden="true" />
                        {result.name}
                        {result.admin1 ? <span className="text-muted-dark">, {result.admin1}</span> : null}
                        <span className="ml-auto text-[11px] text-muted-dark">{result.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-line-dark px-4 text-sm text-ink-light hover:bg-white/5 disabled:opacity-60"
              >
                {locating ? <LoaderCircle size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                Use my location
              </button>
              {geoError ? (
                <p className="mt-2 text-xs text-amber" role="status">
                  {geoError}
                </p>
              ) : null}

              <div className="mt-6 border-t border-line-dark pt-5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">
                  Or start from a seeded scenario
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(DEMO_CITIES).map(([key, city]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        updateProfile({
                          location: city.location,
                          dataMode: "demo",
                          demoCity: key,
                        })
                      }
                      className={cn(
                        "min-h-11 rounded-lg border px-3 text-xs",
                        profile.dataMode === "demo" && profile.demoCity === key
                          ? "border-white/40 bg-white/5 text-ink-light"
                          : "border-line-dark text-muted-dark hover:text-ink-light",
                      )}
                    >
                      {city.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-5 text-xs text-muted-dark">
                Selected:{" "}
                <span className="text-ink-light">
                  {profile.location
                    ? `${profile.location.name}${profile.location.country ? `, ${profile.location.country}` : ""}`
                    : "none"}
                </span>
              </p>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="mt-3">
              <h1 className="text-2xl tracking-[-0.02em] sm:text-3xl">
                Who is this plan for?
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-dark">
                These choices set the exposure thresholds. Child, older adult, or respiratory
                needs tighten them by 25 percent.
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
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

              <div className="mt-8">
                <SectionLabel tone="dark">How do you usually travel?</SectionLabel>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {TRANSPORT_OPTIONS.map((option) => (
                    <ToggleChip
                      key={option.value}
                      selected={profile.transport.includes(option.value)}
                      onClick={() =>
                        updateProfile({ transport: toggle(profile.transport, option.value) })
                      }
                    >
                      {option.label}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-3">
              <h1 className="text-2xl tracking-[-0.02em] sm:text-3xl">
                What does your day look like?
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-dark">
                The plan compares this routine against the hourly forecast. You can edit it later.
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {VENTILATION_OPTIONS.map((option) => (
                  <ToggleChip
                    key={option.value}
                    selected={profile.ventilation.includes(option.value)}
                    onClick={() =>
                      updateProfile({ ventilation: toggle(profile.ventilation, option.value) })
                    }
                  >
                    {option.label}
                  </ToggleChip>
                ))}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Commute departure" htmlFor="onboard-commute">
                  <input
                    id="onboard-commute"
                    type="time"
                    value={profile.commuteTime}
                    onChange={(event) => updateProfile({ commuteTime: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Commute distance" htmlFor="onboard-distance" hint="One way, in kilometres">
                  <NumericField
                    htmlFor="onboard-distance"
                    value={profile.commuteDistanceKm}
                    min={0.5}
                    max={80}
                    step={0.5}
                    onChange={(next) =>
                      updateProfile({ commuteDistanceKm: next })
                    }
                  />
                </Field>
                <Field label="Outdoor activity" htmlFor="onboard-activity">
                  <select
                    id="onboard-activity"
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
                <Field label="Activity time" htmlFor="onboard-activity-time">
                  <input
                    id="onboard-activity-time"
                    type="time"
                    value={profile.activityTime}
                    onChange={(event) => updateProfile({ activityTime: event.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <p className="mt-6 max-w-lg text-[11px] leading-relaxed text-muted-dark">
                Airloom provides environmental guidance based on available data and is not a medical
                service. You can clear this profile from settings at any time.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-line-dark pt-6">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className={cn(buttonClass("darkOutline"), step === 0 && "invisible")}
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
              disabled={!canContinue}
              className={buttonClass("dark")}
            >
              Continue <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={finish} className={buttonClass("dark")}>
              Build my plan <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
