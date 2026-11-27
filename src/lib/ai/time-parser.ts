import type { CopilotContext } from "./context";

export interface ExplicitTime {
  hour: number;
  minute: number;
  label: string;
}

/**
 * Parse explicit clock times from user questions.
 * Supports formats: "6 pm", "6:00 pm", "18:00", "5 pm", "7:30 pm", "at 6", "around 6 pm", etc.
 */
export function parseExplicitTime(question: string): ExplicitTime | null {
  const normalized = question.toLowerCase();

  // Pattern: "at 6", "around 6", "at 6 pm", "around 6 pm", "6 pm", "6:00 pm", "18:00", "18", "7:30 pm"
  const patterns = [
    // "at 6 pm", "around 6 pm", "at 6:00 pm", "6 pm", "6:00 pm"
    /\b(?:at|around)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/,
    // "6 pm", "6:00 pm", "7:30 pm"
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/,
    // "18:00", "18", "at 18:00", "at 18"
    /\b(?:at|around)\s+(\d{1,2})(?::(\d{2}))?\b/,
    // "18:00" standalone
    /\b(\d{1,2}):(\d{2})\b/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3] as "am" | "pm" | undefined;

      if (meridiem === "pm" && hour !== 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;

      // Handle 24-hour format without meridiem
      if (!meridiem && hour >= 0 && hour <= 23) {
        // Already in 24-hour format
      }

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        return { hour, minute, label };
      }
    }
  }

  return null;
}

/**
 * Find the hourly forecast point covering the requested time.
 * Currently unused - context provides time windows directly.
 */
export function findHourlyPointForTime(
  _hourly: CopilotContext["plan"] | undefined,
  _requestedHour: number,
  _requestedMinute: number
): { label: string; pm25: number; aqi: number } | null {
  // This would need access to the hourly data from context
  // For now, return null - the context should provide time windows
  return null;
}

/**
 * Evaluate a user-requested outdoor time against verified forecast data.
 */
export function evaluateRequestedOutdoorTime(
  requestedHour: number,
  requestedMinute: number,
  context: CopilotContext
): {
  requestedTimeLabel: string;
  requestedPm25: number | null;
  requestedAqi: number | null;
  isWithinBestWindow: boolean;
  isWithinEveningWindow: boolean;
  bestWindow: { label: string; pm25: number; aqi: number } | null;
  eveningWindow: { label: string; pm25: number; aqi: number } | null;
} {
  const requestedTimeLabel = `${String(requestedHour).padStart(2, "0")}:${String(requestedMinute).padStart(2, "0")}`;

  // Check if requested time falls within best window
  let isWithinBestWindow = false;
  let requestedPm25: number | null = null;
  let requestedAqi: number | null = null;

  if (context.bestWindow) {
    const [startStr, endStr] = context.bestWindow.label.split(" to ");
    const startHour = parseInt(startStr.split(":")[0], 10);
    const endHour = parseInt(endStr.split(":")[0], 10);
    isWithinBestWindow = requestedHour >= startHour && requestedHour < endHour;
  }

  // Check evening window
  let isWithinEveningWindow = false;
  if (context.eveningWindow) {
    const [startStr, endStr] = context.eveningWindow.label.split(" to ");
    const startHour = parseInt(startStr.split(":")[0], 10);
    const endHour = parseInt(endStr.split(":")[0], 10);
    isWithinEveningWindow = requestedHour >= startHour && requestedHour < endHour;
    requestedPm25 = context.eveningWindow.pm25;
    requestedAqi = context.eveningWindow.aqi;
  }

  // Also check morning/afternoon/tonight windows for the specific hour
  const windows = [
    { name: "morning", window: context.morningWindow },
    { name: "afternoon", window: context.afternoonWindow },
    { name: "evening", window: context.eveningWindow },
    { name: "tonight", window: context.tonightWindow },
  ];

  for (const { window } of windows) {
    if (window) {
      const [startStr, endStr] = window.label.split(" to ");
      const startHour = parseInt(startStr.split(":")[0], 10);
      const endHour = parseInt(endStr.split(":")[0], 10);
      if (requestedHour >= startHour && requestedHour < endHour) {
        requestedPm25 = window.pm25;
        requestedAqi = window.aqi;
        break;
      }
    }
  }

  return {
    requestedTimeLabel,
    requestedPm25,
    requestedAqi,
    isWithinBestWindow,
    isWithinEveningWindow,
    bestWindow: context.bestWindow,
    eveningWindow: context.eveningWindow,
  };
}