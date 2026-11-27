"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { NAV_ITEMS, SITE } from "@/lib/constants";
import { cn } from "@/lib/format";
import { Wordmark } from "@/components/logo";
import { effectiveLocationLabel } from "@/lib/profile";
import { useProfile } from "@/components/providers";
import { LocationDialog } from "@/components/dashboard/location-dialog";

const ICONS = {
  Overview: LayoutDashboard,
  Today: CalendarDays,
  Exposure: Activity,
  Indoor: House,
  Swaps: ArrowLeftRight,
  Assistant: MessageSquare,
  Settings,
} as const;

const MOBILE_ITEMS = NAV_ITEMS.filter((item) =>
  ["/dashboard/today", "/dashboard/exposure", "/dashboard/indoor", "/dashboard/swaps", "/dashboard/assistant"].includes(
    item.href,
  ),
);

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    profile,
    hydrated,
    activeId,
    activeName,
    profiles,
    createProfile,
    switchProfile,
    logout,
  } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hydrated && !activeId) router.replace("/profiles");
  }, [hydrated, activeId, router]);

  useEffect(() => {
    if (!menuOpen) return;
    firstItemRef.current?.focus();
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (!hydrated || !activeId) {
    return <div className="min-h-dvh bg-night" />;
  }

  const otherProfiles = profiles.filter((record) => record.id !== activeId);

  function openNewUser() {
    setMenuOpen(false);
    createProfile();
    router.push("/onboarding");
  }

  function openProfile(id: string) {
    setMenuOpen(false);
    switchProfile(id);
    router.push("/dashboard");
  }

  function logOut() {
    setMenuOpen(false);
    logout();
    router.push("/profiles");
  }

  return (
    <div className="min-h-dvh bg-night text-ink-light">
      <header className="sticky top-0 z-40 border-b border-line-dark bg-night/92 backdrop-blur">
        <div className="shell flex h-16 items-center justify-between gap-2">
          <div className="flex items-center gap-6">
            <Wordmark tone="dark" href="/dashboard" />
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.filter((item) => item.href !== "/dashboard/settings").map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-16 items-center border-b-2 px-2.5 text-[13px] transition-colors",
                      active
                        ? "border-ink-light text-ink-light"
                        : "border-transparent text-muted-dark hover:text-ink-light",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg px-2.5 text-[13px] text-ink-light hover:bg-white/5"
              aria-label={`Change location. Current location ${effectiveLocationLabel(profile)}`}
            >
              <MapPin size={15} className="text-muted-dark" aria-hidden="true" />
              <span className="hidden max-w-[180px] truncate sm:inline">
                {effectiveLocationLabel(profile) ?? "Choose city"}
              </span>
              {profile.dataMode === "demo" ? (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: "var(--sev-elevated)" }}
                />
              ) : null}
              <ChevronDown size={14} className="text-muted-dark" aria-hidden="true" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Profile menu. Current profile ${activeName ?? "none"}`}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] text-ink-light hover:bg-white/5"
              >
                <UserRound size={16} className="text-muted-dark" aria-hidden="true" />
                <span className="max-w-[68px] truncate sm:max-w-[120px]">
                  {activeName ?? "Profile"}
                </span>
                <ChevronDown size={14} className="text-muted-dark" aria-hidden="true" />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  aria-label="Profiles"
                  className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line-dark bg-surface text-ink-light shadow-2xl shadow-black/50"
                >
                  <div className="border-b border-line-dark px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-dark">
                      Current profile
                    </p>
                    <p className="mt-0.5 truncate text-sm">{activeName ?? "No active profile"}</p>
                  </div>

                  {otherProfiles.length > 0 ? (
                    <div className="border-b border-line-dark py-1.5">
                      <p className="px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-dark">
                        Switch profile
                      </p>
                      {otherProfiles.map((record, index) => (
                        <button
                          key={record.id}
                          ref={index === 0 ? firstItemRef : undefined}
                          type="button"
                          role="menuitem"
                          onClick={() => openProfile(record.id)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                        >
                          <UserRound size={14} className="text-muted-dark" aria-hidden="true" />
                          <span className="truncate">{record.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="py-1.5">
                    <button
                      ref={otherProfiles.length === 0 ? firstItemRef : undefined}
                      type="button"
                      role="menuitem"
                      onClick={openNewUser}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-green hover:bg-white/5"
                    >
                      <Plus size={14} aria-hidden="true" />
                      New user
                    </button>
                    <Link
                      href="/profiles"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-muted-dark hover:bg-white/5 hover:text-ink-light"
                    >
                      <Users size={14} aria-hidden="true" />
                      Manage profiles
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={logOut}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-muted-dark hover:bg-white/5 hover:text-ink-light"
                    >
                      <LogOut size={14} aria-hidden="true" />
                      Log out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              href="/dashboard/settings"
              aria-label="Settings"
              aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted-dark hover:bg-white/5 hover:text-ink-light"
            >
              <Settings size={17} />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="shell pb-24 pt-6 lg:pb-16 lg:pt-9">{children}</main>

      <footer className="shell hidden pb-8 lg:block">
        <p className="max-w-2xl border-t border-line-dark pt-5 text-[11px] leading-relaxed text-muted-dark">
          {SITE.disclaimer}
        </p>
      </footer>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line-dark bg-night/95 backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {MOBILE_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.label as keyof typeof ICONS];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] tracking-[0.02em]",
                  active ? "text-ink-light" : "text-muted-dark",
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <LocationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
