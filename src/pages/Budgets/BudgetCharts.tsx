import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LegendItem } from "@/components/dashboard/ChartCard";
import { compactMoney } from "@/components/dashboard/tones";
import { formatMoney } from "../Initiatives/format";

export interface BudgetChartPoint {
  /** "2026-10" */
  key: string;
  /** "Oct" */
  label: string;
  /** "October 2026" */
  fullLabel: string;
  budget: number;
  actual: number;
  /** The comparison period's actual spend for the same position (null when nothing is compared) */
  compare: number | null;
}

// Comparison in amber, the same as the Events Overview: blue or violet is too close to the spend bar for colour-blind readers
const COMPARE = "var(--chart-compare)";
const COMPARE_VARS = "[--chart-compare:#d97706] dark:[--chart-compare:#d97706]";
// The cumulative budget line: a dashed neutral, so the spend lines stand out
const BUDGET_LINE = "var(--chart-budget-line)";
const BUDGET_LINE_VARS = "[--chart-budget-line:#64748b] dark:[--chart-budget-line:#94a3b8]";

export function BudgetChartLegend({ compareLabel, cumulative = false }: { compareLabel: string | null; cumulative?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${COMPARE_VARS} ${BUDGET_LINE_VARS}`}>
      <LegendItem color={cumulative ? BUDGET_LINE : "var(--chart-budget)"} label={cumulative ? "Cumulative budget" : "Approved budget"} />
      <LegendItem color="var(--chart-spend)" label={cumulative ? "Cumulative spend" : "Actual spend"} />
      {compareLabel && <LegendItem color={COMPARE} label={compareLabel} />}
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload?: BudgetChartPoint & { cumBudget?: number; cumActual?: number; cumCompare?: number | null } }[];
  currency: string;
  compareLabel: string | null;
  cumulative: boolean;
}

function ChartTooltip({ active, payload, currency, compareLabel, cumulative }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const budget = cumulative ? (point.cumBudget ?? 0) : point.budget;
  const actual = cumulative ? (point.cumActual ?? 0) : point.actual;
  const compare = cumulative ? (point.cumCompare ?? null) : point.compare;
  const left = budget - actual;
  const row = (color: string, label: string, value: number) => (
    <p className="mt-1 flex items-center justify-between gap-4 first:mt-0">
      <LegendItem color={color} label={label} />
      <span className="font-medium tabular-nums">{formatMoney(value, currency)}</span>
    </p>
  );
  return (
    <div className={`min-w-52 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ${COMPARE_VARS} ${BUDGET_LINE_VARS}`}>
      <p className="mb-1.5 font-semibold">
        {point.fullLabel}
        {cumulative ? " (to date)" : ""}
      </p>
      {row(cumulative ? BUDGET_LINE : "var(--chart-budget)", "Approved budget", budget)}
      {row("var(--chart-spend)", "Actual spend", actual)}
      {compareLabel && compare !== null && row(COMPARE, compareLabel, compare)}
      {budget > 0 && (
        <p className={`mt-1.5 border-t border-border pt-1.5 tabular-nums ${left < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
          {left < 0 ? `${formatMoney(-left, currency)} over budget` : `${formatMoney(left, currency)} remaining`}
        </p>
      )}
    </div>
  );
}

const axisProps = { tickLine: false, axisLine: false, tick: { fill: "currentColor", fontSize: 12 } } as const;

/** Approved budget, actual spend and the comparison period's spend for each month. Needs CHART_VARS on a wrapper (ChartCard has it). */
export function BudgetActualChart({ data, currency, compareLabel, height = 240 }: { data: BudgetChartPoint[]; currency: string; compareLabel: string | null; height?: number }) {
  return (
    <div style={{ height }} className={`w-full min-w-0 text-muted-foreground ${COMPARE_VARS}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} />
          <YAxis {...axisProps} width={56} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={(props) => (
              <ChartTooltip active={props.active} payload={props.payload as unknown as TooltipProps["payload"]} currency={currency} compareLabel={compareLabel} cumulative={false} />
            )}
          />
          <Bar dataKey="budget" name="Approved budget" fill="var(--chart-budget)" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar dataKey="actual" name="Actual spend" fill="var(--chart-spend)" radius={[4, 4, 0, 0]} maxBarSize={20} />
          {compareLabel && <Bar dataKey="compare" name={compareLabel} fill={COMPARE} radius={[4, 4, 0, 0]} maxBarSize={20} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Running totals through the period: is spending running ahead of the budget? Needs CHART_VARS on a wrapper. */
export function CumulativeSpendChart({ data, currency, compareLabel, height = 240 }: { data: BudgetChartPoint[]; currency: string; compareLabel: string | null; height?: number }) {
  const sumTo = (i: number, pick: (p: BudgetChartPoint) => number) => data.slice(0, i + 1).reduce((s, p) => s + pick(p), 0);
  const running = data.map((p, i) => ({
    ...p,
    cumBudget: sumTo(i, (q) => q.budget),
    cumActual: sumTo(i, (q) => q.actual),
    cumCompare: p.compare === null ? null : sumTo(i, (q) => q.compare ?? 0),
  }));
  return (
    <div style={{ height }} className={`w-full min-w-0 text-muted-foreground ${COMPARE_VARS} ${BUDGET_LINE_VARS}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={running} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} />
          <YAxis {...axisProps} width={56} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <Tooltip
            content={(props) => (
              <ChartTooltip active={props.active} payload={props.payload as unknown as TooltipProps["payload"]} currency={currency} compareLabel={compareLabel} cumulative />
            )}
          />
          <Line type="monotone" dataKey="cumBudget" name="Cumulative budget" stroke={BUDGET_LINE} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
          {compareLabel && <Line type="monotone" dataKey="cumCompare" name={compareLabel} stroke={COMPARE} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />}
          <Line type="monotone" dataKey="cumActual" name="Cumulative spend" stroke="var(--chart-spend)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
