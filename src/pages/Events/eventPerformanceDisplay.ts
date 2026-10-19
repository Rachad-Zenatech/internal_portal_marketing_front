// Periods, labels and formulas for the Events Overview (event performance) page
import type { CostGroup, EventPerformanceTiming, EventResult } from "@/types/eventPerformance";
import { isoDate, type DateRange } from "../PaidAds/adsPeriods";

// ─── Periods ─────────────────────────────────────────────────────────────────

export type EventPeriodKey = "this_quarter" | "last_quarter" | "this_year" | "12m" | "all";

export const EVENT_PERIOD_OPTIONS: { value: EventPeriodKey; label: string }[] = [
  { value: "this_quarter", label: "This quarter" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "this_year", label: "This year" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export const DEFAULT_EVENT_PERIOD: EventPeriodKey = "this_year";

export function parseEventPeriod(value: string | null): EventPeriodKey {
  return EVENT_PERIOD_OPTIONS.some((o) => o.value === value) ? (value as EventPeriodKey) : DEFAULT_EVENT_PERIOD;
}

const range = (a: Date, b: Date): DateRange => ({ from: isoDate(a), to: isoDate(b) });
/** First and last day of the quarter that starts in month m (0-based, may be negative) */
const quarter = (y: number, m: number) => range(new Date(y, m, 1), new Date(y, m + 3, 0));

/**
 * The dates for a period and the equal period right before it (none for All time).
 * Quarters and the year are whole, so events later in them (already planned) are counted too.
 */
export function eventPeriodRanges(period: EventPeriodKey, now = new Date()): { current: DateRange | null; previous: DateRange | null; changeLabel: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear();
  const q = Math.floor(today.getMonth() / 3) * 3;
  switch (period) {
    case "this_quarter":
      return { current: quarter(y, q), previous: quarter(y, q - 3), changeLabel: "vs. previous quarter" };
    case "last_quarter":
      return { current: quarter(y, q - 3), previous: quarter(y, q - 6), changeLabel: "vs. previous quarter" };
    case "this_year":
      return { current: range(new Date(y, 0, 1), new Date(y, 11, 31)), previous: range(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31)), changeLabel: "vs. last year" };
    case "12m": {
      const start = new Date(y - 1, today.getMonth(), today.getDate() + 1);
      return {
        current: range(start, today),
        previous: range(new Date(y - 2, today.getMonth(), today.getDate() + 1), new Date(y - 1, today.getMonth(), today.getDate())),
        changeLabel: "vs. previous 12 months",
      };
    }
    default:
      return { current: null, previous: null, changeLabel: "" };
  }
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const TIMINGS: EventPerformanceTiming[] = ["NOW", "UPCOMING", "PAST"];

export const TIMING_FILTER_LABELS: Record<EventPerformanceTiming, string> = {
  NOW: "On now",
  UPCOMING: "Upcoming",
  PAST: "Past",
};

export const COST_GROUPS: CostGroup[] = ["TRAVEL", "BOOTH", "MATERIALS", "STAFF_OTHER"];

export const COST_GROUP_LABELS: Record<CostGroup, string> = {
  TRAVEL: "Travel",
  BOOTH: "Booth",
  MATERIALS: "Materials",
  STAFF_OTHER: "Staff & other",
};

/** Fixed colours per group, so a group keeps its colour when another is empty */
export const COST_GROUP_COLORS: Record<CostGroup, string> = {
  TRAVEL: "var(--series-1)",
  BOOTH: "var(--series-2)",
  MATERIALS: "var(--series-3)",
  STAFF_OTHER: "var(--series-4)",
};

export const RESULT_LABELS: Record<EventResult, string> = {
  SUCCESSFUL: "Successful",
  NOT_SUCCESSFUL: "Not successful",
  TOO_EARLY: "Too early",
  AWAITING_REVENUE: "Awaiting revenue",
  UPCOMING: "Upcoming",
};

export const RESULT_PILL: Record<EventResult, string> = {
  SUCCESSFUL: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  NOT_SUCCESSFUL: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  TOO_EARLY: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  AWAITING_REVENUE: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  UPCOMING: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
};

// ─── Formulas, for the info tooltips ─────────────────────────────────────────

export const EVENT_METRIC_INFO = {
  cost: "Total event cost = Travel + Booth + Materials + Staff & other. Every cost line, including estimates, in the event's currency.",
  visitors: "Visitors: people who came to the booth.",
  leads: "Leads: contacts captured at the event.",
  demos: "Demos given at or after the event (from the demo log when the event has one).",
  followUps: "Follow-ups: leads with a follow-up meeting or call.",
  customers: "Customers: new customers won from the event.",
  costPerVisitor: "Cost per visitor = total event cost ÷ visitors.",
  cpl: "CPL (cost per lead) = total event cost ÷ leads.",
  costPerDemo: "Cost per demo = total event cost ÷ demos given.",
  costPerFollowUp: "Cost per follow-up = total event cost ÷ follow-ups.",
  cac: "CAC (customer acquisition cost) = total event cost ÷ new customers.",
  revenue: "Revenue won from the events, from HubSpot results.",
  roi: "ROI = (revenue - total event cost) ÷ total event cost × 100. Above 0% means the event made a profit.",
  successful: "Successful means the event made a profit (ROI above 0%). Breaking even or losing money is not successful.",
  pipeline: "Pipeline: the value of open deals from the events, from HubSpot results.",
};

/** "ROI 12%", "-100%" */
export function fmtRoi(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: Math.abs(value) >= 10 ? 0 : 1 })}%`;
}

/** Conversion from one funnel step to the next, e.g. "10%" */
export function conversion(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || !previous) return null;
  return (current / previous) * 100;
}
