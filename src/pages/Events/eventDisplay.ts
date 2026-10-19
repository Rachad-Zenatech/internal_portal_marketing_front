import { countryName } from "@/lib/countries";
import type { EventOverviewItem, EventTiming, StaffRole } from "@/types/eventManagement";

export const TIMING_LABELS: Record<EventTiming, string> = {
  NOW: "On now",
  UPCOMING: "Upcoming",
  PAST: "Past",
  UNSCHEDULED: "Not scheduled",
};

/** A small status dot for when the event is: the only colour on an event card that isn't a warning */
export const TIMING_DOT: Record<EventTiming, string> = {
  NOW: "bg-emerald-500",
  UPCOMING: "bg-blue-500",
  PAST: "bg-zinc-400",
  UNSCHEDULED: "bg-amber-500",
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  LEAD: "Event lead",
  BOOTH_STAFF: "Booth staff",
  DEMO: "Demos",
  SPEAKER: "Speaker",
  SETUP: "Setup / logistics",
  EXECUTIVE: "Executive",
  OTHER: "Other",
};
export const ROLES = Object.keys(ROLE_LABELS) as StaffRole[];

export function shortDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
}

export function dateRange(start: string | null, end: string | null) {
  if (!start) return "Dates to be confirmed";
  if (!end || end === start) return shortDate(start);
  return `${shortDate(start)} – ${shortDate(end)}`;
}

/** "Las Vegas, United States", "Online · Zoom", or nothing yet */
export function eventPlace(e: { city: string | null; country_code: string | null; platform: string | null; venue?: string | null }) {
  if (e.platform && !e.city) return `Online · ${e.platform}`;
  const parts = [e.city, countryName(e.country_code)].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** When, in words: "In 12 days", "On now", "Ended 3 days ago" */
export function whenText(e: Pick<EventOverviewItem, "timing" | "days_away">) {
  if (e.timing === "NOW") return "On now";
  if (e.timing === "UNSCHEDULED") return "Dates to be confirmed";
  const days = e.days_away ?? 0;
  if (e.timing === "UPCOMING") return days === 0 ? "Starts today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  return days === 0 ? "Ended today" : days === 1 ? "Ended yesterday" : `Ended ${days} days ago`;
}

export type WorkspaceTab = "team" | "costs" | "demos" | "results";

/** No colour of its own until 90% of the travel budget is used, amber from there, red once it's over */
export function travelBudgetTone(budget: number, used: number) {
  if (used > budget) return "text-red-700 dark:text-red-400";
  if (budget > 0 && used >= budget * 0.9) return "text-amber-700 dark:text-amber-400";
  return "";
}
