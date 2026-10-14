import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Calculator, ChevronDown, Clock, FileUp, Lock, Plane, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSpendLines, useSpendSummary } from "@/hooks/useSpend";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeListItem } from "@/types/initiatives";
import type { SpendExpenseTypeSummary, SpendLine, SpendStatus } from "@/types/spend";
import { formatDate, formatMoney, formatMonth, formatVariance, isoToday } from "./format";
import CostSheetUpload from "./CostSheetUpload";
import SpendLineActions from "./SpendLineActions";
import SpendLineDialog from "./SpendLineDialog";
import StaffTimeDialog from "./StaffTimeDialog";
import { isActualStatus, SPEND_STATUS_LABELS, SPEND_STATUS_STYLES } from "./spendRules";

const MUTED = "text-slate-500 dark:text-zinc-400";

// "AWAITING" = committed costs whose date has passed, so their invoice is probably late
type CostFilter = SpendStatus | "ALL" | "AWAITING";
const STATUS_FILTERS: CostFilter[] = ["ALL", "ESTIMATED", "COMMITTED", "INVOICED", "PAID", "AWAITING"];
const FILTER_LABELS: Record<CostFilter, string> = { ...SPEND_STATUS_LABELS, ALL: "All", AWAITING: "Awaiting invoice" };

const isAwaitingInvoice = (line: SpendLine, today: string) => line.status === "COMMITTED" && line.incurred_on < today;

/** The filter a link asked for: ?awaiting=1 or ?status=PAID */
function filterFromParams(params: URLSearchParams): CostFilter {
  if (params.get("awaiting") === "1") return "AWAITING";
  const status = params.get("status");
  return status && status in SPEND_STATUS_LABELS ? (status as SpendStatus) : "ALL";
}

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

// Which columns show depends on the cost sheet's own width (container queries), so the table never scrolls
// sideways: details of hidden columns move under the item, the status or the actual amount instead.
const COLUMNS = {
  vendor: "hidden w-[13%] @3xl:table-cell",
  estimate: "hidden w-[10%] @xl:table-cell",
  // Fixed widths while space is tight, so amounts and status chips never squash
  actual: "w-20 @xl:w-[10%]",
  variance: "hidden w-[8%] @5xl:table-cell",
  status: "hidden w-24 @md:table-cell @2xl:w-[13%]",
  invoice: "hidden w-[10%] @4xl:table-cell",
  paidOn: "hidden w-[10%] @7xl:table-cell",
  actions: "w-16 @7xl:w-36",
};

