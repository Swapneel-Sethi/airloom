"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PROFILE, judgeProfile, parseStoredProfile } from "@/lib/profile";
import type { Environment, UserProfile } from "@/lib/types";

const STORAGE_KEY = "airloom.profile.v1";

interface ProfileContextValue {
  profile: UserProfile;
  hydrated: boolean;
  updateProfile: (patch: Partial<UserProfile>) => void;
  replaceProfile: (next: UserProfile) => void;
  startJudgeScenario: () => void;
  resetProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = parseStoredProfile(window.localStorage.getItem(STORAGE_KEY));
    if (stored) setProfile(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Storage can be blocked in private modes. The app still works for this session.
    }
  }, [profile, hydrated]);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
  }, []);

  const replaceProfile = useCallback((next: UserProfile) => {
    setProfile(next);
  }, []);

  const startJudgeScenario = useCallback(() => {
    setProfile(judgeProfile());
  }, []);

  const resetProfile = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
    setProfile(DEFAULT_PROFILE);
  }, []);

  const value = useMemo(
    () => ({ profile, hydrated, updateProfile, replaceProfile, startJudgeScenario, resetProfile }),
    [profile, hydrated, updateProfile, replaceProfile, startJudgeScenario, resetProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used inside ProfileProvider");
  return context;
}

type EnvironmentStatus = "loading" | "ready" | "error";

interface EnvironmentContextValue {
  environment: Environment | null;
  status: EnvironmentStatus;
  error: string | null;
  refresh: () => void;
  isRefreshing: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const { profile, hydrated } = useProfile();
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [status, setStatus] = useState<EnvironmentStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const location = profile.location;
  const dataMode = profile.dataMode;
  const demoCity = profile.demoCity;

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (dataMode === "demo" || !location) {
      params.set("mode", "demo");
      params.set("city", demoCity);
    } else {
      params.set("lat", String(location.latitude));
      params.set("lon", String(location.longitude));
      params.set("name", location.name);
      if (location.admin1) params.set("admin1", location.admin1);
      if (location.country) params.set("country", location.country);
      params.set("tz", location.timezone);
    }

    setIsRefreshing(true);
    setError(null);

    fetch(`/api/environment?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(
            body?.error?.message ??
              "Air quality data is temporarily unavailable for this location.",
          );
        }
        return (await response.json()) as Environment;
      })
      .then((next) => {
        setEnvironment(next);
        setStatus("ready");
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setStatus((current) => (current === "ready" ? "ready" : "error"));
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Air quality data is temporarily unavailable.",
        );
      })
      .finally(() => setIsRefreshing(false));

    return () => controller.abort();
  }, [hydrated, dataMode, demoCity, location, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const value = useMemo(
    () => ({ environment, status, error, refresh, isRefreshing }),
    [environment, status, error, refresh, isRefreshing],
  );

  return (
    <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>
  );
}

export function useEnvironment(): EnvironmentContextValue {
  const context = useContext(EnvironmentContext);
  if (!context) throw new Error("useEnvironment must be used inside EnvironmentProvider");
  return context;
}
