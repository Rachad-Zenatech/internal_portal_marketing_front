import { countryName } from "@/lib/countries";
import type { EventOverviewItem, EventTiming, StaffRole, TravelReadiness } from "@/types/eventManagement";

export const TIMING_LABELS: Record<EventTiming, string> = {
  NOW: "On now",
  UPCOMING: "Upcoming",
  PAST: "Past",
  UNSCHEDULED: "Not scheduled",
};

/** The date tile on each card, coloured by when the event is */
export const TIMING_TILE: Record<EventTiming, string> = {
  NOW: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
  UPCOMING: "bg-violet-600 text-white dark:bg-violet-500 dark:text-violet-950",
  PAST: "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-200",
  UNSCHEDULED: "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400",
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

export const READINESS: Record<TravelReadiness, { label: string; tone: string }> = {
  READY: { label: "Ready for travel booking", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300" },
  MISSING_DETAILS: { label: "Needs travel details", tone: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300" },
  NOT_TRAVELLING: { label: "Not travelling", tone: "border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  REQUESTED: { label: "With the travel team", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300" },
  BOOKED: { label: "Travel booked", tone: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300" },
  CANCELLED: { label: "Travel cancelled", tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300" },
};

export function dateTile(start: string | null) {
  if (!start) return { month: "TBC", day: "—" };
  const d = new Date(`${start}T00:00:00`);
  return { month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(), day: String(d.getDate()) };
}

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

/** The one thing most worth doing next for an event, and the tab where it's done */
export function nextStep(e: EventOverviewItem): { text: string; tab: WorkspaceTab } {
  const upcoming = e.timing === "UPCOMING" || e.timing === "UNSCHEDULED";
  if (upcoming && e.staff_count === 0) return { text: "Add the team going", tab: "team" };
  if (e.staff_missing_details > 0) {
    return { text: `Add travel details for ${e.staff_missing_details} ${e.staff_missing_details === 1 ? "person" : "people"}`, tab: "team" };
  }
  if (upcoming && e.cost_lines === 0) return { text: "Add the booth and supplier costs", tab: "costs" };
  if (upcoming) return { text: "Keep costs up to date as quotes and invoices arrive", tab: "costs" };
  if (e.timing === "NOW") return { text: "Log demos and leads as they happen", tab: "demos" };
  if (!e.has_results) return { text: "Record leads and results", tab: "results" };
  return { text: "Check invoices and update results as deals close", tab: "results" };
}
