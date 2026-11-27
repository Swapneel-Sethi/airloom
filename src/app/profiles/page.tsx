"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Trash2, UserRound } from "lucide-react";
import { locationLabel } from "@/lib/profile";
import { useProfile } from "@/components/providers";
import { Wordmark } from "@/components/logo";
import { buttonClass, SectionLabel } from "@/components/ui";
import type { StoredProfile } from "@/lib/profiles";

export default function ProfilesPage() {
  const router = useRouter();
  const {
    profiles,
    activeId,
    hydrated,
    createProfile,
    switchProfile,
    deleteProfile,
    startJudgeScenario,
  } = useProfile();
  const [deleteTarget, setDeleteTarget] = useState<StoredProfile | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!deleteTarget) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDeleteTarget(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget]);

  if (!hydrated) {
    return <div className="min-h-dvh bg-night" />;
  }

  function openProfile(id: string) {
    switchProfile(id);
    router.push("/dashboard");
  }

  function createUser() {
    createProfile();
    router.push("/onboarding");
  }

  function openDemo() {
    startJudgeScenario();
    router.push("/dashboard");
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteProfile(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="min-h-dvh bg-night text-ink-light">
      <header className="shell flex h-16 items-center justify-between">
        <Wordmark tone="dark" />
        {activeId ? (
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-[11px] text-muted-dark hover:text-ink-light"
          >
            Back to dashboard
          </button>
        ) : null}
      </header>

      <main id="main-content" className="shell max-w-3xl pb-20 pt-10">
        <SectionLabel tone="dark">Local profiles</SectionLabel>
        <h1 className="mt-3 text-2xl tracking-[-0.02em] sm:text-3xl">Who is using Airloom?</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-dark">
          Every profile keeps its own location, household, travel, and indoor settings. Profiles
          are stored only in this browser and are never sent to a server.
        </p>

        {profiles.length === 0 ? (
          <div className="mt-8 rounded-xl border border-line-dark bg-surface p-6">
            <p className="text-sm text-ink-light">No profiles on this browser yet.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-dark">
              Create a profile to set up a location and a personal daily plan.
            </p>
            <button type="button" onClick={createUser} className={`${buttonClass("dark")} mt-5`}>
              Create new user <Plus size={15} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {profiles.map((record) => {
              const current = record.id === activeId;
              return (
                <li key={record.id} className="relative">
                  <button
                    type="button"
                    onClick={() => openProfile(record.id)}
                    aria-label={`Use profile ${record.name}`}
                    className="flex min-h-20 w-full flex-col items-start gap-1 rounded-xl border border-line-dark bg-surface p-4 pr-14 text-left transition-colors hover:border-white/25 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2 text-sm text-ink-light">
                      <UserRound size={15} className="text-muted-dark" aria-hidden="true" />
                      {record.name}
                      {current ? (
                        <span className="rounded-full border border-green/40 bg-green/10 px-2 py-0.5 text-[10px] text-green">
                          Current profile
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-dark">
                      <MapPin size={12} aria-hidden="true" />
                      {locationLabel(record.profile.location)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(record)}
                    aria-label={`Delete ${record.name}`}
                    className="absolute right-2 top-2 inline-flex size-10 items-center justify-center rounded-lg text-muted-dark hover:bg-white/5 hover:text-red"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {profiles.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={createUser} className={buttonClass("darkOutline")}>
              <Plus size={15} aria-hidden="true" />
              New user
            </button>
            <button type="button" onClick={openDemo} className="text-[11px] text-muted-dark hover:text-ink-light">
              Open the Delhi demo instead
            </button>
          </div>
        ) : (
          <button type="button" onClick={openDemo} className="mt-4 text-[11px] text-muted-dark hover:text-ink-light">
            Open the Delhi demo instead
          </button>
        )}
      </main>

      {deleteTarget ? (
        <DeleteConfirmDialog
          profile={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

interface DeleteConfirmDialogProps {
  profile: { id: string; name: string };
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmDialog({ profile, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const timer = window.setTimeout(() => cancelButtonRef.current?.focus(), 40);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

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
      previouslyFocusedRef.current?.focus();
    };
  }, [onCancel]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-line-dark bg-surface p-5">
        <h2 id="delete-profile-title" className="text-lg text-ink-light">
          Delete {profile.name}?
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-dark">
          This removes this profile and its saved Airloom settings from this browser.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className={buttonClass("darkOutline")}
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={buttonClass("dark")}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
