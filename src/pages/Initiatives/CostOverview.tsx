import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Plane, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSpendSummary } from "@/hooks/useSpend";
import type { InitiativeListItem } from "@/types/initiatives";
import type { SpendSummary } from "@/types/spend";
import { Section } from "./detailParts";
import { MUTED } from "./detailStyles";
import { formatMoney } from "./format";

// One hue, three steps (validated light → dark against each surface): invoiced or paid is the strongest,
// committed lighter, still-estimated lightest and striped, so the states read without colour alone.
const ACTUAL = "bg-indigo-800 dark:bg-indigo-300";
const COMMITTED = "bg-indigo-600 dark:bg-indigo-500";
const ESTIMATED = "bg-indigo-400 dark:bg-indigo-700";
const STRIPES = { backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0 3px, transparent 3px 7px)" };
// Expense type bars: one series, one hue
const TYPE_BAR = "bg-indigo-600 dark:bg-indigo-400";

/** Expected vs budget as a status: ≥ 90% is a warning, over 100% is over budget */
function budgetStatus(percent: number | null) {
  if (percent === null) return null;
  if (percent > 100) return { icon: AlertCircle, label: "Over budget", text: "text-red-600 dark:text-red-400" };
  if (percent >= 90) return { icon: AlertTriangle, label: "Close to budget", text: "text-amber-600 dark:text-amber-400" };
  return { icon: CheckCircle2, label: "Within budget", text: "text-green-600 dark:text-green-400" };
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-zinc-800">
      <div className={`text-xs ${MUTED}`}>{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-zinc-100">{value}</div>
      <div className={`text-xs ${MUTED}`}>{hint}</div>
    </div>
  );
}

