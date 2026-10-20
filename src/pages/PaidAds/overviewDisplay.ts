// Labels, date ranges and wording for the Paid Advertising page (plain wording, no em dashes)
import type { AdsAttentionReason, AdsCampaignRow, CampaignStatus, DataHealthStatus, DataSourceKind } from "@/types/ads";
import { fmtPercent, fmtUnitCost } from "./adsDisplay";
import { isoDate } from "./adsPeriods";

export const OBJECTIVE_LABELS: Record<string, string> = {
  AWARENESS: "Awareness",
  TRAFFIC: "Traffic",
  LEADS: "Leads",
  CONVERSIONS: "Conversions",
  ENGAGEMENT: "Engagement",
  VIDEO_VIEWS: "Video views",
};
export const OBJECTIVES = Object.keys(OBJECTIVE_LABELS);

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["ACTIVE", "PAUSED", "PLANNED", "COMPLETED", "DRAFT", "CANCELLED"];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  PLANNED: "Planned",
  COMPLETED: "Completed",
  DRAFT: "Draft",
  CANCELLED: "Cancelled",
};

export const CAMPAIGN_STATUS_PILL: Record<CampaignStatus, string> = {
  ACTIVE: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  PLANNED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  COMPLETED: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  DRAFT: "border-gray-200 bg-gray-50 text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
  CANCELLED: "border-gray-200 bg-gray-50 text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
};

export const HEALTH_LABELS: Record<DataHealthStatus, string> = {
  OK: "Up to date",
  STALE: "Data delayed",
  NO_DATA: "No data yet",
  CONNECTION: "Connection issue",
  NOT_STARTED: "Not started",
};

export const HEALTH_TONE: Record<DataHealthStatus, string> = {
  OK: "text-emerald-700 dark:text-emerald-400",
  STALE: "text-amber-700 dark:text-amber-400",
  NO_DATA: "text-amber-700 dark:text-amber-400",
  CONNECTION: "text-red-600 dark:text-red-400",
  NOT_STARTED: "text-muted-foreground",
};

export const HEALTH_DOT: Record<DataHealthStatus, string> = {
  OK: "bg-emerald-500",
  STALE: "bg-amber-500",
  NO_DATA: "bg-amber-500",
  CONNECTION: "bg-red-500",
  NOT_STARTED: "bg-slate-300 dark:bg-slate-600",
};

export const SOURCE_KIND_LABELS: Record<DataSourceKind, string> = {
  API: "API connection",
  SPREADSHEET: "Spreadsheet import",
  MANUAL: "Manual",
  DATA_STUDIO: "Data Studio",
  GOOGLE_ADS_API: "Google Ads sync",
  MICROSOFT_ADS_API: "Microsoft Ads sync",
};

export const CONNECTION_LABELS: Record<string, string> = {
  CONNECTED: "Connected",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  ERROR: "Error",
  NEEDS_REAUTH: "Needs sign in again",
};

// ─── Date ranges ─────────────────────────────────────────────────────────────

export type RangeKey = "7d" | "30d" | "90d" | "this_month" | "last_month" | "this_year" | "custom";

export const RANGE_OPTIONS: { value: Exclude<RangeKey, "custom">; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
];

export const DEFAULT_RANGE: RangeKey = "30d";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The dates for a preset, or the custom from/to when both are valid */
export function resolveRange(key: string | null, from: string | null, to: string | null, now = new Date()): { key: RangeKey; from: string; to: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = (n: number) => ({ from: isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1))), to: isoDate(today) });
  if (key === "custom" && from && to && ISO.test(from) && ISO.test(to) && from <= to) return { key: "custom", from, to };
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (key) {
    case "7d":
      return { key, ...days(7) };
    case "90d":
      return { key, ...days(90) };
    case "this_month":
      return { key, from: isoDate(new Date(y, m, 1)), to: isoDate(today) };
    case "last_month":
      return { key, from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
    case "this_year":
      return { key, from: isoDate(new Date(y, 0, 1)), to: isoDate(today) };
    default:
      return { key: "30d", ...days(30) };
  }
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "Sep 20 - Oct 19, 2026" (the year once when both ends share it) */
export function formatRange(from: string, to: string) {
  const a = parse(from);
  const b = parse(to);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  const right = b.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return from === to ? right : `${left} - ${right}`;
}

/** "Oct 7" or "Oct 7, 2025" when it isn't this year */
export function formatDay(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = parse(iso.slice(0, 10));
  const thisYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, thisYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** Chart label for a point: "Oct 7" for a day or week (its first day), "Oct 2026" for a month */
export function pointLabel(start: string, bucket: "day" | "week" | "month") {
  const d = parse(start);
  return bucket === "month" ? d.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Campaigns needing attention ─────────────────────────────────────────────

/** A short title and one line of detail, e.g. "Budget nearly used up" / "94% of budget spent" */
export function attentionText(reason: AdsAttentionReason, currency: string, campaign?: Pick<AdsCampaignRow, "data_health"> | null): { title: string; detail: string } {
  const money = (n: number | null) => fmtUnitCost(n, currency);
  switch (reason.kind) {
    case "BUDGET":
      return (reason.value ?? 0) >= 100
        ? { title: "Over budget", detail: `${fmtPercent(Math.round(reason.value ?? 0))} of budget spent` }
        : { title: "Budget nearly used up", detail: `${fmtPercent(Math.round(reason.value ?? 0))} of budget spent` };
    case "CPL_ABOVE_TARGET":
      return { title: "Cost per lead above target", detail: `${money(reason.value)} vs ${money(reason.benchmark)} target` };
    case "CPL_ABOVE_PLATFORM":
      return { title: "High cost per lead", detail: `${money(reason.value)} vs ${money(reason.benchmark)} platform average` };
    case "UNEXPECTEDLY_PAUSED":
      return { title: "Paused during its run dates", detail: "Verify pause reason" };
    case "DATA_DELAYED": {
      const health = campaign?.data_health;
      if (health?.status === "CONNECTION") return { title: "Data delayed", detail: "The platform connection needs attention" };
      if (health?.last_data_date) return { title: "Data delayed", detail: `No results since ${formatDay(health.last_data_date)}` };
      return { title: "Data delayed", detail: "No results in the last 7 days" };
    }
  }
}

export const ATTENTION_INFO =
  "Budget 90% or more used; cost per lead above the campaign's target (or 30% above its platform's average); paused while its dates say it should run; or no results in the last 7 days.";
