// Period presets for the Paid Advertising page, and how campaigns sort into running / upcoming / finished
import type { AdResult } from "@/types/ads";

export type PeriodKey = "this_month" | "last_month" | "30d" | "90d" | "this_year" | "all";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
];

export const DEFAULT_PERIOD: PeriodKey = "30d";

export function parsePeriod(value: string | null): PeriodKey {
  return PERIOD_OPTIONS.some((o) => o.value === value) ? (value as PeriodKey) : DEFAULT_PERIOD;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** A local date as YYYY-MM-DD */
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export interface DateRange {
  from: string;
  to: string;
}

/** "2026-10" */
export const monthKeyOf = (iso: string) => iso.slice(0, 7);

function addMonthKey(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Every month key from first to last, inclusive */
export function monthsBetween(first: string, last: string) {
  const out: string[] = [];
  for (let k = first; k <= last && out.length < 120; k = addMonthKey(k, 1)) out.push(k);
  return out;
}

export function monthShort(key: string, withYear: boolean) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, withYear ? { month: "short", year: "2-digit" } : { month: "short" });
}

// ─── Running now / Upcoming / Finished ───────────────────────────────────────

export type CampaignTiming = "running" | "upcoming" | "finished";

/** Running: a period covers today and it isn't Ended. Upcoming: every period starts after today. Finished: the rest. */
export function campaignTiming(rows: AdResult[], today: string): CampaignTiming {
  if (rows.length > 0 && rows.every((r) => r.period_start > today)) return "upcoming";
  const running = rows.some((r) => r.status !== "ENDED" && r.period_start <= today && (r.period_end === null || r.period_end >= today));
  return running ? "running" : "finished";
}

/** Earliest period start */
export const firstStart = (rows: AdResult[]) => rows.reduce((min, r) => (r.period_start < min ? r.period_start : min), rows[0]?.period_start ?? "");
/** Latest date a period reaches (its end, or its start when it has no end) */
export const lastDate = (rows: AdResult[]) => rows.reduce((max, r) => ((r.period_end ?? r.period_start) > max ? (r.period_end ?? r.period_start) : max), "");
