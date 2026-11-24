import type { ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "solid" | "outline" | "ghost" | "dark" | "darkOutline";

const VARIANTS: Record<Variant, string> = {
  solid:
    "bg-ink text-white hover:bg-[#1f1f1f] active:bg-black disabled:bg-ink/40",
  outline:
    "border border-line bg-transparent text-ink hover:border-ink/40 hover:bg-[#faf9f6]",
  ghost: "text-muted hover:text-ink",
  dark: "bg-ink-light text-night hover:bg-white",
  darkOutline:
    "border border-line-dark text-ink-light hover:border-white/35 hover:bg-white/5",
};

export function buttonClass(variant: Variant = "solid", className?: string): string {
  return cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    className,
  );
}

export function SectionLabel({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] uppercase tracking-[0.14em]",
        tone === "dark" ? "text-muted-dark" : "text-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function StatusDot({
  color,
  pulse = false,
  className,
}: {
  color: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full", pulse && "pulse-dot", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export function Badge({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "dark" | "warn" | "good";
}) {
  const styles: Record<string, string> = {
    light: "border-line text-muted",
    dark: "border-line-dark text-muted-dark",
    warn: "border-amber/40 text-amber",
    good: "border-green/40 text-green",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] tracking-[0.02em]",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Divider({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <hr
      className={cn(
        "border-0 border-t",
        tone === "dark" ? "border-line-dark" : "border-line",
      )}
    />
  );
}

export function Metric({
  label,
  value,
  unit,
  tone = "dark",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-[11px] uppercase tracking-[0.12em]",
          tone === "dark" ? "text-muted-dark" : "text-muted",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "tnum mt-1.5 text-xl",
          tone === "dark" ? "text-ink-light" : "text-ink",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-xs text-muted-dark">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  tone = "dark",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-6",
        tone === "dark"
          ? "border-line-dark bg-surface text-ink-light"
          : "border-line bg-[#faf9f6] text-ink",
      )}
    >
      <p className="text-base">{title}</p>
      <p
        className={cn(
          "mt-2 max-w-md text-sm leading-relaxed",
          tone === "dark" ? "text-muted-dark" : "text-muted",
        )}
      >
        {body}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