function LineRow({ line, today, actions }: { line: SpendLine; today: string; actions?: React.ReactNode }) {
  const lock = lockMessage(line);
  const awaitingInvoice = isAwaitingInvoice(line, today);
  // Until it's invoiced, a line's amount is its estimate or agreed figure
  const estimate = line.estimated_amount ?? (isActualStatus(line.status) ? null : line.amount);

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
          <div className="min-w-0 break-words">
            <div className="font-medium text-slate-900 dark:text-zinc-100">
              {line.description || line.category_name}
              {line.source === "STAFF_CALCULATOR" && (
                <Badge variant="outline" className="ml-1.5 h-4 px-1.5 align-middle text-[10px] font-medium text-indigo-700 dark:text-indigo-300" title="Worked out with Add staff time">
                  Calculated
                </Badge>
              )}
            </div>
            <div className={`text-xs ${MUTED}`}>{line.category_name}</div>
            {/* What the hidden columns would show, at narrower widths */}
            <div className={`flex flex-wrap gap-x-3 text-xs ${MUTED}`}>
              {line.vendor && <span className="@3xl:hidden">{line.vendor}</span>}
              {line.invoice_ref && <span className="font-mono @4xl:hidden">{line.invoice_ref}</span>}
              {estimate !== null && <span className="tabular-nums @xl:hidden">Est. {formatMoney(estimate, line.currency)}</span>}
            </div>
            {/* Phone widths: the status sits under the item instead of in its own column */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 @md:hidden">
              <Badge variant="outline" className={SPEND_STATUS_STYLES[line.status]}>
                {SPEND_STATUS_LABELS[line.status]}
              </Badge>
              {awaitingInvoice && <span className="text-[11px] text-amber-600 dark:text-amber-400">Awaiting invoice</span>}
              {line.paid_on && <span className={`text-[11px] ${MUTED}`}>on {formatDate(line.paid_on)}</span>}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className={`whitespace-normal break-words ${COLUMNS.vendor}`}>{line.vendor ?? <span className={MUTED}>—</span>}</TableCell>
      <TableCell className={`text-right tabular-nums ${COLUMNS.estimate}`}>
        {estimate === null ? <span className={MUTED}>—</span> : formatMoney(estimate, line.currency)}
      </TableCell>
      <TableCell className="text-right tabular-nums font-medium">
        {isActualStatus(line.status) ? formatMoney(line.amount, line.currency) : <span className={MUTED}>—</span>}
        {line.variance !== null && line.variance !== 0 && (
          <div className={`text-xs font-normal @5xl:hidden ${varianceClass(line.variance)}`}>{formatVariance(line.variance, line.currency)}</div>
        )}
      </TableCell>
      <TableCell className={`text-right tabular-nums ${COLUMNS.variance} ${line.variance === null ? MUTED : varianceClass(line.variance)}`}>
        {line.variance === null ? "—" : formatVariance(line.variance, line.currency)}
      </TableCell>
      <TableCell className={COLUMNS.status}>
        <Badge variant="outline" className={SPEND_STATUS_STYLES[line.status]}>
          {SPEND_STATUS_LABELS[line.status]}
        </Badge>
        {awaitingInvoice && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Awaiting invoice
          </div>
        )}
        {line.paid_on && <div className={`mt-1 text-[11px] @7xl:hidden ${MUTED}`}>on {formatDate(line.paid_on)}</div>}
      </TableCell>
      <TableCell className={`break-all font-mono text-xs ${COLUMNS.invoice}`}>{line.invoice_ref ?? <span className={`font-sans ${MUTED}`}>—</span>}</TableCell>
      <TableCell className={COLUMNS.paidOn}>{formatDate(line.paid_on) ?? <span className={MUTED}>—</span>}</TableCell>
      {actions !== undefined && <TableCell className="px-1">{actions}</TableCell>}
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
  /** Row actions for people who can edit; leave out for view only */
  renderActions?: (line: SpendLine) => React.ReactNode;
  /** Opened from a link to this group: outlined so it's easy to spot */
  highlighted?: boolean;
}

