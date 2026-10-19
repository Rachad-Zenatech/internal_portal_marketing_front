import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetMonth } from "@/hooks/useBudgets";
import type { BudgetPeriod, BudgetStatus } from "@/types/budgets";
import { formatMoney } from "../Initiatives/format";
import { ALL_CHANNELS, BUDGET_STATUS_LABELS, BUDGET_STATUSES, formatWhen, monthName, STATUS_PILL, TBD_ALL, toApiMonth } from "./budgetDisplay";
import { periodName, type Period } from "./budgetPeriods";
import NotesThread from "./NotesThread";

const monthShort = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });

interface ApprovedBudgetsTabProps {
  period: Period;
  data: BudgetPeriod | undefined;
  loading: boolean;
  onOpenBudget: (id: string) => void;
  /** Add, copy and upload buttons from the page */
  actions: React.ReactNode;
}

/**
 * What was approved, separate from what was spent: each budget's approved amount, money moved in or out (the
 * adjustments), what's available, its approval status and when it last changed. Open one for its history and notes.
 */
export default function ApprovedBudgetsTab({ period, data, loading, onOpenBudget, actions }: ApprovedBudgetsTabProps) {
  const [status, setStatus] = useState<BudgetStatus | "ALL">("ALL");
  const monthKey = period.kind === "month" ? period.first : null;
  const month = useBudgetMonth(toApiMonth(monthKey ?? period.first));
  const budgets = [...(data?.budgets ?? [])]
    .filter((b) => status === "ALL" || b.status === status)
    .sort((a, b) => a.month.localeCompare(b.month) || a.market_name.localeCompare(b.market_name) || (a.brand_name ?? "").localeCompare(b.brand_name ?? ""));
  const counts = Object.fromEntries(BUDGET_STATUSES.map((s) => [s, (data?.budgets ?? []).filter((b) => b.status === s).length])) as Record<BudgetStatus, number>;
  const cell = "px-3 py-2.5 align-middle";

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <section className={`${DASH_CARD} min-w-0 overflow-hidden`} aria-labelledby="approved-title">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 id="approved-title" className="text-base font-semibold text-foreground">
              Approved budgets, {periodName(period)}
            </h2>
            <p className="text-sm text-muted-foreground">Approved amounts and their adjustments. Spending is on the Budget Tracker.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5 text-sm" role="group" aria-label="Status">
              {(["ALL", ...BUDGET_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${status === s ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s === "ALL" ? "All" : BUDGET_STATUS_LABELS[s]}
                  {s !== "ALL" && <span className="ml-1 text-xs tabular-nums text-muted-foreground">{counts[s]}</span>}
                </button>
              ))}
            </div>
            {actions}
          </div>
        </div>
        {loading ? (
          <Skeleton className="m-4 h-60" />
        ) : budgets.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No budgets in {periodName(period)}{status !== "ALL" ? ` with this status` : ""}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  {["Month", "Brand", "Region", "Channel"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium">
                      {h}
                    </th>
                  ))}
                  {["Approved", "Adjustments", "Available"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-right font-medium">
                      {h}
                    </th>
                  ))}
                  {["Status", "Notes", "Last update"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {budgets.map((b) => {
                  const net = b.moved_in - b.moved_out;
                  return (
                    <tr key={b.id} onClick={() => onOpenBudget(b.id)} className="cursor-pointer transition-colors hover:bg-muted/40">
                      <td className={`${cell} whitespace-nowrap`}>{monthShort(b.month)}</td>
                      <td className={cell}>{b.brand_name ?? <span className="text-muted-foreground">{TBD_ALL}</span>}</td>
                      <td className={cell}>{b.market_name}</td>
                      <td className={cell}>{b.channel_name ?? <span className="text-muted-foreground">{ALL_CHANNELS}</span>}</td>
                      <td className={`${cell} text-right tabular-nums`}>{formatMoney(b.amount, b.currency)}</td>
                      <td className={`${cell} text-right tabular-nums`} title={`Moved in ${formatMoney(b.moved_in, b.currency)}, moved out ${formatMoney(b.moved_out, b.currency)}`}>
                        {net === 0 ? <span className="text-muted-foreground">-</span> : <span className={net > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>{`${net > 0 ? "+" : "−"}${formatMoney(Math.abs(net), b.currency)}`}</span>}
                      </td>
                      <td className={`${cell} text-right font-medium tabular-nums`}>{formatMoney(b.available, b.currency)}</td>
                      <td className={cell}>
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_PILL[b.status]}`}>{BUDGET_STATUS_LABELS[b.status]}</span>
                      </td>
                      <td className={`${cell} max-w-64`}>
                        {b.latest_comment ? (
                          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground" title={b.latest_comment.body}>
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{b.latest_comment.body}</span>
                            {b.comment_count > 1 && <span className="shrink-0">+{b.comment_count - 1}</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className={`${cell} whitespace-nowrap text-xs text-muted-foreground`}>
                        {formatWhen(b.last_update)}
                        {b.last_update_by_name && <span className="block">{b.last_update_by_name}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {monthKey && (
        <section className={`${DASH_CARD} flex flex-col gap-3 p-4`} aria-labelledby="month-notes-title">
          <div>
            <h2 id="month-notes-title" className="text-base font-semibold text-foreground">
              Notes for {monthName(monthKey)}
            </h2>
            <p className="text-xs text-muted-foreground">For the month as a whole, e.g. decisions from the budget meeting. Notes on one budget go on that budget.</p>
          </div>
          <NotesThread
            key={monthKey}
            target={{ month: toApiMonth(monthKey) }}
            comments={month.data?.notes ?? []}
            placeholder={`Add a note for ${monthName(monthKey)}`}
            emptyText={`No notes for ${monthName(monthKey)} yet.`}
          />
        </section>
      )}
    </div>
  );
}
