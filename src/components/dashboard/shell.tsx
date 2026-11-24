"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  House,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
} from "lucide-react";
import { NAV_ITEMS, SITE } from "@/lib/constants";
import { cn } from "@/lib/format";
import { Wordmark } from "@/components/logo";
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
  const { profile } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-night text-ink-light">
      <header className="sticky top-0 z-40 border-b border-line-dark bg-night/92 backdrop-blur">
        <div className="shell flex h-16 items-center justify-between gap-4">
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg px-2.5 text-[13px] text-ink-light hover:bg-white/5"
              aria-label={`Change location. Current location ${profile.location?.name ?? "not set"}`}
            >
              <MapPin size={15} className="text-muted-dark" aria-hidden="true" />
              <span className="max-w-[120px] truncate sm:max-w-[180px]">
                {profile.location?.name ?? "Choose city"}
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

      <main className="shell pb-24 pt-6 lg:pb-16 lg:pt-9">{children}</main>

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