function ExpenseTypeGroup({ name, code, lines, summary, currency, today, renderActions, highlighted }: GroupProps) {
  const canEdit = Boolean(renderActions);
  const [open, setOpen] = useState(true);

  return (
    <Collapsible
      id={`cost-group-${code}`}
      open={open}
      onOpenChange={setOpen}
      className={`scroll-mt-20 rounded-lg border ${highlighted ? "border-indigo-400 ring-2 ring-indigo-200 dark:border-indigo-500 dark:ring-indigo-900" : "border-slate-200 dark:border-zinc-800"}`}
    >
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
        <Table className="table-fixed" containerClassName="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className={COLUMNS.vendor}>Vendor</TableHead>
              <TableHead className={`text-right ${COLUMNS.estimate}`}>Estimate</TableHead>
              <TableHead className={`text-right ${COLUMNS.actual}`}>Actual</TableHead>
              <TableHead className={`text-right ${COLUMNS.variance}`}>Variance</TableHead>
              <TableHead className={COLUMNS.status}>Status</TableHead>
              <TableHead className={COLUMNS.invoice}>Invoice #</TableHead>
              <TableHead className={COLUMNS.paidOn}>Paid on</TableHead>
              {canEdit && (
                <TableHead className={COLUMNS.actions}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <LineRow key={line.id} line={line} today={today} actions={renderActions ? renderActions(line) : undefined} />
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
  /** Totals are in the initiative's currency */
  initiative: InitiativeListItem;
}

export default function CostSheet({ initiative }: CostSheetProps) {
  const { id: initiativeId, currency } = initiative;
  const isEvent = Boolean(initiative.event_code);
  const lines = useSpendLines(initiativeId);
  const summary = useSpendSummary(initiativeId);
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  // Links from the Performance page can pre-filter (?awaiting=1, ?status=) or point at a group (?group=CODE)
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<CostFilter>(() => filterFromParams(params));
  const focusGroup = params.get("group");
  // The add / edit dialog: open, and the cost being edited (none when adding)
  const [dialog, setDialog] = useState<{ open: boolean; line?: SpendLine }>({ open: false });
  const [staffTimeOpen, setStaffTimeOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const today = isoToday();

  // Lines arrive ordered by expense type, category and date; keep that order within each group
  const groups = useMemo(() => {
    const visible = (lines.data ?? []).filter(
      (line) => filter === "ALL" || (filter === "AWAITING" ? isAwaitingInvoice(line, today) : line.status === filter),
    );
    const byType = new Map<number, { name: string; code: string; lines: SpendLine[] }>();
    for (const line of visible) {
      const group = byType.get(line.expense_type_id) ?? { name: line.expense_type_name, code: line.expense_type_code, lines: [] };
      group.lines.push(line);
      byType.set(line.expense_type_id, group);
    }
    return [...byType.entries()];
  }, [lines.data, filter, today]);

  // Bring the linked group into view once the costs have loaded
  const loaded = Boolean(lines.data && summary.data);
  useEffect(() => {
    if (focusGroup && loaded) document.getElementById(`cost-group-${focusGroup}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusGroup, loaded]);

  // Vendors already on this initiative, suggested when typing a new one
  const vendors = useMemo(
    () => [...new Set((lines.data ?? []).map((line) => line.vendor).filter((v): v is string => Boolean(v)))].sort(),
    [lines.data],
  );

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

  const addButton = canEdit && (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setUploadOpen(true)}>
        <FileUp className="h-4 w-4" />
        Upload cost sheet
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStaffTimeOpen(true)}>
        <Calculator className="h-4 w-4" />
        Add staff time
      </Button>
      <Button size="sm" className="gap-1.5" onClick={() => setDialog({ open: true })}>
        <Plus className="h-4 w-4" />
        Add cost
      </Button>
    </div>
  );
  const costDialog = canEdit && (
    <SpendLineDialog
      open={dialog.open}
      onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
      initiative={initiative}
      line={dialog.line}
      vendors={vendors}
    />
  );
  // Rendered in the same place whether the sheet is empty or not, so an open dialog isn't rebuilt (and its
  // "saved" step lost) when the first costs arrive
  const dialogs = canEdit && (
    <>
      {costDialog}
      <StaffTimeDialog open={staffTimeOpen} onOpenChange={setStaffTimeOpen} initiative={initiative} />
      <CostSheetUpload open={uploadOpen} onOpenChange={setUploadOpen} initiative={initiative} />
    </>
  );

  if (lines.data.length === 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-200 p-6 text-center dark:border-zinc-800">
          <p className={`text-sm ${MUTED}`}>
            {isEvent
              ? "No costs yet. Add the booth space, build, show services, badges and materials as you book them — start with estimates if you only have quotes."
              : "No costs yet."}
          </p>
          {addButton}
        </div>
        {dialogs}
      </TooltipProvider>
    );
  }

  const totals = summary.data.totals;
  const typeSummaries = new Map(summary.data.by_expense_type.map((t) => [t.expense_type_id, t]));
  const counts = lines.data.reduce<Record<string, number>>((acc, line) => ({ ...acc, [line.status]: (acc[line.status] ?? 0) + 1 }), {});
  counts.ALL = lines.data.length;
  counts.AWAITING = lines.data.filter((line) => isAwaitingInvoice(line, today)).length;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="@container flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter costs by status">
            {STATUS_FILTERS.map((value) => {
              const active = filter === value;
              const count = counts[value] ?? 0;
              // Only offer "Awaiting invoice" when there is something late
              if (value === "AWAITING" && count === 0 && !active) return null;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(value);
                    // The chips take over from whatever the link asked for
                    if (params.size) setParams({}, { replace: true });
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50/80 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {FILTER_LABELS[value]} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
          {addButton}
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
              highlighted={group.code === focusGroup}
              renderActions={
                canEdit ? (line) => <SpendLineActions line={line} initiativeId={initiativeId} onEdit={(l) => setDialog({ open: true, line: l })} /> : undefined
              }
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
      {dialogs}
    </TooltipProvider>
  );
}
