import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LegendItem } from "@/components/dashboard/ChartCard";
import { compactMoney } from "@/components/dashboard/tones";
import { formatMoney } from "../Initiatives/format";

export interface EventBudgetPoint {
  /** "2026-10" */
  key: string;
  /** "Oct" */
  label: string;
  /** "October 2026" */
  fullLabel: string;
  budget: number;
  actual: number;
  /** Actual spend on the events in the same month a year earlier */
  priorYear: number;
}

// Prior year in amber: a blue or violet third bar is too close to the actual spend bar for colour-blind readers
const PRIOR_COLOR = "var(--chart-prior)";
const PRIOR_VARS = "[--chart-prior:#d97706] dark:[--chart-prior:#d97706]";

export function EventBudgetLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <LegendItem color="var(--chart-budget)" label="Approved budget" />
      <LegendItem color="var(--chart-spend)" label="Actual spend" />
      <span className={PRIOR_VARS}>
        <LegendItem color={PRIOR_COLOR} label="Prior year" />
      </span>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload?: EventBudgetPoint }[];
  currency: string;
}

function ChartTooltip({ active, payload, currency }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const left = point.budget - point.actual;
  const row = (color: string, label: string, value: number) => (
    <p className="mt-1 flex items-center justify-between gap-4 first:mt-0">
      <LegendItem color={color} label={label} />
      <span className="font-medium tabular-nums">{formatMoney(value, currency)}</span>
    </p>
  );
  return (
    <div className={`min-w-48 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ${PRIOR_VARS}`}>
      <p className="mb-1.5 font-semibold">{point.fullLabel}</p>
      {row("var(--chart-budget)", "Approved budget", point.budget)}
      {row("var(--chart-spend)", "Actual spend", point.actual)}
      {row(PRIOR_COLOR, "Prior year", point.priorYear)}
      {point.budget > 0 && (
        <p className={`mt-1.5 border-t border-border pt-1.5 tabular-nums ${left < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
          {left < 0 ? `${formatMoney(-left, currency)} over budget` : `${formatMoney(left, currency)} remaining`}
        </p>
      )}
    </div>
  );
}

/**
 * Per month (by the month each event starts): the events' approved budgets, their actual spend (invoiced and paid),
 * and the actual spend of the same month a year earlier. Needs CHART_VARS on a wrapper (ChartCard has it).
 */
export default function EventBudgetChart({ data, currency, height = 240 }: { data: EventBudgetPoint[]; currency: string; height?: number }) {
  return (
    <div style={{ height }} className={`w-full min-w-0 text-muted-foreground ${PRIOR_VARS}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={(props) => <ChartTooltip active={props.active} payload={props.payload as unknown as TooltipProps["payload"]} currency={currency} />}
          />
          <Bar dataKey="budget" name="Approved budget" fill="var(--chart-budget)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="actual" name="Actual spend" fill="var(--chart-spend)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="priorYear" name="Prior year" fill={PRIOR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
