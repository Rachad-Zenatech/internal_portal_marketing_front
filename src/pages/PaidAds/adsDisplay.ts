// Labels, colours and number formats for the Paid Ads page
import type { AdPlatform, AdResultSource, AdResultStatus } from "@/types/ads";
import { formatMoney } from "../Initiatives/format";

/** Every Paid Search and Paid Social platform, in display order */
export const PLATFORMS: AdPlatform[] = ["GOOGLE_ADS", "BING_ADS", "LINKEDIN_ADS", "META_ADS", "YOUTUBE_ADS", "TIKTOK_ADS", "X_ADS", "REDDIT_ADS", "DISPLAY_PROGRAMMATIC", "OTHER"];

export const PLATFORM_LABELS: Record<AdPlatform, string> = {
  GOOGLE_ADS: "Google Ads",
  BING_ADS: "Microsoft Ads",
  LINKEDIN_ADS: "LinkedIn Ads",
  META_ADS: "Meta Ads",
  YOUTUBE_ADS: "YouTube Ads",
  TIKTOK_ADS: "TikTok Ads",
  X_ADS: "X Ads",
  REDDIT_ADS: "Reddit Ads",
  DISPLAY_PROGRAMMATIC: "Display",
  OTHER: "Other",
};

/** Short mark for the platform icon tile, and its brand-like tile colour */
export const PLATFORM_MARK: Record<AdPlatform, { text: string; tile: string }> = {
  GOOGLE_ADS: { text: "G", tile: "bg-blue-600 text-white" },
  BING_ADS: { text: "M", tile: "bg-teal-600 text-white" },
  LINKEDIN_ADS: { text: "in", tile: "bg-sky-700 text-white" },
  META_ADS: { text: "f", tile: "bg-indigo-600 text-white" },
  YOUTUBE_ADS: { text: "YT", tile: "bg-red-600 text-white" },
  TIKTOK_ADS: { text: "TT", tile: "bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900" },
  X_ADS: { text: "X", tile: "bg-zinc-800 text-white dark:bg-zinc-300 dark:text-zinc-900" },
  REDDIT_ADS: { text: "R", tile: "bg-orange-600 text-white" },
  DISPLAY_PROGRAMMATIC: { text: "D", tile: "bg-slate-500 text-white" },
  OTHER: { text: "?", tile: "bg-slate-400 text-white" },
};

/** Each platform's own colour (spelled out so Tailwind keeps the classes) */
export const PLATFORM_STYLES: Record<AdPlatform, { badge: string; dot: string; text: string; band: string }> = {
  GOOGLE_ADS: {
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    band: "border-l-blue-500",
  },
  BING_ADS: {
    badge: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/60 dark:text-teal-300",
    dot: "bg-teal-500",
    text: "text-teal-700 dark:text-teal-300",
    band: "border-l-teal-500",
  },
  LINKEDIN_ADS: {
    badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300",
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
    band: "border-l-sky-500",
  },
  META_ADS: {
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300",
    dot: "bg-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
    band: "border-l-indigo-500",
  },
  YOUTUBE_ADS: {
    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    band: "border-l-red-500",
  },
  TIKTOK_ADS: {
    badge: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    dot: "bg-zinc-700",
    text: "text-zinc-800 dark:text-zinc-200",
    band: "border-l-zinc-700",
  },
  X_ADS: {
    badge: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    dot: "bg-zinc-500",
    text: "text-zinc-800 dark:text-zinc-200",
    band: "border-l-zinc-500",
  },
  REDDIT_ADS: {
    badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300",
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
    band: "border-l-orange-500",
  },
  DISPLAY_PROGRAMMATIC: {
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    dot: "bg-slate-500",
    text: "text-slate-700 dark:text-slate-300",
    band: "border-l-slate-500",
  },
  OTHER: {
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    dot: "bg-slate-400",
    text: "text-slate-700 dark:text-slate-300",
    band: "border-l-slate-400",
  },
};

export const AD_STATUSES: AdResultStatus[] = ["ACTIVE", "PAUSED", "ENDED"];

export const AD_STATUS_LABELS: Record<AdResultStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ENDED: "Ended",
};

export const AD_STATUS_PILL: Record<AdResultStatus, string> = {
  ACTIVE: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  ENDED: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

export const SOURCE_LABELS: Record<AdResultSource, string> = {
  MANUAL: "Typed in",
  SPREADSHEET: "Spreadsheet",
  DATA_STUDIO: "Data Studio",
  GOOGLE_ADS_API: "Google Ads",
};

export const SOURCE_STYLES: Record<AdResultSource, string> = {
  MANUAL: "border-border bg-muted/60 text-muted-foreground",
  SPREADSHEET: "border-border bg-muted/60 text-muted-foreground",
  DATA_STUDIO: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300",
  GOOGLE_ADS_API: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300",
};

// ─── Numbers ─────────────────────────────────────────────────────────────────

export const DASH = "-";

export function fmtCount(value: number | null | undefined) {
  return value === null || value === undefined ? DASH : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function fmtMoney(value: number | null | undefined, currency: string) {
  return value === null || value === undefined ? DASH : formatMoney(value, currency);
}

/** Whole amounts for big figures, e.g. "$8,122" */
export function fmtWholeMoney(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return DASH;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return formatMoney(value, currency);
  }
}

/** Cost per click / lead: always with cents, e.g. "$1.20" */
export function fmtUnitCost(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return DASH;
  return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function fmtPercent(value: number | null | undefined) {
  return value === null || value === undefined ? DASH : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

// ─── Calculated figures (same formulas as the API, for the live preview in the form) ──

const round2 = (n: number) => Math.round(n * 100) / 100;
const ratio = (top: number | null, bottom: number | null, times = 1) => (top === null || bottom === null || bottom === 0 ? null : round2((top / bottom) * times));

export function calculateMetrics(v: {
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  hubspot_contacts: number | null;
  budget_amount: number | null;
}) {
  return {
    ctr: ratio(v.clicks, v.impressions, 100),
    cpc: ratio(v.spend, v.clicks),
    conversion_rate: ratio(v.conversions, v.clicks, 100),
    cpl: ratio(v.spend, v.hubspot_contacts),
    budget_used_percent: ratio(v.spend, v.budget_amount, 100),
  };
}

// ─── Periods ─────────────────────────────────────────────────────────────────

/** "Oct 2026" when the period is a whole month, otherwise "Oct 3, 2026 – Oct 20, 2026" / "From Oct 3, 2026" */
export function formatPeriod(start: string, end: string | null) {
  const date = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const s = date(start);
  const monthLabel = s.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  if (!end) return s.getDate() === 1 ? `${monthLabel}, running` : `From ${dayLabel(s)}`;
  const e = date(end);
  const wholeMonth = s.getDate() === 1 && e.getFullYear() === s.getFullYear() && e.getMonth() === s.getMonth() && new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate() === e.getDate();
  return wholeMonth ? monthLabel : `${dayLabel(s)} – ${dayLabel(e)}`;
}

/** Spend bar colour: green while there's room, amber from 90%, red when over */
export function spendTone(percent: number | null) {
  if (percent !== null && percent > 100) return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
  if (percent !== null && percent >= 90) return { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" };
  return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" };
}
