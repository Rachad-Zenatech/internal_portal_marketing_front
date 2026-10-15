import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBudget, useUpdateBudget } from "@/hooks/useBudgets";
import { useReferenceData } from "@/hooks/useReferenceData";
import type { BudgetRow, BudgetStatus, BudgetUpdate } from "@/types/budgets";
import { Field } from "../Initiatives/SpendLineDialog";
import { formatMoney } from "../Initiatives/format";
import { addMonths, ALL_CHANNELS, BUDGET_STATUS_LABELS, BUDGET_STATUSES, CURRENCIES, fromApiMonth, monthName, TBD_ALL, toApiMonth } from "./budgetDisplay";

const NONE = "none";

/** Values to start a new budget with, e.g. from "Spend without a budget" */
export interface BudgetPreset {
  brand_id: number | null;
  market_id: number;
  channel_id: number | null;
  currency: string;
  /** Shown as a hint under the amount */
  expected?: number;
}

interface FormState {
  month: string;
  marketId: string;
  brandId: string;
  channelId: string;
  amount: string;
  currency: string;
  status: BudgetStatus;
}

type FieldName = "month" | "marketId" | "amount" | "currency";

const idText = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const toId = (value: string) => (value ? Number(value) : null);

function validate(form: FormState): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!form.month) errors.month = "Choose a month.";
  if (!form.marketId) errors.marketId = "Choose a market.";
  if (form.amount.trim() === "" || Number.isNaN(Number(form.amount))) errors.amount = "Enter the approved amount.";
  else if (Number(form.amount) < 0) errors.amount = "Amount must be 0 or more.";
  if (!form.currency) errors.currency = "Choose a currency.";
  return errors;
}

interface BudgetFormProps {
  monthKey: string;
  budget?: BudgetRow;
  preset?: BudgetPreset;
  onDone: () => void;
}

