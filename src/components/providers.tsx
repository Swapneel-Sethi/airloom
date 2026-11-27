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
import { DEFAULT_PROFILE, freshOnboardingProfile, judgeProfile } from "@/lib/profile";
import {
  DEMO_PROFILE_ID,
  DEMO_PROFILE_NAME,
  activeIdAfterDelete,
  createStoredProfile,
  deleteStoredProfile,
  readDemoProfile,
  readProfileStore,
  saveActiveId,
  saveDemoProfile,
  saveProfiles,
  updateStoredProfile,
  type StoredProfile,
} from "@/lib/profiles";
import type { Environment, UserProfile } from "@/lib/types";

interface ProfileContextValue {
  profile: UserProfile;
  hydrated: boolean;
  profiles: StoredProfile[];
  activeId: string | null;
  activeName: string | null;
  isDemo: boolean;
  updateProfile: (patch: Partial<UserProfile>) => void;
  createProfile: () => StoredProfile;
  switchProfile: (id: string) => void;
  logout: () => void;
  deleteProfile: (id: string) => void;
  startJudgeScenario: () => void;
  resetProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [demoProfile, setDemoProfile] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storage = window.localStorage;
    const store = readProfileStore(storage);
    queueMicrotask(() => {
      setProfiles(store.profiles);
      setActiveId(store.activeId);
      setDemoProfile(readDemoProfile(storage));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      saveProfiles(window.localStorage, profiles);
    } catch {
      // Storage can be blocked in private modes. The app still works for this session.
    }
  }, [profiles, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      saveActiveId(window.localStorage, activeId);
    } catch {
      // Ignore storage errors.
    }
  }, [activeId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      saveDemoProfile(window.localStorage, demoProfile);
    } catch {
      // Ignore storage errors.
    }
  }, [demoProfile, hydrated]);

  const activeRecord = profiles.find((record) => record.id === activeId) ?? null;
  const isDemo = activeId === DEMO_PROFILE_ID;

  const profile = isDemo
    ? (demoProfile ?? judgeProfile())
    : (activeRecord?.profile ?? DEFAULT_PROFILE);

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      const timestamp = new Date().toISOString();
      if (activeId === DEMO_PROFILE_ID) {
        setDemoProfile((current) => ({ ...(current ?? judgeProfile()), ...patch }));
        return;
      }
      if (!activeId) return;
      setProfiles((current) =>
        current.map((record) =>
          record.id === activeId
            ? { ...record, profile: { ...record.profile, ...patch }, updatedAt: timestamp }
            : record,
        ),
      );
    },
    [activeId],
  );

  const createProfile = useCallback((): StoredProfile => {
    const record = createStoredProfile(profiles, freshOnboardingProfile());
    setProfiles([...profiles, record]);
    setActiveId(record.id);
    return record;
  }, [profiles]);

  const switchProfile = useCallback(
    (id: string) => {
      if (profiles.some((record) => record.id === id)) setActiveId(id);
    },
    [profiles],
  );

  const logout = useCallback(() => setActiveId(null), []);

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles(deleteStoredProfile(profiles, id));
      setActiveId((current) => activeIdAfterDelete(profiles, current, id));
    },
    [profiles],
  );

  const startJudgeScenario = useCallback(() => {
    setDemoProfile(judgeProfile());
    setActiveId(DEMO_PROFILE_ID);
  }, []);

  const resetProfile = useCallback(() => {
    if (activeId === DEMO_PROFILE_ID) {
      setDemoProfile(DEFAULT_PROFILE);
      return;
    }
    if (!activeId) return;
    setProfiles((current) => updateStoredProfile(current, activeId, DEFAULT_PROFILE));
  }, [activeId]);

  const value = useMemo(
    () => ({
      profile,
      hydrated,
      profiles,
      activeId,
      activeName: isDemo ? DEMO_PROFILE_NAME : (activeRecord?.name ?? null),
      isDemo,
      updateProfile,
      createProfile,
      switchProfile,
      logout,
      deleteProfile,
      startJudgeScenario,
      resetProfile,
    }),
    [
      profile,
      hydrated,
      profiles,
      activeId,
      isDemo,
      activeRecord?.name,
      updateProfile,
      createProfile,
      switchProfile,
      logout,
      deleteProfile,
      startJudgeScenario,
      resetProfile,
    ],
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
  const { activeId } = useProfile();
  return (
    <EnvironmentScope key={activeId ?? "logged-out"}>{children}</EnvironmentScope>
  );
}

function EnvironmentScope({ children }: { children: ReactNode }) {
  const { profile, hydrated, activeId } = useProfile();
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [status, setStatus] = useState<EnvironmentStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const location = profile.location;
  const dataMode = profile.dataMode;
  const demoCity = profile.demoCity;

  useEffect(() => {
    if (!hydrated || !activeId) return;
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

    queueMicrotask(() => {
      setError(null);
      setIsRefreshing(true);
    });

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
  }, [hydrated, activeId, dataMode, demoCity, location, reloadToken]);

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
