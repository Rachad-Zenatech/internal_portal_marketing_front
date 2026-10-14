import { useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Clock, Lock, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSpendLines, useSpendSummary } from "@/hooks/useSpend";
import type { SpendExpenseTypeSummary, SpendLine, SpendStatus } from "@/types/spend";
import { formatDate, formatMoney, formatMonth, formatVariance, isoToday } from "./format";

const MUTED = "text-slate-500 dark:text-zinc-400";

const STATUS_LABELS: Record<SpendStatus, string> = {
  ESTIMATED: "Estimate",
  COMMITTED: "Committed",
  INVOICED: "Invoiced",
  PAID: "Paid",
};

const STATUS_STYLES: Record<SpendStatus, string> = {
  ESTIMATED: "border-gray-200 bg-gray-100 text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  COMMITTED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  INVOICED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  PAID: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
};

const STATUS_FILTERS: (SpendStatus | "ALL")[] = ["ALL", "ESTIMATED", "COMMITTED", "INVOICED", "PAID"];

const TRAVEL_TYPE = "TRAVEL_ACCOMMODATION";

/** Over the estimate is red, under is green */
function varianceClass(value: number) {
  if (value > 0) return "text-red-600 dark:text-red-400";
  if (value < 0) return "text-green-600 dark:text-green-400";
  return MUTED;
}

function lockMessage(line: SpendLine) {
  if (line.lock_reason === "TRAVEL_FEED") return "From the travel management system — updates automatically";
  if (line.lock_reason === "ADS_IMPORT") return "From an ads import — updates automatically";
  if (line.lock_reason === "RECONCILED" && line.reconciled_month) return `Reconciled for ${formatMonth(line.reconciled_month)}`;
  return null;
}

const isActual = (status: SpendStatus) => status === "INVOICED" || status === "PAID";

// Shared column widths, so every group's table lines up
function Columns() {
  return (
    <colgroup>
      <col className="w-[26%]" />
      <col className="w-[15%]" />
      <col className="w-[10%]" />
      <col className="w-[10%]" />
      <col className="w-[10%]" />
      <col className="w-[11%]" />
      <col className="w-[9%]" />
      <col className="w-[9%]" />
    </colgroup>
  );
}

function LineRow({ line, today }: { line: SpendLine; today: string }) {
  const lock = lockMessage(line);
  const awaitingInvoice = line.status === "COMMITTED" && line.incurred_on < today;
  // Until it's invoiced, a line's amount is its estimate or agreed figure
  const estimate = line.estimated_amount ?? (isActual(line.status) ? null : line.amount);

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="flex items-start gap-1.5">
          {lock && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="mt-0.5 shrink-0 text-slate-400 dark:text-zinc-500" aria-label={lock} tabIndex={0}>
                  <Lock className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>{lock}</TooltipContent>
            </Tooltip>
          )}
          <div className="min-w-0">
            <div className="font-medium text-slate-900 dark:text-zinc-100">{line.description || line.category_name}</div>
            <div className={`text-xs ${MUTED}`}>{line.category_name}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-normal">{line.vendor ?? <span className={MUTED}>—</span>}</TableCell>
      <TableCell className="text-right tabular-nums">
        {estimate === null ? <span className={MUTED}>—</span> : formatMoney(estimate, line.currency)}
      </TableCell>
      <TableCell className="text-right tabular-nums font-medium">
        {isActual(line.status) ? formatMoney(line.amount, line.currency) : <span className={MUTED}>—</span>}
      </TableCell>
      <TableCell className={`text-right tabular-nums ${line.variance === null ? MUTED : varianceClass(line.variance)}`}>
        {line.variance === null ? "—" : formatVariance(line.variance, line.currency)}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={STATUS_STYLES[line.status]}>
          {STATUS_LABELS[line.status]}
        </Badge>
        {awaitingInvoice && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Awaiting invoice
          </div>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs">{line.invoice_ref ?? <span className={`font-sans ${MUTED}`}>—</span>}</TableCell>
      <TableCell className="whitespace-nowrap">{formatDate(line.paid_on) ?? <span className={MUTED}>—</span>}</TableCell>
    </TableRow>
  );
}

interface GroupProps {
  name: string;
  code: string;
  lines: SpendLine[];
  summary: SpendExpenseTypeSummary | undefined;
  currency: string;
  today: string;
}

