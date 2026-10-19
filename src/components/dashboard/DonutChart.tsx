import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/pages/Initiatives/format";
import { compactMoney, SERIES, SERIES_OTHER } from "./tones";

export interface DonutItem {
  key: string;
  label: string;
  value: number;
  /** A CSS colour; leave out to use the shared order (fixed, never cycled) */
  color?: string;
}

/** Keeps the 5 biggest and folds the rest into "Other", so colours never repeat */
export function foldIntoOther(items: DonutItem[], keep = 5): DonutItem[] {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= keep) return sorted;
  const rest = sorted.slice(keep).reduce((sum, i) => sum + i.value, 0);
  return [...sorted.slice(0, keep), { key: "__other", label: "Other", value: rest, color: SERIES_OTHER }];
}

/** A donut with the total in the middle, and a legend list (dot, name, bar, %, amount). Needs CHART_VARS on a wrapper (ChartCard has it). */
export default function DonutChart({ items, currency, totalLabel = "Total" }: { items: DonutItem[]; currency: string; totalLabel?: string }) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const colored = items.map((i, idx) => ({ ...i, color: i.color ?? SERIES[idx] ?? SERIES_OTHER }));
  return (
    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="relative mx-auto h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={colored} dataKey="value" nameKey="label" innerRadius={60} outerRadius={86} stroke="var(--card)" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
              {colored.map((i) => (
                <Cell key={i.key} fill={i.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (DonutItem & { color: string }) | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                      {p.label}
                    </p>
                    <p className="mt-0.5 tabular-nums">
                      {formatMoney(p.value, currency)} · {total ? Math.round((p.value / total) * 100) : 0}%
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-muted-foreground">{totalLabel}</span>
          <span className="max-w-28 truncate text-lg font-semibold tabular-nums text-foreground" title={formatMoney(total, currency)}>
            {compactMoney(total, currency)}
          </span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-col gap-2.5">
        {colored.map((i) => {
          const pct = total ? (i.value / total) * 100 : 0;
          return (
            <li key={i.key} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(0,1fr)_64px_auto_auto]">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.color }} />
                <span className="truncate text-foreground">{i.label}</span>
              </span>
              <span className="hidden h-1.5 overflow-hidden rounded-full bg-muted sm:block" aria-hidden="true">
                <span className="block h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: i.color }} />
              </span>
              <span className="hidden w-10 text-right text-xs tabular-nums text-muted-foreground sm:block">{Math.round(pct)}%</span>
              <span className="text-right font-medium tabular-nums text-foreground">
                {formatMoney(i.value, currency)}
                <span className="ml-1 text-xs font-normal text-muted-foreground sm:hidden">{Math.round(pct)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
