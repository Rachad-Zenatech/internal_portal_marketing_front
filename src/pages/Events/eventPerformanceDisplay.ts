// Periods, labels and rules for the Events Overview page
import { countryName } from "@/lib/countries";
import type { InitiativeStatus } from "@/types/initiatives";
import type { CostCategory, EventPerformance } from "@/types/eventPerformance";
import { EVENT_STATUS_LABELS } from "../Initiatives/status";
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

export const DEFAULT_EVENT_PERIOD: EventPeriodKey = "this_quarter";

export function parseEventPeriod(value: string | null): EventPeriodKey {
  return EVENT_PERIOD_OPTIONS.some((o) => o.value === value) ? (value as EventPeriodKey) : DEFAULT_EVENT_PERIOD;
}

const range = (a: Date, b: Date): DateRange => ({ from: isoDate(a), to: isoDate(b) });
/** First and last day of the quarter that starts in month m (0-based, may be negative) */
const quarter = (y: number, m: number) => range(new Date(y, m, 1), new Date(y, m + 3, 0));

/**
 * The dates for a period (none for All time). Quarters and the year are whole, so events later in them
 * (already planned) are counted too. The API works out the previous period itself.
 */
export function eventPeriodRange(period: EventPeriodKey, now = new Date()): DateRange | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear();
  const q = Math.floor(today.getMonth() / 3) * 3;
  switch (period) {
    case "this_quarter":
      return quarter(y, q);
    case "last_quarter":
      return quarter(y, q - 3);
    case "this_year":
      return range(new Date(y, 0, 1), new Date(y, 11, 31));
    case "12m":
      return range(new Date(y - 1, today.getMonth(), today.getDate() + 1), today);
    default:
      return null;
  }
}

/** Every month from one "YYYY-MM-DD" to another, as "YYYY-MM" (at most 24, the latest ones) */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  const cursor = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1);
  const last = new Date(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, 1);
  while (cursor <= last) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months.slice(-24);
}

// ─── Cost categories ─────────────────────────────────────────────────────────

export const COST_CATEGORIES: CostCategory[] = ["BOOTH_SPACE", "TRAVEL", "GROUND_TRANSPORT", "STAFF_TIME", "MEALS_PER_DIEMS", "MATERIALS", "OTHER"];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  BOOTH_SPACE: "Booth / Space",
  TRAVEL: "Travel",
  GROUND_TRANSPORT: "Ground Transport",
  STAFF_TIME: "Staff Time",
  MEALS_PER_DIEMS: "Meals / Per Diems",
  MATERIALS: "Marketing Materials",
  OTHER: "Other",
};

/** Fixed colours per category (similar colours kept apart, checked for colour blindness), so a category keeps its colour when another is empty */
export const COST_CATEGORY_COLORS: Record<CostCategory, string> = {
  BOOTH_SPACE: "var(--series-1)",
  MATERIALS: "var(--series-6)",
  TRAVEL: "var(--series-4)",
  GROUND_TRANSPORT: "var(--series-3)",
  STAFF_TIME: "var(--series-2)",
  MEALS_PER_DIEMS: "var(--series-5)",
  OTHER: "var(--series-other)",
};

/** What goes in each category and where it comes from */
export const COST_CATEGORY_INFO: Record<CostCategory, string> = {
  BOOTH_SPACE: "Booth space, badges, booth build and furniture, show services (electrical, carpet, lighting) and shipping. From cost sheets and Finance.",
  MATERIALS: "Printing, signage, giveaways, pre-show promotion and ads. From cost sheets and Finance.",
  TRAVEL: "Flights, hotels and other travel. From Navan and the travel system.",
  GROUND_TRANSPORT: "Taxis, Uber, transfers and car rentals.",
  STAFF_TIME: "The cost of staff time on the event, from the staff time calculator.",
  MEALS_PER_DIEMS: "Meals, per diems and travel allowances.",
  OTHER: "Sponsorship packages, speaking fees, hospitality, equipment, lead retrieval, agency fees and software.",
};

// ─── Formulas, for the info tooltips ─────────────────────────────────────────

export const EVENT_METRIC_INFO = {
  budget: "The budgets approved for the events in this period. Events without a budget aren't included.",
  actual: "Invoiced and paid costs only. Estimates and commitments without an invoice aren't counted yet.",
  variance: "Variance = actual spend - approved budget, for the events with a budget. Below zero means under budget.",
  priorYear: "What the same events (same filters) actually spent in the same period one year earlier.",
  priorYearCost: "The actual cost of last year's event with the same name.",
  leads: "Leads: contacts captured at the events.",
  cpl: "Cost / lead = actual spend ÷ leads.",
  attendees: "Attendees: people who came to the booth or the event.",
  qualifiedLeads: "Qualified leads: marketing-qualified leads (MQLs) from the event.",
  demos: "Demos given at or after the event (from the demo log when the event has one).",
  customers: "Customers: new customers won from the event.",
  revenue: "Revenue won from the event, from HubSpot results.",
  roi: "ROI = (revenue - actual cost) ÷ actual cost × 100.",
  status: "Upcoming before the event starts, In progress while it's on, Completed once it has ended. Cancelled events keep that status.",
};

/** "248%", "-12.5%" */
export function fmtRoi(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: Math.abs(value) >= 10 ? 0 : 1 })}%`;
}

/** "Toronto, Canada" */
export function eventRegion(e: Pick<EventPerformance, "city" | "country_code">) {
  return [e.city, countryName(e.country_code)].filter(Boolean).join(", ") || null;
}

// ─── Status ──────────────────────────────────────────────────────────────────

/** Running or done, with no leads recorded */
export const missingLeads = (e: EventPerformance) => (e.status === "ACTIVE" || e.status === "COMPLETED") && !e.leads;

export type EventDisplayStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "OTHER";

/** Upcoming, In progress, Completed or Cancelled */
export function displayStatus(e: EventPerformance): EventDisplayStatus {
  return e.status === "PLANNED" || e.status === "ACTIVE" || e.status === "COMPLETED" || e.status === "CANCELLED" ? e.status : "OTHER";
}

export function statusLabel(e: EventPerformance) {
  return EVENT_STATUS_LABELS[e.status as InitiativeStatus] ?? e.status;
}

export const STATUS_PILL: Record<EventDisplayStatus, string> = {
  PLANNED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  ACTIVE: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  COMPLETED: "border-gray-200 bg-gray-100 text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CANCELLED: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  OTHER: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};
