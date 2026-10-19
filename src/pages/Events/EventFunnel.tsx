import type { EventPerformanceTotals } from "@/types/eventPerformance";
import { fmtCount, fmtUnitCost } from "../PaidAds/adsDisplay";
import { conversion } from "./eventPerformanceDisplay";

interface Step {
  key: string;
  label: string;
  /** "per lead" */
  unit: string;
  count: number | null;
  costPer: number | null;
}

const fmtPct = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: n >= 10 ? 0 : 1 })}%`;

/**
 * Visitors → leads → demos → follow-ups → customers as horizontal bars,
 * with what each step cost and how many made it from the step before.
 * Needs CHART_VARS on a wrapper (ChartCard has it).
 */
export default function EventFunnel({ totals, currency }: { totals: EventPerformanceTotals; currency: string }) {
  const steps: Step[] = [
    { key: "visitors", label: "Visitors", unit: "per visitor", count: totals.visitors, costPer: totals.cost_per_visitor },
    { key: "leads", label: "Leads", unit: "per lead", count: totals.leads, costPer: totals.cost_per_lead },
    { key: "demos", label: "Demos", unit: "per demo", count: totals.demos, costPer: totals.cost_per_demo },
    { key: "follow_ups", label: "Follow-ups", unit: "per follow-up", count: totals.follow_ups, costPer: totals.cost_per_follow_up },
    { key: "customers", label: "Customers", unit: "per customer", count: totals.customers, costPer: totals.cost_per_customer },
  ];
  const max = Math.max(1, ...steps.map((s) => s.count ?? 0));

  return (
    <ol className="flex flex-col gap-3.5" aria-label="Event funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1] : null;
        const conv = prev ? conversion(s.count, prev.count) : null;
        const width = s.count ? Math.max((s.count / max) * 100, 1.5) : 0;
        return (
          <li key={s.key} className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[104px_minmax(0,1fr)_auto]">
            <span className="truncate text-sm font-medium text-foreground">{s.label}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="block h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-muted" aria-hidden="true">
                <span className="block h-full rounded-md bg-(--series-1)" style={{ width: `${width}%`, opacity: 1 - i * 0.12 }} />
              </span>
              <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{fmtCount(s.count)}</span>
            </div>
            <span className="col-start-2 truncate text-xs tabular-nums text-muted-foreground sm:col-start-auto sm:w-48 sm:text-right">
              {[s.costPer !== null ? `${fmtUnitCost(s.costPer, currency)} ${s.unit}` : null, conv !== null && prev ? `${fmtPct(conv)} of ${prev.label.toLowerCase()}` : null]
                .filter(Boolean)
                .join(" · ") || "-"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