/** Invoiced or paid, committed, and still-estimated costs stacked against the budget, with a marker at 100% */
function BudgetBar({ summary }: { summary: SpendSummary }) {
  const { totals, budget_amount: budget, budget_currency: currency } = summary;
  const actual = Math.max(totals.actual, 0);
  const committedOnly = Math.max(totals.committed - totals.actual, 0);
  const estimated = Math.max(totals.still_estimated, 0);
  // The bar is as long as the budget or the expected total, whichever is bigger
  const scale = Math.max(budget ?? 0, actual + committedOnly + estimated, 1);
  const segments = [
    { key: "actual", label: "Invoiced or paid", value: actual, className: ACTUAL, style: undefined },
    { key: "committed", label: "Committed, not yet invoiced", value: committedOnly, className: COMMITTED, style: undefined },
    { key: "estimated", label: "Still estimated", value: estimated, className: ESTIMATED, style: STRIPES },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <div className="relative">
        <div className="flex h-4 gap-[2px] overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800" role="img" aria-label="Costs against the budget">
          {segments.map((s) => (
            <Tooltip key={s.key}>
              <TooltipTrigger asChild>
                <div className={`h-full first:rounded-l-full last:rounded-r-full ${s.className}`} style={{ width: `${(s.value / scale) * 100}%`, ...s.style }} />
              </TooltipTrigger>
              <TooltipContent>
                {s.label}: {formatMoney(s.value, currency)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {budget !== null && budget > 0 && (
          <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-slate-900 dark:bg-zinc-100" style={{ left: `calc(${(budget / scale) * 100}% - 1px)` }} title={`Budget ${formatMoney(budget, currency)}`} />
        )}
      </div>
      <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${MUTED}`}>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${ACTUAL}`} /> Invoiced or paid
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${COMMITTED}`} /> Committed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${ESTIMATED}`} style={STRIPES} /> Still estimated
        </span>
        {budget !== null && budget > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded bg-slate-900 dark:bg-zinc-100" /> Budget
          </span>
        )}
      </div>
    </div>
  );
}

function ExpenseTypeBars({ summary, initiativeId }: { summary: SpendSummary; initiativeId: string }) {
  const types = [...summary.by_expense_type].sort((a, b) => b.expected_total - a.expected_total);
  const largest = Math.max(...types.map((t) => t.expected_total), 1);
  return (
    <ul className="flex flex-col gap-1">
      {types.map((t) => (
        <li key={t.expense_type_id}>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Opens the cost sheet at this group */}
              <Link
                to={`/initiatives/${initiativeId}/costs?group=${t.code}`}
                className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50/80 dark:hover:bg-zinc-800/60"
              >
                <span className="flex items-center gap-1.5 truncate text-sm text-slate-700 dark:text-zinc-300">
                  {t.source === "TRAVEL_SYSTEM" && <Plane className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="From the travel system" />}
                  {t.name}
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                  <span className={`block h-full rounded-full ${TYPE_BAR}`} style={{ width: `${Math.max((t.expected_total / largest) * 100, 1)}%` }} />
                </span>
                <span className="w-32 text-right text-sm tabular-nums text-slate-900 dark:text-zinc-100">
                  {formatMoney(t.expected_total, summary.budget_currency)}
                  <span className={`ml-2 text-xs ${MUTED}`}>{t.percent_of_total ?? 0}%</span>
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              {t.name}: committed {formatMoney(t.committed, summary.budget_currency)}, invoiced or paid {formatMoney(t.actual, summary.budget_currency)}
              {t.estimated > 0 && `, still estimated ${formatMoney(t.estimated, summary.budget_currency)}`}
            </TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}

const percentText = (value: number | null) => (value === null ? null : `${Math.round(value)}%`);

/** Where an initiative's costs will land: expected total (estimates included) against the budget, and by expense type */
export default function CostOverview({ initiative }: { initiative: InitiativeListItem }) {
  const { data: summary, isPending, isError, refetch } = useSpendSummary(initiative.id);
  const costsLink = `/initiatives/${initiative.id}/costs`;

  if (isPending) {
    return (
      <Section title="Costs against budget" icon={Receipt}>
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading costs">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Section>
    );
  }
  if (isError) {
    return (
      <Section title="Costs against budget" icon={Receipt}>
        <div className="flex items-center gap-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          Could not load the costs.
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </Section>
    );
  }

  const { totals, budget_amount: budget, budget_currency: currency } = summary;
  const money = (value: number) => formatMoney(value, currency);
  const status = budgetStatus(totals.percent_expected);
  const StatusIcon = status?.icon;
  const noCosts = totals.expected_total === 0 && summary.by_expense_type.length === 0;

  return (
    <TooltipProvider delayDuration={150}>
      <Section
        title="Costs against budget"
        icon={Receipt}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to={costsLink}>Open cost sheet</Link>
          </Button>
        }
      >
        {noCosts ? (
          <p className={`text-sm ${MUTED}`}>
            No costs yet. <Link to={costsLink} className="text-blue-600 hover:underline dark:text-blue-400">Add them on the cost sheet</Link>, starting with
            estimates, to see where this {initiative.event_code ? "event" : "initiative"} will land against its budget.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Headline: the full expected cost, estimates included, against the budget */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className={`text-xs font-medium ${MUTED}`}>Expected total</div>
                <div className="text-3xl font-bold tabular-nums text-slate-900 dark:text-zinc-100">
                  {money(totals.expected_total)}
                  <span className={`ml-2 text-base font-normal ${MUTED}`}>{budget !== null ? `of ${money(budget)} budget` : "· no budget set"}</span>
                </div>
                {totals.forecast_remaining !== null && status && StatusIcon && (
                  <p className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${totals.forecast_remaining < 0 ? status.text : "text-slate-700 dark:text-zinc-300"}`}>
                    <StatusIcon className={`h-4 w-4 ${status.text}`} aria-label={status.label} />
                    {totals.forecast_remaining < 0
                      ? `Over budget by ${money(-totals.forecast_remaining)} if the estimates hold`
                      : `${money(totals.forecast_remaining)} left if the estimates hold`}
                  </p>
                )}
              </div>
              {(summary.per_day !== null || summary.per_sqm !== null) && (
                <div className="flex gap-6 text-right">
                  {summary.per_day !== null && (
                    <div>
                      <div className={`text-xs font-medium ${MUTED}`}>Cost per day</div>
                      <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-zinc-100">{money(summary.per_day)}</div>
                    </div>
                  )}
                  {summary.per_sqm !== null && (
                    <div>
                      <div className={`text-xs font-medium ${MUTED}`}>Cost per m²</div>
                      <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-zinc-100">{money(summary.per_sqm)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <BudgetBar summary={summary} />
              {totals.percent_expected !== null && (
                <p className="mt-2 text-sm text-slate-700 dark:text-zinc-300">
                  <span className={`font-semibold ${status?.text ?? ""}`}>Expected {percentText(totals.percent_expected)}</span>
                  {" · "}committed {percentText(totals.percent_committed)}
                  {" · "}invoiced or paid {percentText(totals.percent_actual)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label="Committed" value={money(totals.committed)} hint="Ordered, invoiced or paid" />
              <Tile label="Actual" value={money(totals.actual)} hint="Invoiced or paid" />
              <Tile label="Paid" value={money(totals.paid)} hint="Paid out" />
              <Tile label="Still estimated" value={money(totals.still_estimated)} hint="Quotes and planned figures" />
            </div>

            <div className={`flex flex-col gap-1.5 text-sm ${MUTED}`}>
              {totals.awaiting_invoice.count > 0 && (
                <Link
                  to={`${costsLink}?awaiting=1`}
                  className="inline-flex w-fit items-center gap-1.5 font-medium text-amber-700 hover:underline dark:text-amber-400"
                >
                  <Clock className="h-4 w-4" />
                  {totals.awaiting_invoice.count} {totals.awaiting_invoice.count === 1 ? "cost" : "costs"} awaiting invoice ({money(totals.awaiting_invoice.amount)})
                </Link>
              )}
              <span>
                Supplier costs <span className="font-medium text-slate-900 dark:text-zinc-100">{money(summary.by_source.supplier)}</span>
                {" · "}Travel <span className="font-medium text-slate-900 dark:text-zinc-100">{money(summary.by_source.travel)}</span> (from the travel system)
              </span>
              {summary.mixed_currencies && (
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  {summary.other_currencies.map((c) => `${c.currency} ${c.expected_total.toLocaleString()}`).join(", ")}{" "}
                  {summary.other_currencies.length === 1 ? "isn't" : "aren't"} included, because amounts in other currencies aren't converted.
                </span>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">By expense type</h4>
              <ExpenseTypeBars summary={summary} initiativeId={initiative.id} />
            </div>
          </div>
        )}
      </Section>
    </TooltipProvider>
  );
}
