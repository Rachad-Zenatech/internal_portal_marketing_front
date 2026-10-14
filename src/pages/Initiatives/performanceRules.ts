import type { KpiUnit, MoneyOutcome, Performance, RatingCode } from "@/types/performance";
import { formatMoney } from "./format";

/** The results worth recording for each channel, in funnel order; everything else uses DEFAULT_RESULT_METRICS */
export const RESULT_METRICS_BY_CHANNEL: Record<string, string[]> = {
  EVENTS: ["VISITORS", "LEADS", "FOLLOW_UPS", "DEMOS", "MQLS", "SQLS", "CUSTOMERS", "PIPELINE", "REVENUE"],
  PAID_SEARCH: ["IMPRESSIONS", "CLICKS", "CONVERSIONS", "LEADS", "MQLS", "SQLS", "CUSTOMERS", "REVENUE"],
  PAID_SOCIAL: ["IMPRESSIONS", "CLICKS", "CONVERSIONS", "LEADS", "MQLS", "SQLS", "CUSTOMERS", "REVENUE"],
};
export const DEFAULT_RESULT_METRICS = ["VISITORS", "LEADS", "MQLS", "SQLS", "CUSTOMERS", "PIPELINE", "REVENUE"];

/** Friendlier labels for events, where "visitors" means people at the booth */
export const EVENT_METRIC_LABELS: Record<string, string> = { VISITORS: "Booth visitors" };

export const RATING_STYLES: Record<RatingCode, string> = {
  HIGH: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  LOW: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
  TEST: "border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
};

/** A KPI value in its own unit: "$1,000", "1.5%", "120,000" */
export function formatKpiValue(value: number | null, unit: KpiUnit | null, currency: string) {
  if (value === null) return "—";
  if (unit === "MONEY") return formatMoney(value, currency);
  if (unit === "PERCENT") return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
  return value.toLocaleString();
}

export function formatCount(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** The CEO's way of putting it: "$20,000 spent. 2 customers brought in $20,000 — it broke even, which doesn't count as a success." */
export function verdictSentence(p: Performance): string | null {
  if (!p.cost || !p.money_outcome) return null;
  const spent = `${formatMoney(p.cost, p.currency)} spent.`;
  const outcome: MoneyOutcome = p.money_outcome;
  if (outcome === "NO_REVENUE") {
    return p.rating.code === "TEST"
      ? `${spent} No revenue recorded yet — it usually arrives within the maturity window.`
      : `${spent} No revenue was recorded.`;
  }
  const revenue = formatMoney(p.revenue ?? 0, p.currency);
  const customers = p.totals.CUSTOMERS;
  const cameBack = customers ? `${formatCount(customers)} ${customers === 1 ? "customer" : "customers"} brought in ${revenue}` : `${revenue} of revenue came in`;
  if (outcome === "BROKE_EVEN") return `${spent} ${cameBack} — it broke even, which doesn't count as a success.`;
  if (outcome === "LOST_MONEY") return `${spent} ${cameBack} — it lost money (ROI ${p.roi_percent}%).`;
  const perDollar = ((p.roi_percent ?? 0) / 100 + 1).toFixed(2);
  return `${spent} ${cameBack} — every ${formatMoney(1, p.currency)} spent brought back ${formatMoney(Number(perDollar), p.currency)} (ROI ${p.roi_percent}%).`;
}

/** First day of a month as "YYYY-MM-01", from a date like "2026-11-04" */
export function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

export function formatMonthLong(value: string) {
  return new Date(`${value.slice(0, 7)}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatDateLong(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}
