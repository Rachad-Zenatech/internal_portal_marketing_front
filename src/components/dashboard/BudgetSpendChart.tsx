import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/pages/Initiatives/format";
import { LegendItem } from "./ChartCard";
import { compactMoney } from "./tones";

export interface BudgetSpendPoint {
  /** "2026-10" */
  key: string;
  /** "Oct" or "Oct 26" */
  label: string;
  /** Full name for the tooltip, e.g. "October 2026" */
  fullLabel: string;
  budget: number;
  spend: number;
}

interface TooltipPayload {
  payload?: BudgetSpendPoint;
}

function ChartTooltip({ active, payload, currency, budgetLabel, spendLabel }: { active?: boolean; payload?: TooltipPayload[]; currency: string; budgetLabel: string; spendLabel: string }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const left = point.budget - point.spend;
  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-semibold">{point.fullLabel}</p>
      <p className="flex items-center justify-between gap-4">
        <LegendItem color="var(--chart-budget)" label={budgetLabel} />
        <span className="font-medium tabular-nums">{formatMoney(point.budget, currency)}</span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-4">
        <LegendItem color="var(--chart-spend)" label={spendLabel} />
        <span className="font-medium tabular-nums">{formatMoney(point.spend, currency)}</span>
      </p>
      {point.budget > 0 && (
        <p className={`mt-1.5 border-t border-border pt-1.5 tabular-nums ${left < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
          {left < 0 ? `${formatMoney(-left, currency)} over` : `${formatMoney(left, currency)} left`}
        </p>
      )}
    </div>
  );
}

/** The legend for BudgetSpendChart, for the ChartCard's top right */
export function BudgetSpendLegend({ budgetLabel = "Budget", spendLabel = "Actual spend" }: { budgetLabel?: string; spendLabel?: string }) {
  return (
    <div className="flex items-center gap-4">
      <LegendItem color="var(--chart-budget)" label={budgetLabel} />
      <LegendItem color="var(--chart-spend)" label={spendLabel} />
    </div>
  );
}

/** Budget and spend side by side for each month (light = budget, dark = spend). Needs CHART_VARS on a wrapper (ChartCard has it). */
export default function BudgetSpendChart({
  data,
  currency,
  height = 260,
  budgetLabel = "Budget",
  spendLabel = "Actual spend",
}: {
  data: BudgetSpendPoint[];
  currency: string;
  height?: number;
  budgetLabel?: string;
  spendLabel?: string;
}) {
  return (
    <div style={{ height }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickFormatter={(v: number) => compactMoney(v, currency)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={(props) => (
              <ChartTooltip active={props.active} payload={props.payload as unknown as TooltipPayload[]} currency={currency} budgetLabel={budgetLabel} spendLabel={spendLabel} />
            )}
          />
          <Bar dataKey="budget" name={budgetLabel} fill="var(--chart-budget)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="spend" name={spendLabel} fill="var(--chart-spend)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