function BudgetForm({ monthKey, budget, preset, onDone }: BudgetFormProps) {
  const isEdit = Boolean(budget);
  const { data: reference } = useReferenceData();
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const pending = create.isPending || update.isPending;

  const [form, setForm] = useState<FormState>(() =>
    budget
      ? {
          month: fromApiMonth(budget.month),
          marketId: String(budget.market_id),
          brandId: idText(budget.brand_id),
          channelId: idText(budget.channel_id),
          amount: String(budget.amount),
          currency: budget.currency,
          status: budget.status,
        }
      : {
          month: monthKey,
          marketId: idText(preset?.market_id),
          // Spend from an initiative whose brand is "TBD/All" goes in a TBD/All budget (no brand)
          brandId: reference?.brands.find((b) => b.id === preset?.brand_id)?.code === "TBD_ALL" ? "" : idText(preset?.brand_id),
          channelId: idText(preset?.channel_id),
          amount: "",
          currency: preset?.currency ?? "USD",
          status: "APPROVED",
        },
  );
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (patch: Partial<FormState>) => {
    setFormError(null);
    setErrors((prev) => {
      const next = { ...prev };
      (Object.keys(patch) as (keyof FormState)[]).forEach((key) => delete next[key as FieldName]);
      return next;
    });
    setForm((prev) => ({ ...prev, ...patch }));
  };

  // A few months either side of the month being viewed
  const months = Array.from(new Set([...Array.from({ length: 19 }, (_, i) => addMonths(monthKey, i - 6)), form.month])).sort();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const problems = validate(form);
    setErrors(problems);
    if (Object.keys(problems).length) return;

    const values = {
      brand_id: toId(form.brandId),
      market_id: Number(form.marketId),
      channel_id: toId(form.channelId),
      amount: Number(form.amount),
      currency: form.currency,
      status: form.status,
    };
    const onError = (err: Error) => {
      const message = err.message || "Could not save the budget.";
      if (message.toLowerCase().includes("currency")) setErrors({ currency: message });
      else setFormError(message);
    };

    if (budget) {
      // Only what changed
      const changed = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== budget[key as keyof BudgetRow])) as BudgetUpdate;
      if (Object.keys(changed).length === 0) {
        onDone();
        return;
      }
      update.mutate(
        { budgetId: budget.id, data: changed },
        {
          onSuccess: () => {
            toast.success("Budget saved");
            onDone();
          },
          onError,
        },
      );
    } else {
      create.mutate(
        { month: toApiMonth(form.month), ...values },
        {
          onSuccess: () => {
            toast.success(`Budget added to ${monthName(form.month)}`);
            onDone();
          },
          onError,
        },
      );
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit budget" : "Add budget"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Change who this budget is for or how much was approved. Every change is recorded."
            : "Costs on initiatives in the same month, market, brand and channel count against this budget."}
        </DialogDescription>
      </DialogHeader>

      <form id="budget-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Month" htmlFor="budget-month" required error={errors.month} hint={isEdit ? "The month can't be changed." : undefined}>
            <Select value={form.month} onValueChange={(v) => set({ month: v })} disabled={isEdit}>
              <SelectTrigger id="budget-month" className="w-full">
                <SelectValue placeholder="Choose a month" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                {months.map((key) => (
                  <SelectItem key={key} value={key}>
                    {monthName(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Market" htmlFor="budget-market" required error={errors.marketId}>
            <Select value={form.marketId || undefined} onValueChange={(v) => set({ marketId: v })}>
              <SelectTrigger id="budget-market" className="w-full" aria-invalid={Boolean(errors.marketId)}>
                <SelectValue placeholder="Choose a market" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                {(reference?.markets ?? []).map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Brand" htmlFor="budget-brand" hint={`${TBD_ALL} covers every brand without its own budget in this market.`}>
            <Select value={form.brandId || NONE} onValueChange={(v) => set({ brandId: v === NONE ? "" : v })}>
              <SelectTrigger id="budget-brand" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                <SelectItem value={NONE}>{TBD_ALL}</SelectItem>
                {/* The TBD_ALL brand is stored as no brand, so it's the TBD/All option above */}
                {(reference?.brands ?? []).filter((b) => b.code !== "TBD_ALL").map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Channel" htmlFor="budget-channel">
            <Select value={form.channelId || NONE} onValueChange={(v) => set({ channelId: v === NONE ? "" : v })}>
              <SelectTrigger id="budget-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                <SelectItem value={NONE}>{ALL_CHANNELS}</SelectItem>
                {(reference?.channels ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Amount"
            htmlFor="budget-amount"
            required
            error={errors.amount}
            hint={preset?.expected ? `Expected spend so far: ${formatMoney(preset.expected, preset.currency)}` : "The approved budget for the month."}
          >
            <Input
              id="budget-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
              placeholder="0.00"
              className="tabular-nums"
              aria-invalid={Boolean(errors.amount)}
              autoFocus={!isEdit}
            />
          </Field>
          <Field label="Currency" htmlFor="budget-currency" required error={errors.currency}>
            <Select value={form.currency} onValueChange={(v) => set({ currency: v })}>
              <SelectTrigger id="budget-currency" className="w-full" aria-invalid={Boolean(errors.currency)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                {Array.from(new Set([...CURRENCIES, form.currency])).map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status" htmlFor="budget-status" required className="sm:col-span-2" hint="Not committed: planned but not signed off yet.">
            <Select value={form.status} onValueChange={(v) => set({ status: v as BudgetStatus })}>
              <SelectTrigger id="budget-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {BUDGET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {BUDGET_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

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
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" form="budget-form" disabled={pending} className="gap-1.5">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save budget" : "Add budget"}
        </Button>
      </DialogFooter>
    </>
  );
}

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The month being viewed, "YYYY-MM" */
  monthKey: string;
  /** Edit this budget; leave out to add one */
  budget?: BudgetRow;
  preset?: BudgetPreset;
}

export default function BudgetFormDialog({ open, onOpenChange, monthKey, budget, preset }: BudgetFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {open && <BudgetForm monthKey={monthKey} budget={budget} preset={preset} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
