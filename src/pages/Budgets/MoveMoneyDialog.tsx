import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBudgetMonth, useCreateBudgetTransfer } from "@/hooks/useBudgets";
import type { BudgetRow } from "@/types/budgets";
import { Field } from "../Initiatives/SpendLineDialog";
import { formatMoney } from "../Initiatives/format";
import { addMonths, budgetLabel, monthName, toApiMonth } from "./budgetDisplay";

type FieldName = "from" | "to" | "amount" | "note";

/** Money can't move to or from a cancelled budget */
const usable = (rows: BudgetRow[] | undefined) => (rows ?? []).filter((b) => b.status !== "CANCELLED");

interface MonthGroup {
  key: string;
  budgets: BudgetRow[];
}

function BudgetOptions({ groups }: { groups: MonthGroup[] }) {
  return groups
    .filter((g) => g.budgets.length > 0)
    .map((g) => (
      <SelectGroup key={g.key}>
        <SelectLabel>{monthName(g.key)}</SelectLabel>
        {g.budgets.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {budgetLabel(b)} ({formatMoney(b.remaining, b.currency)} left)
          </SelectItem>
        ))}
      </SelectGroup>
    ));
}

interface MoveMoneyFormProps {
  monthKey: string;
  fromId: string;
  onDone: () => void;
}

function MoveMoneyForm({ monthKey, fromId: initialFrom, onDone }: MoveMoneyFormProps) {
  const previousKey = addMonths(monthKey, -1);
  const nextKey = addMonths(monthKey, 1);
  const previous = useBudgetMonth(toApiMonth(previousKey));
  const current = useBudgetMonth(toApiMonth(monthKey));
  const next = useBudgetMonth(toApiMonth(nextKey));
  const create = useCreateBudgetTransfer();

  const [fromId, setFromId] = useState(initialFrom);
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const fromGroups: MonthGroup[] = useMemo(
    () => [
      { key: previousKey, budgets: usable(previous.data?.budgets) },
      { key: monthKey, budgets: usable(current.data?.budgets) },
      { key: nextKey, budgets: usable(next.data?.budgets) },
    ],
    [previousKey, monthKey, nextKey, previous.data, current.data, next.data],
  );
  const from = fromGroups.flatMap((g) => g.budgets).find((b) => b.id === fromId);

  // Money can go to budgets this month or next, in the same currency
  const toGroups: MonthGroup[] = fromGroups
    .slice(1)
    .map((g) => ({ ...g, budgets: g.budgets.filter((b) => b.id !== fromId && (!from || b.currency === from.currency)) }));
  const to = toGroups.flatMap((g) => g.budgets).find((b) => b.id === toId);
  const loading = previous.isLoading || current.isLoading || next.isLoading;
  const noTargets = !loading && toGroups.every((g) => g.budgets.length === 0);

  const clear = (field: FieldName) => {
    setFormError(null);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const problems: Partial<Record<FieldName, string>> = {};
    if (!fromId) problems.from = "Choose where the money comes from.";
    if (!toId) problems.to = "Choose where the money goes.";
    else if (toId === fromId) problems.to = "Choose a different budget.";
    if (amount.trim() === "" || Number.isNaN(Number(amount)) || Number(amount) <= 0) problems.amount = "Enter an amount more than 0.";
    if (!note.trim()) problems.note = "Say why the money is moving.";
    setErrors(problems);
    if (Object.keys(problems).length) return;

    create.mutate(
      { from_budget_id: fromId, to_budget_id: toId, amount: Number(amount), note: note.trim() },
      {
        onSuccess: () => {
          toast.success(`Moved ${formatMoney(Number(amount), from?.currency ?? "USD")}`);
          onDone();
        },
        onError: (err) => setFormError(err.message || "Could not move the money."),
      },
    );
  };

  const over = from && amount && Number(amount) > from.remaining;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Move money</DialogTitle>
        <DialogDescription>
          Carry leftover money into next month, or cover one budget from another. Both budgets must be in the same currency. Nothing moves on its own.
        </DialogDescription>
      </DialogHeader>

      <form id="move-money-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="From" htmlFor="move-from" required error={errors.from}>
          <Select
            value={fromId || undefined}
            onValueChange={(v) => {
              setFromId(v);
              clear("from");
              // A target in another currency no longer fits
              const newFrom = fromGroups.flatMap((g) => g.budgets).find((b) => b.id === v);
              if (to && newFrom && (to.currency !== newFrom.currency || to.id === v)) setToId("");
            }}
          >
            <SelectTrigger id="move-from" className="w-full">
              <SelectValue placeholder={loading ? "Loading budgets" : "Choose a budget"} />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              <BudgetOptions groups={fromGroups} />
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="To"
          htmlFor="move-to"
          required
          error={errors.to}
          hint={noTargets ? `No other ${from?.currency ?? ""} budgets this month or next. Add one first.` : "Budgets this month or next, in the same currency."}
        >
          <Select
            value={toId || undefined}
            onValueChange={(v) => {
              setToId(v);
              clear("to");
            }}
            disabled={noTargets}
          >
            <SelectTrigger id="move-to" className="w-full">
              <SelectValue placeholder="Choose a budget" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              <BudgetOptions groups={toGroups} />
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Amount"
          htmlFor="move-amount"
          required
          error={errors.amount}
          hint={
            over ? (
              <span className="text-amber-700 dark:text-amber-400">More than the {formatMoney(from.remaining, from.currency)} left on this budget.</span>
            ) : from ? (
              `${formatMoney(from.remaining, from.currency)} left on this budget.`
            ) : undefined
          }
        >
          <div className="flex">
            <span className="inline-flex h-8 shrink-0 items-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
              {from?.currency ?? "USD"}
            </span>
            <Input
              id="move-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                clear("amount");
              }}
              placeholder="0.00"
              className="rounded-l-none tabular-nums"
              aria-invalid={Boolean(errors.amount)}
            />
          </div>
        </Field>

        <Field
          label="Reason"
          htmlFor="move-note"
          required
          error={errors.note}
          hint={`For example "Aug leftover carried into September" or "Covering Othership's overspend from TBD/All".`}
        >
          <Textarea
            id="move-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              clear("note");
            }}
            rows={2}
            maxLength={500}
            aria-invalid={Boolean(errors.note)}
          />
        </Field>

        {formError && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {formError}
          </p>
        )}
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={create.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="move-money-form" disabled={create.isPending} className="gap-1.5">
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Move money
        </Button>
      </DialogFooter>
    </>
  );
}

interface MoveMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The month of the budget the money starts from, "YYYY-MM" */
  monthKey: string;
  /** Starts as the "From" budget */
  fromId: string;
}

export default function MoveMoneyDialog({ open, onOpenChange, monthKey, fromId }: MoveMoneyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open && <MoveMoneyForm monthKey={monthKey} fromId={fromId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
