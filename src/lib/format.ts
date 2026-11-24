export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  return `${String(normalized).padStart(2, "0")}:00`;
}

export function formatHourRange(startHour: number, endHour: number): string {
  return `${formatHour(startHour)} to ${formatHour(endHour)}`;
}

export function formatClock(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours)) return time;
  return `${String(hours).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}`;
}

export function formatRelativeMinutes(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function formatHourLabel(isoLocal: string): string {
  const hour = isoLocal.slice(11, 13);
  return `${hour}:00`;
}

export function formatDayLabel(isoLocal: string, todayIso: string): string {
  const date = isoLocal.slice(0, 10);
  const today = todayIso.slice(0, 10);
  if (date === today) return "Today";
  return "Tomorrow";
}

export function localHourNow(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    });
    return Number(formatter.format(new Date()));
  } catch {
    return new Date().getHours();
  }
}

export function localDateNow(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percent(value: number, digits = 0): string {
  return `${value >= 0 ? "" : ""}${formatNumber(value, digits)}%`;
}
