import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowUpRight, Ban, ChevronRight, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudget, useDeleteBudget, useDeleteBudgetTransfer, useUpdateBudget } from "@/hooks/useBudgets";
import { useAuth } from "@/lib/AuthContext";
import type { BudgetDetail, BudgetTransfer } from "@/types/budgets";
import { formatMoney } from "../Initiatives/format";
import BudgetFormDialog from "./BudgetFormDialog";
import MoveMoneyDialog from "./MoveMoneyDialog";
import NotesThread from "./NotesThread";
import {
  ALL_CHANNELS,
  BUDGET_STATUS_LABELS,
  budgetName,
  formatFullWhen,
  formatWhen,
  fromApiMonth,
  monthName,
  PROGRESS_DOT,
  PROGRESS_LABELS,
  STATUS_PILL,
  usageTone,
} from "./budgetDisplay";

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
      {children}
      {count !== undefined && <span className="text-muted-foreground">{count}</span>}
    </h3>
  );
}

function Figure({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 truncate text-base font-semibold tabular-nums ${tone ?? "text-foreground"}`}>{value}</dd>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Figures({ b }: { b: BudgetDetail }) {
  const money = (n: number) => formatMoney(n, b.currency);
  const tone = usageTone(b.percent_used, b.over_budget);
  const percent = b.percent_used ?? (b.spent > 0 ? 100 : 0);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold tabular-nums">{money(b.spent)}</span>
            <span className="text-muted-foreground"> spent of {money(b.available)}</span>
          </p>
          <span className={`text-xs tabular-nums ${tone.text}`}>{b.percent_used === null ? "" : `${Math.round(b.percent_used)}%`}</span>
        </div>
        <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(Math.max(percent, b.spent > 0 ? 2 : 0), 100)}%` }} />
        </span>
        {b.over_budget && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Over budget by {money(-b.remaining)}.</p>}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 sm:grid-cols-4">
        <Figure label="Approved" value={money(b.amount)} />
        <Figure label="Moved in" value={b.moved_in ? `+${money(b.moved_in)}` : money(0)} />
        <Figure label="Moved out" value={b.moved_out ? `−${money(b.moved_out)}` : money(0)} />
        <Figure label="Available" value={money(b.available)} hint="After money moved" />
        <Figure label="Spent" value={money(b.spent)} hint="Invoiced and paid" />
        <Figure
          label="Expected"
          value={money(b.expected)}
          hint="Incl. estimates"
          tone={b.expected > b.available ? "text-amber-700 dark:text-amber-400" : undefined}
        />
        <Figure label="Remaining" value={money(b.remaining)} tone={b.remaining < 0 ? "text-red-600 dark:text-red-400" : undefined} />
      </dl>
      {b.other_currency.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">Also spent in other currencies, not converted</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {b.other_currency.map((o) => (
              <li key={o.currency} className="tabular-nums">
                {formatMoney(o.spent, o.currency)} spent, {formatMoney(o.expected, o.currency)} expected
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SpendSources({ b }: { b: BudgetDetail }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle count={b.spend.length}>Where the spend comes from</SectionTitle>
      {b.spend.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          No costs count against this budget yet. Costs on {budgetName(b)} initiatives{b.channel_name ? ` in ${b.channel_name}` : ""} dated in{" "}
          {monthName(fromApiMonth(b.month))} will show here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {b.spend.map((s) => (
            <li key={`${s.initiative_id}-${s.currency}`}>
              <Link
                to={s.event_code ? `/events/${s.initiative_id}` : `/initiatives/${s.initiative_id}`}
                className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-2">{s.initiative_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      s.event_code,
                      [s.channel_name, s.sub_channel_name].filter(Boolean).join(" / "),
                      `${s.line_count} ${s.line_count === 1 ? "cost" : "costs"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-medium tabular-nums ${s.currency === b.currency ? "text-foreground" : "text-muted-foreground"}`}>
                    {formatMoney(s.spent, s.currency)}
                  </p>
                  {s.currency !== b.currency ? (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">{s.currency}, not counted</p>
                  ) : (
                    s.expected !== s.spent && <p className="text-[11px] tabular-nums text-muted-foreground">{formatMoney(s.expected, s.currency)} expected</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MoneyMoves({ b, canEdit, onOpenBudget }: { b: BudgetDetail; canEdit: boolean; onOpenBudget: (id: string) => void }) {
  const remove = useDeleteBudgetTransfer();
  const [confirm, setConfirm] = useState<BudgetTransfer | null>(null);
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle count={b.transfers.length}>Money moved</SectionTitle>
      {b.transfers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">No money moved in or out of this budget.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {b.transfers.map((t) => {
            const incoming = t.direction === "IN";
            const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
            return (
              <li key={t.id} className="flex gap-3 px-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm text-foreground">
                      <span className="text-muted-foreground">{incoming ? "From " : "To "}</span>
                      <button type="button" onClick={() => onOpenBudget(t.other_budget_id)} className="text-left underline-offset-2 hover:underline">
                        {t.other_budget_label}
                      </button>
                    </p>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {incoming ? "+" : "−"}
                      {formatMoney(t.amount, b.currency)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">{t.note}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground" title={formatFullWhen(t.created_at)}>
                      {[t.created_by_name, formatWhen(t.created_at)].filter(Boolean).join(" · ")}
                    </p>
                    {canEdit && (
                      <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-red-600" onClick={() => setConfirm(t)}>
                        <Trash2 />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this money move?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm &&
                `${confirm.direction === "IN" ? "+" : "−"}${formatMoney(confirm.amount, b.currency)} ${confirm.direction === "IN" ? "from" : "to"} ${confirm.other_budget_label}. `}
              Both budgets go back to their figures without it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!confirm) return;
                remove.mutate(confirm.id, {
                  onSuccess: () => {
                    toast.success("Money move removed");
                    setConfirm(null);
                  },
                  onError: (err) => {
                    toast.error(err.message || "Could not remove the money move.");
                    setConfirm(null);
                  },
                });
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

interface BudgetDetailSheetProps {
  budgetId: string | null;
  /** Back to the month */
  onClose: () => void;
  /** Open another budget, e.g. the other side of a money move */
  onOpenBudget: (id: string) => void;
}

/** One budget's figures, where its spend comes from, money moved and notes, over the month page */
export default function BudgetDetailSheet({ budgetId, onClose, onOpenBudget }: BudgetDetailSheetProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const { data: budget, isLoading, error } = useBudget(budgetId);
  const update = useUpdateBudget();
  const remove = useDeleteBudget();
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const monthKey = budget ? fromApiMonth(budget.month) : "";
  const cancelled = budget?.status === "CANCELLED";

  const setStatus = (status: "CANCELLED" | "APPROVED") => {
    if (!budget) return;
    update.mutate(
      { budgetId: budget.id, data: { status } },
      {
        onSuccess: () => toast.success(status === "CANCELLED" ? "Budget cancelled" : "Budget restored as Approved"),
        onError: (err) => toast.error(err.message || "Could not change the budget."),
      },
    );
  };

  return (
    <Sheet open={Boolean(budgetId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:lg:max-w-2xl">
        <SheetHeader className="shrink-0 gap-2 border-b border-border px-4 py-3 pr-12 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to {monthKey ? monthName(monthKey) : "the month"}
          </button>
          {budget ? (
            <>
              <SheetTitle className="text-lg font-semibold">{budgetName(budget)}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{budget.channel_name ?? ALL_CHANNELS}</span>
                <span>{budget.currency}</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_PILL[budget.status]}`}>
                  {BUDGET_STATUS_LABELS[budget.status]}
                </span>
                {budget.status === "APPROVED" && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${PROGRESS_DOT[budget.progress]}`} />
                    {PROGRESS_LABELS[budget.progress]}
                  </span>
                )}
              </SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle className="sr-only">Budget</SheetTitle>
              <SheetDescription className="sr-only">Budget details</SheetDescription>
            </>
          )}
          {budget && canEdit && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMoveOpen(true)} disabled={cancelled}>
                <ArrowLeftRight />
                Move money
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {cancelled ? (
                    <DropdownMenuItem onSelect={() => setStatus("APPROVED")}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore as Approved
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => setStatus("CANCELLED")}>
                      <Ban className="mr-2 h-4 w-4" />
                      Cancel budget
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-red-600 focus:text-red-600 dark:text-red-400">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete budget
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 px-4 py-5 sm:px-6">
            {isLoading ? (
              <>
                <Skeleton className="h-44 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </>
            ) : error || !budget ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                Could not load this budget. It may have been deleted.
              </p>
            ) : (
              <>
                {cancelled && (
                  <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                    This budget is cancelled. Costs no longer count against it and it's left out of the month's totals.
                  </p>
                )}
                <Figures b={budget} />
                <SpendSources b={budget} />
                <MoneyMoves b={budget} canEdit={canEdit} onOpenBudget={onOpenBudget} />
                <section className="flex flex-col gap-2">
                  <SectionTitle count={budget.comments.length}>Notes</SectionTitle>
                  <NotesThread
                    target={{ budgetId: budget.id }}
                    comments={budget.comments}
                    placeholder="Add a note about this budget, e.g. why it's over or what's still to come"
                    emptyText="No notes on this budget yet."
                  />
                </section>
                <p className="text-xs text-muted-foreground" title={formatFullWhen(budget.last_update)}>
                  Last update {formatWhen(budget.last_update)}
                  {budget.last_update_by_name ? ` by ${budget.last_update_by_name}` : ""}
                </p>
              </>
            )}
          </div>
        </div>

        {budget && canEdit && (
          <>
            <BudgetFormDialog open={editOpen} onOpenChange={setEditOpen} monthKey={monthKey} budget={budget} />
            <MoveMoneyDialog open={moveOpen} onOpenChange={setMoveOpen} monthKey={monthKey} fromId={budget.id} />
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {budgetName(budget)} for {monthName(monthKey)}, {formatMoney(budget.amount, budget.currency)}. Its notes are deleted too. To keep a record,
                    cancel it instead.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={remove.isPending}>Keep it</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      remove.mutate(budget.id, {
                        onSuccess: () => {
                          toast.success("Budget deleted");
                          setConfirmDelete(false);
                          onClose();
                        },
                        onError: (err) => {
                          toast.error(err.message || "Could not delete the budget.");
                          setConfirmDelete(false);
                        },
                      });
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