function ExpenseTypeGroup({ name, code, lines, summary, currency, today }: GroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-slate-200 dark:border-zinc-800">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-slate-50/80 px-4 py-3 text-left hover:bg-slate-100/80 dark:bg-muted dark:hover:bg-zinc-800"
        >
          <span className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "" : "-rotate-90"}`} />
            <span className="font-semibold text-slate-900 dark:text-zinc-100">{name}</span>
            <span className={`text-xs ${MUTED}`}>
              {lines.length} {lines.length === 1 ? "cost" : "costs"}
            </span>
            {code === TRAVEL_TYPE && (
              <Badge variant="outline" className="gap-1 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300">
                <Plane className="h-3 w-3" />
                From the travel system
              </Badge>
            )}
          </span>
          {summary && (
            <span className="flex items-center gap-4 text-sm tabular-nums">
              {summary.variance !== 0 && (
                <span className={varianceClass(summary.variance)} title="Actual vs estimate">
                  {formatVariance(summary.variance, currency)}
                </span>
              )}
              {summary.percent_of_total !== null && <span className={MUTED}>{summary.percent_of_total}%</span>}
              <span className="font-semibold text-slate-900 dark:text-zinc-100">{formatMoney(summary.expected_total, currency)}</span>
            </span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Wide table scrolls inside the card on narrow screens; the header above stays full width */}
        <Table className="min-w-[820px] table-fixed" containerClassName="w-full overflow-x-auto">
          <Columns />
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Estimate</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Paid on</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <LineRow key={line.id} line={line} today={today} />
            ))}
          </TableBody>
        </Table>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className={`text-xs ${MUTED}`}>{label}</div>
      <div className={`tabular-nums ${strong ? "text-base font-semibold text-slate-900 dark:text-zinc-100" : "text-sm font-medium text-slate-900 dark:text-zinc-100"}`}>
        {value}
      </div>
    </div>
  );
}

function LoadingSheet() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading costs">
      <Skeleton className="h-8 w-72" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

interface CostSheetProps {
  initiativeId: string;
  /** The initiative's currency; totals are in it */
  currency: string;
  isEvent: boolean;
}

export default function CostSheet({ initiativeId, currency, isEvent }: CostSheetProps) {
  const lines = useSpendLines(initiativeId);
  const summary = useSpendSummary(initiativeId);
  const [filter, setFilter] = useState<SpendStatus | "ALL">("ALL");
  const today = isoToday();

  // Lines arrive ordered by expense type, category and date; keep that order within each group
  const groups = useMemo(() => {
    const visible = (lines.data ?? []).filter((line) => filter === "ALL" || line.status === filter);
    const byType = new Map<number, { name: string; code: string; lines: SpendLine[] }>();
    for (const line of visible) {
      const group = byType.get(line.expense_type_id) ?? { name: line.expense_type_name, code: line.expense_type_code, lines: [] };
      group.lines.push(line);
      byType.set(line.expense_type_id, group);
    }
    return [...byType.entries()];
  }, [lines.data, filter]);

  if (lines.isPending || summary.isPending) return <LoadingSheet />;

  if (lines.isError || summary.isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/30">
        <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          Could not load the costs.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void lines.refetch();
            void summary.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (lines.data.length === 0) {
    return (
      <p className={`rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm dark:border-zinc-800 ${MUTED}`}>
        {isEvent
          ? "No costs yet. Add the booth space, build, show services, badges and materials as you book them — start with estimates if you only have quotes."
          : "No costs yet."}
      </p>
    );
  }

  const totals = summary.data.totals;
  const typeSummaries = new Map(summary.data.by_expense_type.map((t) => [t.expense_type_id, t]));
  const counts = lines.data.reduce<Record<string, number>>((acc, line) => ({ ...acc, [line.status]: (acc[line.status] ?? 0) + 1 }), {});

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter costs by status">
          {STATUS_FILTERS.map((value) => {
            const active = filter === value;
            const count = value === "ALL" ? lines.data.length : counts[value] ?? 0;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50/80 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {value === "ALL" ? "All" : STATUS_LABELS[value]} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {groups.length === 0 ? (
          <p className={`py-4 text-center text-sm ${MUTED}`}>No costs with this status.</p>
        ) : (
          groups.map(([typeId, group]) => (
            <ExpenseTypeGroup
              key={typeId}
              name={group.name}
              code={group.code}
              lines={group.lines}
              summary={typeSummaries.get(typeId)}
              currency={currency}
              today={today}
            />
          ))
        )}

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
          <Total label="Expected total" value={formatMoney(totals.expected_total, currency)} strong />
          <Total label="Committed" value={formatMoney(totals.committed, currency)} />
          <Total label="Actual" value={formatMoney(totals.actual, currency)} />
          <Total label="Paid" value={formatMoney(totals.paid, currency)} />
          {summary.data.mixed_currencies && (
            <p className={`text-xs ${MUTED}`}>
              Not included above:{" "}
              {summary.data.other_currencies.map((c) => formatMoney(c.expected_total, c.currency)).join(", ")} in other currencies.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
