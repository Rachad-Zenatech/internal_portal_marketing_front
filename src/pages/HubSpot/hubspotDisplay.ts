// Labels and small calculations for the HubSpot Campaigns page (plain wording, no em dashes)
import type { HubSpotAsset, HubSpotAssets, HubSpotCampaign } from "@/types/hubspot";

export const DASH = "-";
export const NO_STATUS = "none";
export const NO_BRAND = "none";

export const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In progress",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  [NO_STATUS]: "No status",
};
export const STATUS_ORDER = ["active", "in_progress", "planned", "paused", "completed", NO_STATUS];

export const STATUS_PILL: Record<string, string> = {
  active: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  in_progress: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300",
  planned: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  paused: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  completed: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  [NO_STATUS]: "border-dashed border-border bg-transparent text-muted-foreground",
};

export const statusKey = (c: HubSpotCampaign) => (c.status && STATUS_LABELS[c.status] ? c.status : NO_STATUS);

/** In the order they're shown */
export const ASSET_LABELS: Record<string, string> = {
  SOCIAL_BROADCAST: "Social posts",
  AD_CAMPAIGN: "Ad campaigns",
  MARKETING_EMAIL: "Marketing emails",
  LANDING_PAGE: "Landing pages",
  SITE_PAGE: "Website pages",
  BLOG_POST: "Blog posts",
  FORM: "Forms",
  CTA: "Calls to action",
  MARKETING_EVENT: "Marketing events",
  OBJECT_LIST: "Contact lists",
  SEQUENCE: "Sequences",
  EXTERNAL_WEB_URL: "External URLs",
  MEETING_EVENT: "Meetings",
};
export const assetLabel = (type: string) => ASSET_LABELS[type] ?? type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (l) => l.toUpperCase());

/** The campaign's asset types with their assets (none for meetings, which are counted only), in the shown order */
export function assetGroups(assets: HubSpotAssets) {
  const order = Object.keys(ASSET_LABELS);
  return Object.entries(assets)
    .map(([type, value]) => ({
      type,
      label: assetLabel(type),
      count: Array.isArray(value) ? value.length : value.count,
      items: Array.isArray(value) ? (value as HubSpotAsset[]) : null,
    }))
    .filter((g) => g.count > 0)
    .sort((a, b) => (order.indexOf(a.type) + 1 || 99) - (order.indexOf(b.type) + 1 || 99));
}

export const assetTotal = (assets: HubSpotAssets) => assetGroups(assets).reduce((sum, g) => sum + g.count, 0);

/**
 * The brand code the campaign name starts with: "DS - EVT - ..." is DS, "[OPS] - ..." is OPS, "WA/AU - AWR" is WA/AU.
 * Null when the name doesn't follow the "CODE - ..." pattern.
 */
export function brandCode(name: string) {
  const match = name.match(/^\s*\[?([A-Za-z0-9/]{1,6})\]?\s*[-–—�]\s*\S/);
  return match ? match[1].toUpperCase() : null;
}

export function fmtCount(value: number | null | undefined) {
  return value === null || value === undefined ? DASH : value.toLocaleString();
}

export function fmtMoney(value: number | null | undefined, currency: string | null) {
  if (value === null || value === undefined) return DASH;
  if (!currency) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
}

export function fmtPercent(value: number | null | undefined) {
  return value === null || value === undefined ? DASH : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export const CURRENCY_SOURCE_LABELS: Record<string, string> = {
  HUBSPOT: "Set in HubSpot",
  COUNTRY: "From the country of the linked event",
  INITIATIVE: "From the linked initiative (HubSpot has none)",
};

/** A campaign with a budget that its spend has gone past */
export const overBudget = (c: HubSpotCampaign) => c.remaining_budget !== null && c.remaining_budget < 0;

/** Totals per currency, biggest first. Amounts without any known currency are kept apart (currency null). */
export function totalsByCurrency(campaigns: HubSpotCampaign[], field: "budget_total" | "spend_total") {
  const totals = new Map<string | null, number>();
  for (const c of campaigns) {
    const value = c[field];
    if (value === null || value === undefined) continue;
    totals.set(c.currency, (totals.get(c.currency) ?? 0) + value);
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount);
}

/** A campaign's number: one of its fields, or a first-touch funnel stage */
type Measure = "sessions" | "new_contacts_first_touch" | "new_contacts_last_touch" | "influenced_contacts" | "list_contacts" | "mql" | "sql";

export const measureOf = (c: HubSpotCampaign, field: Measure) =>
  field === "mql" || field === "sql" ? c.funnel?.first_touch?.[field] : c[field];

export function sumOf(campaigns: HubSpotCampaign[], field: Measure) {
  let any = false;
  const total = campaigns.reduce((sum, c) => {
    const v = measureOf(c, field);
    if (v === null || v === undefined) return sum;
    any = true;
    return sum + v;
  }, 0);
  return any ? total : null;
}

const parseDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function formatDay(iso: string | null) {
  return iso ? parseDay(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : DASH;
}

/** "Sep 20 - Oct 2, 2026", "From Sep 20, 2026", "Until ...", or "-" */
export function formatDates(start: string | null, end: string | null) {
  if (start && end) {
    const a = parseDay(start);
    const b = parseDay(end);
    const sameYear = a.getFullYear() === b.getFullYear();
    const first = a.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
    return `${first} - ${formatDay(end)}`;
  }
  if (start) return `From ${formatDay(start)}`;
  if (end) return `Until ${formatDay(end)}`;
  return DASH;
}
