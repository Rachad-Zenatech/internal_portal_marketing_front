// Shared colours for the dashboard building blocks (KPI cards, insight cards, charts)

export type Tone = "blue" | "violet" | "green" | "orange" | "sky" | "pink" | "red" | "amber" | "slate";

/** Soft tinted icon tiles, one colour per card */
export const TONE_TILE: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
  pink: "bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  slate: "bg-muted text-muted-foreground",
};

export const DASH_CARD = "rounded-xl border border-border bg-card shadow-xs";

/**
 * Chart colours as CSS variables, with their own dark mode steps (checked for colour blindness and contrast).
 * Put CHART_VARS on a wrapper and use e.g. fill="var(--series-1)" or className="bg-(--series-1)".
 */
export const CHART_VARS =
  "[--chart-budget:#93c5fd] [--chart-spend:#1d4ed8] dark:[--chart-budget:#1e40af] dark:[--chart-spend:#60a5fa] " +
  "[--platform-google:#2563eb] [--platform-bing:#14b8a6] dark:[--platform-google:#3b82f6] dark:[--platform-bing:#0d9488] " +
  "[--series-1:#2563eb] [--series-2:#14b8a6] [--series-3:#f59e0b] [--series-4:#8b5cf6] [--series-5:#f43f5e] [--series-6:#65a30d] [--series-other:#94a3b8] " +
  "dark:[--series-1:#3b82f6] dark:[--series-2:#0d9488] dark:[--series-3:#d97706] dark:[--series-4:#8b5cf6] dark:[--series-5:#f43f5e] dark:[--series-6:#65a30d] dark:[--series-other:#64748b]";

/** Fixed order for categories (never cycled): anything past the fifth folds into "Other" */
export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];
export const SERIES_OTHER = "var(--series-other)";

/** "$12.3k", "$1.2M": short money for chart axes */
export function compactMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(value);
  } catch {
    return value.toLocaleString();
  }
}
