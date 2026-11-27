"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, LoaderCircle, LocateFixed, MapPin, Search, X } from "lucide-react";
import { DEMO_CITIES } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { GeoLocation } from "@/lib/types";
import { useProfile } from "@/components/providers";

export function LocationDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { profile, updateProfile } = useProfile();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Store the element that had focus before the dialog opened
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    // Focus trap
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onTab);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onTab);
      // Restore focus to the element that had it before the dialog opened
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      queueMicrotask(() => {
        setResults([]);
        setSearching(false);
      });
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => setSearching(true));
    const timer = window.setTimeout(() => {
      fetch(`/api/locations?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((data: { results?: GeoLocation[] }) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 320);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  if (!open) return null;

  function choose(location: GeoLocation) {
    updateProfile({ location, dataMode: "auto" });
    onClose();
  }

  function chooseDemo(key: string) {
    updateProfile({
      location: DEMO_CITIES[key].location,
      dataMode: "demo",
      demoCity: key,
    });
    onClose();
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
        onClose();
      },
      () => {
        setLocating(false);
        setGeoError("Location permission was denied. Choose a city instead.");
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Change location"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl border border-line-dark bg-[#101010] p-5 text-ink-light sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg">Choose a location</h2>
            <p className="mt-1 text-xs text-muted-dark">
              Live readings use the Open-Meteo model for the city coordinate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-lg text-muted-dark hover:bg-white/5 hover:text-ink-light"
            aria-label="Close location dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5">
          <label htmlFor="city-search" className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">
            Search a city
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-line-dark bg-surface px-3">
            <Search size={16} className="text-muted-dark" aria-hidden="true" />
            <input
              id="city-search"
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Delhi, Mumbai, Pune"
              className="h-11 w-full bg-transparent text-sm text-ink-light outline-none placeholder:text-muted-dark"
              autoComplete="off"
            />
            {searching ? <LoaderCircle size={16} className="animate-spin text-muted-dark" /> : null}
          </div>

          {results.length > 0 ? (
            <ul className="mt-2 max-h-56 overflow-y-auto thin-scroll">
              {results.map((result) => (
                <li key={`${result.latitude}-${result.longitude}`}>
                  <button
                    type="button"
                    onClick={() => choose(result)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2.5">
                      <MapPin size={15} className="text-muted-dark" aria-hidden="true" />
                      <span className="text-sm">
                        {result.name}
                        {result.admin1 ? (
                          <span className="text-muted-dark">, {result.admin1}</span>
                        ) : null}
                        <span className="ml-1 text-xs text-muted-dark">{result.country}</span>
                      </span>
                    </span>
                    <ChevronRight size={15} className="text-muted-dark" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line-dark text-sm text-ink-light hover:bg-white/5 disabled:opacity-60"
          >
            {locating ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <LocateFixed size={16} />
            )}
            Use my location
          </button>
          {geoError ? (
            <p className="mt-2 text-xs text-amber" role="status">
              {geoError}
            </p>
          ) : null}
        </div>

        <div className="mt-6 border-t border-line-dark pt-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">
            Judge scenario and demo cities
          </p>
          <p className="mt-1 text-xs text-muted-dark">
            Seeded data, clearly labelled. Useful for a quick walkthrough.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(DEMO_CITIES).map(([key, city]) => (
              <button
                key={key}
                type="button"
                onClick={() => chooseDemo(key)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-sm hover:border-white/35",
                  profile.dataMode === "demo" && profile.demoCity === key
                    ? "border-white/40 bg-white/5"
                    : "border-line-dark",
                )}
              >
                {city.label}
                <span className="mt-0.5 block text-[11px] leading-tight text-muted-dark">
                  {city.condition}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}