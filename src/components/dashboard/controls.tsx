"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/format";

export const inputClass =
  "h-11 w-full rounded-lg border border-line-dark bg-night px-3 text-sm text-ink-light outline-none transition-colors focus:border-white/40 [color-scheme:dark]";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] uppercase tracking-[0.12em] text-muted-dark"
      >
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1.5 text-[11px] text-muted-dark/80">{hint}</p> : null}
    </div>
  );
}

export function ToggleChip({
  selected,
  onClick,
  children,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-start gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
        selected
          ? "border-green/60 bg-green/10 text-ink-light"
          : "border-line-dark text-muted-dark hover:border-white/25 hover:text-ink-light",
      )}
    >
      <span className="min-w-0 flex-1">
        {children}
        {hint ? (
          <span
            className={cn(
              "mt-0.5 block text-[10px] leading-tight",
              selected ? "text-green/80" : "text-muted-dark/80",
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
      {selected ? (
        <Check
          size={15}
          strokeWidth={2.5}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-green"
        />
      ) : null}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border border-line-dark p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 rounded-md px-3 text-xs transition-colors",
            value === option.value
              ? "bg-white/10 text-ink-light"
              : "text-muted-dark hover:text-ink-light",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
