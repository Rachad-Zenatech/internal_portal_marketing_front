// Labels, colours and month helpers for the Monthly Budgets page
import type { BudgetProgress, BudgetRow, BudgetStatus } from "@/types/budgets";
import { formatMoney } from "../Initiatives/format";

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

/** Each market gets its own colour, so its block of budgets is easy to find; Unassigned stays grey */
const MARKET_TONES = [
  { dot: "bg-sky-500", band: "border-l-sky-500 bg-sky-50 dark:bg-sky-950/30", text: "text-sky-900 dark:text-sky-200" },
  { dot: "bg-emerald-500", band: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-900 dark:text-emerald-200" },
  { dot: "bg-amber-500", band: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30", text: "text-amber-900 dark:text-amber-200" },
  { dot: "bg-rose-500", band: "border-l-rose-500 bg-rose-50 dark:bg-rose-950/30", text: "text-rose-900 dark:text-rose-200" },
  { dot: "bg-teal-500", band: "border-l-teal-500 bg-teal-50 dark:bg-teal-950/30", text: "text-teal-900 dark:text-teal-200" },
  { dot: "bg-indigo-500", band: "border-l-indigo-500 bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-900 dark:text-indigo-200" },
];
const UNASSIGNED_TONE = { dot: "bg-zinc-400", band: "border-l-zinc-400 bg-zinc-100 dark:bg-zinc-800/60", text: "text-zinc-800 dark:text-zinc-200" };

export function marketTone(marketId: number, marketName: string) {
  if (marketName === "Unassigned") return UNASSIGNED_TONE;
  return MARKET_TONES[Math.abs(marketId) % MARKET_TONES.length];
}

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

/** A valid "YYYY-MM" from the URL, or this month */
export function parseMonthKey(value: string | null) {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return thisMonthKey();
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

/** "+$3,000" for money moved in */
export const movedIn = (b: BudgetRow) => `+${formatMoney(b.moved_in, b.currency)}`;
/** "−$1,650" for money moved out */
export const movedOut = (b: BudgetRow) => `−${formatMoney(b.moved_out, b.currency)}`;

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
