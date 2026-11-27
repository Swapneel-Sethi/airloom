"use client";

import { useState } from "react";
import { clamp } from "@/lib/format";
import { inputClass } from "@/components/dashboard/controls";

interface NumericFieldProps {
  label?: string;
  htmlFor: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * A numeric input that avoids the "clamp on every keystroke" bug where typing
 * "12" could be mangled into "0.512". It keeps a local string buffer, allows
 * temporary blank/invalid editing, and only commits a clamped number to profile
 * state on blur or submit. Invalid values never reach profile state.
 */
export function NumericField({
  label,
  htmlFor,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  className,
}: NumericFieldProps) {
  const [text, setText] = useState(String(value));
  const [dirty, setDirty] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setText(event.target.value);
    setDirty(true);
  }

  function commit(next: string) {
    const trimmed = next.trim();
    if (trimmed === "") {
      // Blank means "no valid value"; do not write invalid state.
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;
    const clamped = clamp(parsed, min, max);
    if (clamped !== value) onChange(clamped);
  }

  function handleBlur() {
    if (!dirty) return;
    commit(text);
    setText(String(value));
    setDirty(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(text);
      setText(String(value));
      setDirty(false);
    }
  }

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-[11px] uppercase tracking-[0.12em] text-muted-dark"
        >
          {label}
        </label>
      ) : null}
      <div className="mt-2 relative">
        <input
          id={htmlFor}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={String(min)}
          max={String(max)}
          step={String(step)}
          className={inputClass}
          placeholder={dirty ? undefined : String(value)}
        />
        {dirty ? (
          <button
            type="button"
            onClick={() => {
              setText(String(value));
              setDirty(false);
            }}
            className="absolute right-2 top-2 text-[10px] text-muted-dark hover:text-ink-light"
            aria-label="Reset"
          >
            Reset
          </button>
        ) : null}
      </div>
      {hint ? <p className="mt-1.5 text-[11px] text-muted-dark">{hint}</p> : null}
    </div>
  );
}
