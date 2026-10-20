// Labels, colours and month helpers for the Budgets & Expenses page
import type { BudgetProgress, BudgetStatus } from "@/types/budgets";

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  APPROVED: "Approved",
  NOT_COMMITTED: "Not committed",
  CANCELLED: "Cancelled",
};

export const BUDGET_STATUSES: BudgetStatus[] = ["APPROVED", "NOT_COMMITTED", "CANCELLED"];

export const PROGRESS_LABELS: Record<BudgetProgress, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
  NOT_COMMITTED: "Not committed",
  CANCELLED: "Cancelled",
};

export const PROGRESS_DOT: Record<BudgetProgress, string> = {
  NOT_STARTED: "bg-zinc-400",
  IN_PROGRESS: "bg-blue-500",
  COMPLETE: "bg-emerald-500",
  NOT_COMMITTED: "bg-amber-500",
  CANCELLED: "bg-zinc-300 dark:bg-zinc-600",
};

/** Coloured pill for a budget's status */
export const STATUS_PILL: Record<BudgetStatus, string> = {
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  NOT_COMMITTED: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export const CURRENCIES = ["USD", "CAD", "GBP", "AUD", "EUR"];

export const TBD_ALL = "TBD/All";
export const ALL_CHANNELS = "All channels";

/** "Othership · London" or "TBD/All · London" */
export function budgetName(b: { brand_name: string | null; market_name: string }) {
  return `${b.brand_name ?? TBD_ALL} · ${b.market_name}`;
}

/** "Othership · London · Events", leaving out the channel when it covers all channels */
export function budgetLabel(b: { brand_name: string | null; market_name: string; channel_name: string | null }) {
  return b.channel_name ? `${budgetName(b)} · ${b.channel_name}` : budgetName(b);
}

// ─── Months ──────────────────────────────────────────────────────────────────
// The URL keeps "2026-09"; the API takes "2026-09-01".

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10" for the current month */
export function thisMonthKey() {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`;
}

export function addMonths(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export const toApiMonth = (key: string) => `${key}-01`;
export const fromApiMonth = (month: string) => month.slice(0, 7);

/** "September 2026" */
export function monthName(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** "September" */
export function monthOnly(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long" });
}

// ─── Money ───────────────────────────────────────────────────────────────────

/** Bar colour for how much of the budget is spent: amber from 90%, red when over */
export function usageTone(percent: number | null, over: boolean) {
  if (over) return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
  if (percent !== null && percent >= 90) return { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" };
  return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" };
}

// ─── Time ────────────────────────────────────────────────────────────────────

/** "Today 3:20 PM", "Yesterday 9:05 AM", "Oct 3" or "Oct 3, 2025" */
export function formatWhen(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Full date and time for a tooltip */
export function formatFullWhen(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
