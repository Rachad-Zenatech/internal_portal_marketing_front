import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck, Clock, FileCheck2 } from "lucide-react";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetExpenses } from "@/hooks/useBudgets";
import type { ExpenseLine } from "@/types/budgets";
import { formatMoney } from "../Initiatives/format";
import { periodApiDates, periodName, type Period } from "./budgetPeriods";
import { isActual, PROBLEM_LABELS, problemsOf, sourceLabel, type Problem } from "./expenseDisplay";

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function Stat({ icon: Icon, tone, label, lines, hint }: { icon: React.ElementType; tone: string; label: string; lines: ExpenseLine[]; hint: string }) {
  const byCurrency = new Map<string, number>();
  for (const l of lines) byCurrency.set(l.currency, (byCurrency.get(l.currency) ?? 0) + l.amount);
  return (
    <div className={`${DASH_CARD} flex flex-col gap-1 p-4`}>
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className={`h-4 w-4 ${tone}`} />
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums text-foreground">
        {lines.length === 0 ? "None" : [...byCurrency].map(([currency, amount]) => formatMoney(amount, currency)).join(" · ")}
      </p>
      <p className="text-xs text-muted-foreground">
        {lines.length} {lines.length === 1 ? "cost" : "costs"} · {hint}
      </p>
    </div>
  );
}

/**
 * Getting the period's costs ready for Finance: what's reconciled, what's invoiced or paid and ready, what's still
 * waiting for an invoice, and the costs that need sorting out first. Marking costs as reconciled comes next.
 */
export default function ReconciliationTab({ period }: { period: Period }) {
  const dates = periodApiDates(period);
  const { data, isLoading } = useBudgetExpenses(dates.from, dates.to);
  const today = isoToday();
  const lines = useMemo(() => data?.lines ?? [], [data]);
  const reconciled = lines.filter((l) => l.reconciled_month);
  const ready = lines.filter((l) => !l.reconciled_month && isActual(l));
  const waiting = lines.filter((l) => !isActual(l));
  const attention = useMemo(
    () => lines.map((l) => ({ line: l, problems: problemsOf(l, today) })).filter((x) => x.problems.length > 0),
    [lines, today],
  );
  const counts = (Object.keys(PROBLEM_LABELS) as Problem[]).map((p) => ({ problem: p, count: attention.filter((x) => x.problems.includes(p)).length })).filter((c) => c.count > 0);

  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat icon={CircleCheck} tone="text-emerald-600" label="Reconciled" lines={reconciled} hint="signed off by Finance" />
        <Stat icon={FileCheck2} tone="text-blue-600" label="Ready to reconcile" lines={ready} hint="invoiced or paid, not reconciled yet" />
        <Stat icon={Clock} tone="text-amber-600" label="Waiting for invoices" lines={waiting} hint="estimates and commitments" />
      </div>

      <section className={`${DASH_CARD} min-w-0 overflow-hidden`} aria-labelledby="attention-title">
        <div className="flex flex-col gap-1 border-b border-border p-4">
          <h2 id="attention-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CircleAlert className="h-4 w-4 text-amber-600" />
            Needs attention, {periodName(period)} <span className="text-sm font-normal text-muted-foreground">({attention.length})</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {counts.length ? counts.map((c) => `${c.count} ${PROBLEM_LABELS[c.problem].toLowerCase()}`).join(" · ") : "Nothing to sort out before reconciling."}
          </p>
        </div>
        {attention.length > 0 && (
          <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
            {attention.map(({ line: l, problems }) => (
              <li key={l.id} className="flex flex-col gap-1 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="min-w-0">
                  <Link to={`/initiatives/${l.initiative_id}/costs`} className="font-medium text-primary underline-offset-2 hover:underline">
                    {l.initiative_name}
                  </Link>
                  <span className="text-muted-foreground"> · {l.description ?? l.category_name ?? "Cost"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(`${l.incurred_on}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {sourceLabel(l.source)} ·{" "}
                    {problems.map((p) => PROBLEM_LABELS[p]).join("; ")}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">{formatMoney(l.amount, l.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Marking a month's costs as reconciled (and reopening them) comes next. Until then Finance reconciles outside the portal, and reconciled costs show here once they're marked.
      </p>
    </div>
  );
}
