// Reporting periods for Budgets & Expenses: a month, a quarter or a year, and what it's compared with.
// The URL keeps the period as "2026-10" (month), "2026-Q4" (quarter) or "2026" (year).
import { addMonths, thisMonthKey } from "./budgetDisplay";

export type PeriodKind = "month" | "quarter" | "year";
export type Compare = "prior_year" | "previous" | "none";

export interface Period {
  kind: PeriodKind;
  /** "2026-10", "2026-Q4" or "2026" */
  key: string;
  /** First and last month, "YYYY-MM" */
  first: string;
  last: string;
}

export const PERIOD_KINDS: { value: PeriodKind; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

export const COMPARE_OPTIONS: { value: Compare; label: string }[] = [
  { value: "prior_year", label: "Same period last year" },
  { value: "previous", label: "Previous period" },
  { value: "none", label: "Nothing" },
];

const quarterOf = (monthKey: string) => Math.floor((Number(monthKey.slice(5, 7)) - 1) / 3) + 1;

/** The period of a kind that a month falls in */
export function periodOf(kind: PeriodKind, monthKey: string): Period {
  const year = monthKey.slice(0, 4);
  if (kind === "month") return { kind, key: monthKey, first: monthKey, last: monthKey };
  if (kind === "year") return { kind, key: year, first: `${year}-01`, last: `${year}-12` };
  const q = quarterOf(monthKey);
  const first = `${year}-${String((q - 1) * 3 + 1).padStart(2, "0")}`;
  return { kind, key: `${year}-Q${q}`, first, last: addMonths(first, 2) };
}

/** A valid period from the URL, or this quarter */
export function parsePeriod(value: string | null): Period {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return periodOf("month", value);
  const quarter = value?.match(/^(\d{4})-Q([1-4])$/);
  if (quarter) return periodOf("quarter", `${quarter[1]}-${String((Number(quarter[2]) - 1) * 3 + 1).padStart(2, "0")}`);
  if (value && /^\d{4}$/.test(value)) return periodOf("year", `${value}-01`);
  return periodOf("quarter", thisMonthKey());
}

export const parseCompare = (value: string | null): Compare => (value === "previous" || value === "none" ? value : "prior_year");

/** Number of months in a period */
export const periodLength = (p: Period) => (p.kind === "month" ? 1 : p.kind === "quarter" ? 3 : 12);

/** The period before or after, of the same kind */
export function shiftPeriod(p: Period, steps: number): Period {
  return periodOf(p.kind, addMonths(p.first, steps * periodLength(p)));
}

/** What a period is compared with, or null for nothing */
export function comparePeriod(p: Period, compare: Compare): Period | null {
  if (compare === "none") return null;
  return compare === "prior_year" ? periodOf(p.kind, addMonths(p.first, -12)) : shiftPeriod(p, -1);
}

/** "Oct 2026", "Q4 2026" or "2026" */
export function periodName(p: Period) {
  if (p.kind === "year") return p.key;
  if (p.kind === "quarter") return `${p.key.slice(5)} ${p.key.slice(0, 4)}`;
  return new Date(Number(p.first.slice(0, 4)), Number(p.first.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** "Oct 1, 2026 – Dec 31, 2026" */
export function periodDates(p: Period) {
  const start = new Date(Number(p.first.slice(0, 4)), Number(p.first.slice(5, 7)) - 1, 1);
  const end = new Date(Number(p.last.slice(0, 4)), Number(p.last.slice(5, 7)), 0);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Every month of a period, "YYYY-MM" */
export function periodMonths(p: Period): string[] {
  return Array.from({ length: periodLength(p) }, (_, i) => addMonths(p.first, i));
}

/** The API's dates: first day of the first month and of the last month */
export const periodApiMonths = (p: Period) => ({ from: `${p.first}-01`, to: `${p.last}-01` });

/** The period's first and last day, YYYY-MM-DD */
export function periodApiDates(p: Period) {
  const lastDay = new Date(Number(p.last.slice(0, 4)), Number(p.last.slice(5, 7)), 0).getDate();
  return { from: `${p.first}-01`, to: `${p.last}-${String(lastDay).padStart(2, "0")}` };
}

/** How many months apart two periods start, e.g. 12 for the same period last year */
export function monthsBetween(from: Period, to: Period) {
  return (Number(to.first.slice(0, 4)) - Number(from.first.slice(0, 4))) * 12 + Number(to.first.slice(5, 7)) - Number(from.first.slice(5, 7));
}

/** "vs. Q4 2025" */
export const compareLabel = (p: Period | null) => (p ? `vs. ${periodName(p)}` : "");
