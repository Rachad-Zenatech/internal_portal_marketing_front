import { ArrowDown, ChevronRight, ListOrdered } from "lucide-react";
import { Link } from "react-router-dom";
import type { InitiativeListItem } from "@/types/initiatives";
import type { Performance } from "@/types/performance";
import { Section } from "./detailParts";
import { MUTED } from "./detailStyles";
import { formatMoney } from "./format";
import { EVENT_METRIC_LABELS, formatCount } from "./performanceRules";

/** "Booth visitors" → "booth visitors" mid-sentence, but acronyms like "SQLs" and "MQLs" keep their capitals */
function inSentence(name: string) {
  return /^[A-Z]{2,}/.test(name) ? name : name.toLowerCase();
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className={`text-xs font-medium ${MUTED}`}>{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${tone ?? "text-slate-900 dark:text-zinc-100"}`}>{value}</div>
    </div>
  );
}

/** Visitor → lead → demo → customer: how many at each step, what each one cost, and how many made it from the step before */
export default function CostLadder({ initiative, performance }: { initiative: InitiativeListItem; performance: Performance }) {
  const { ladder, currency } = performance;
  const money = (value: number | null) => (value === null ? "—" : formatMoney(value, currency));
  const isEvent = Boolean(initiative.event_code);
  const label = (code: string, name: string) => (isEvent ? (EVENT_METRIC_LABELS[code] ?? name) : name);
  const roi = performance.roi_percent;

  return (
    <Section title="Cost per outcome" icon={ListOrdered}>
      {ladder.length === 0 ? (
        <p className={`text-sm ${MUTED}`}>
          {performance.cost
            ? "Record results below — visitors, leads, demos, customers — to see what each one cost."
            : "Add costs and record results to see what each outcome cost."}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <ol className="flex flex-col">
            {ladder.map((step, i) => {
              const linkToDemos = step.code === "DEMOS" && performance.demos_from_log;
              const body = (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-zinc-800">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-zinc-100">{label(step.code, step.name)}</div>
                    <div className={`text-xs ${MUTED}`}>
                      {formatCount(step.count)}
                      {linkToDemos && " · from the demo log"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-zinc-100">{money(step.cost_per)}</div>
                      <div className={`text-xs ${MUTED}`}>each</div>
                    </div>
                    {linkToDemos && <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
              );
              return (
                <li key={step.code} className="flex flex-col">
                  {i > 0 && (
                    <div className={`flex items-center gap-2 py-1 pl-5 text-xs ${MUTED}`}>
                      <ArrowDown className="h-3.5 w-3.5" />
                      {step.from_previous !== null && `${step.from_previous}% of ${inSentence(step.previous_name ?? "")}`}
                    </div>
                  )}
                  {linkToDemos ? (
                    <Link to={`/initiatives/${initiative.id}/demos`} className="rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ol>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-zinc-800">
            <Figure label="Total cost" value={money(performance.cost)} />
            <Figure label="Revenue" value={money(performance.revenue)} />
            <Figure
              label="ROI"
              value={roi === null ? "—" : `${roi}%`}
              tone={roi === null ? undefined : roi <= 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}
            />
            <Figure label="Pipeline" value={money(performance.pipeline)} />
          </div>
          {(performance.ctr !== null || performance.cpc !== null) && (
            <p className={`text-xs ${MUTED}`}>
              {performance.ctr !== null && `Click-through ${performance.ctr}%`}
              {performance.cpc !== null && ` · ${money(performance.cpc)} per click`}
              {performance.cpm !== null && ` · ${money(performance.cpm)} per 1,000 impressions`}
            </p>
          )}
        </div>
      )}
      {(performance.costs_excluded.length > 0 || performance.revenue_excluded.length > 0) && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Not included because they're in another currency:{" "}
          {[
            ...performance.costs_excluded.map((c) => `${formatMoney(c.amount, c.currency)} of costs`),
            ...performance.revenue_excluded.map((r) => `${formatMoney(r.amount, r.currency)} of revenue or pipeline`),
          ].join(", ")}
          .
        </p>
      )}
    </Section>
  );
}
