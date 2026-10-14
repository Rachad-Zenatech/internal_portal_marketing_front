import { useMemo, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useCreateSpendLine, useUpdateSpendLine } from "@/hooks/useSpend";
import type { InitiativeListItem } from "@/types/initiatives";
import type { CostType, PaymentMethod, SpendLine, SpendLineCreate, SpendStatus } from "@/types/spend";
import { isoToday } from "./format";
import {
  categoryGroups,
  errorField,
  INVOICE_HELP,
  PAYMENT_METHOD_LABELS,
  SPEND_STATUS_LABELS,
  SPEND_STATUSES,
} from "./spendRules";

const CURRENCIES = ["USD", "CAD", "GBP", "AUD", "EUR"];

// The picked option in a segmented control, so it stands out in light and dark
const SELECTED = "data-[state=on]:bg-slate-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900";

interface FormState {
  categoryId: string;
  description: string;
  vendor: string;
  status: SpendStatus;
  estimate: string;
  amount: string;
  currency: string;
  incurredOn: string;
  invoiceRef: string;
  paidOn: string;
  paymentMethod: PaymentMethod | "";
  costType: CostType | "";
  note: string;
}

type FieldName = keyof FormState;

// Field order, used to focus the first one with a problem
const FIELD_IDS: Partial<Record<FieldName, string>> = {
  categoryId: "cost-category",
  amount: "cost-amount",
  estimate: "cost-estimate",
  currency: "cost-currency",
  incurredOn: "cost-date",
  invoiceRef: "cost-invoice",
  paidOn: "cost-paid-on",
};

// Form field → API field, for locks and for sending only what changed
const API_FIELDS: Partial<Record<FieldName, string>> = {
  categoryId: "category_id",
  status: "status",
  estimate: "estimated_amount",
  amount: "amount",
  currency: "currency",
  incurredOn: "incurred_on",
  paidOn: "paid_on",
  paymentMethod: "payment_method",
  costType: "cost_type",
};

const text = (value: string | null) => value ?? "";
const toNumber = (value: string) => (value.trim() === "" ? null : Number(value));
const toText = (value: string) => value.trim() || null;

function formFromLine(line: SpendLine): FormState {
  return {
    categoryId: String(line.category_id),
    description: text(line.description),
    vendor: text(line.vendor),
    status: line.status,
    // An estimate line shows one figure: its estimate
    estimate: line.status === "ESTIMATED" ? String(line.estimated_amount ?? line.amount) : line.estimated_amount === null ? "" : String(line.estimated_amount),
    amount: String(line.amount),
    currency: line.currency,
    incurredOn: line.incurred_on,
    invoiceRef: text(line.invoice_ref),
    paidOn: text(line.paid_on),
    paymentMethod: line.payment_method ?? "",
    costType: line.cost_type ?? "",
    note: text(line.note),
  };
}

function emptyForm(currency: string): FormState {
  return {
    categoryId: "",
    description: "",
    vendor: "",
    status: "COMMITTED",
    estimate: "",
    amount: "",
    currency,
    incurredOn: isoToday(),
    invoiceRef: "",
    paidOn: "",
    paymentMethod: "",
    costType: "",
    note: "",
  };
}

function toPayload(form: FormState): SpendLineCreate {
  const estimate = toNumber(form.estimate);
  const paid = form.status === "PAID";
  return {
    category_id: Number(form.categoryId),
    status: form.status,
    // An estimate is sent as both the estimate and the current figure
    amount: (form.status === "ESTIMATED" ? estimate : toNumber(form.amount)) as number,
    estimated_amount: estimate,
    currency: form.currency,
    incurred_on: form.incurredOn,
    description: toText(form.description),
    vendor: toText(form.vendor),
    note: toText(form.note),
    invoice_ref: toText(form.invoiceRef),
    paid_on: paid ? form.paidOn || null : null,
    payment_method: paid ? form.paymentMethod || null : null,
    cost_type: form.costType || null,
  };
}

// Same rules the API enforces, checked first so people get instant feedback
function validate(form: FormState): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!form.categoryId) errors.categoryId = "Choose a category.";
  const figure = form.status === "ESTIMATED" ? "estimate" : "amount";
  const value = form[figure];
  if (value.trim() === "" || Number.isNaN(Number(value))) errors[figure] = form.status === "ESTIMATED" ? "Enter the estimate." : "Enter the amount.";
  else if (Number(value) === 0) errors[figure] = "Amount can't be zero. Use a negative amount for a refund or credit.";
  if (figure === "amount" && form.estimate.trim() !== "" && Number.isNaN(Number(form.estimate))) errors.estimate = "Enter a number.";
  if (!form.incurredOn) errors.incurredOn = "Choose a date.";
  if (form.status === "PAID" && !form.paidOn) errors.paidOn = "Add the date it was paid.";
  return errors;
}

function focusFirst(errors: Partial<Record<FieldName, string>>) {
  const first = (Object.keys(FIELD_IDS) as FieldName[]).find((f) => errors[f]);
  if (first) document.getElementById(FIELD_IDS[first] as string)?.focus();
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-slate-700 dark:text-zinc-300">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

interface SpendLineFormProps {
  initiative: InitiativeListItem;
  line?: SpendLine;
  vendors: string[];
  onDone: () => void;
}

// Mounted each time the dialog opens, so the fields start from the latest values
function SpendLineForm({ initiative, line, vendors, onDone }: SpendLineFormProps) {
  const isEdit = Boolean(line);
  const { data: reference } = useReferenceData();
  const createLine = useCreateSpendLine(initiative.id);
  const updateLine = useUpdateSpendLine(initiative.id);
  const pending = createLine.isPending || updateLine.isPending;

  const [form, setForm] = useState<FormState>(line ? formFromLine(line) : emptyForm(initiative.currency));
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const channelCode = reference?.channels.find((c) => c.id === initiative.channel_id)?.code;
  const groups = useMemo(() => categoryGroups(reference, channelCode, line?.category_id), [reference, channelCode, line?.category_id]);
  const category = reference?.spend_categories.find((c) => String(c.id) === form.categoryId);

  // Fields the API won't let change on this line (e.g. once Finance has reconciled it)
  const locked = new Set(line?.locked_fields ?? []);
  const isLocked = (field: FieldName) => Boolean(API_FIELDS[field] && locked.has(API_FIELDS[field] as string));
  const reconciled = line?.lock_reason === "RECONCILED" && line.reconciled_month;
  // A reconciled line can only move from Invoiced to Paid
  const statusAllowed = (status: SpendStatus) =>
    !isLocked("status") && (!reconciled || status === line?.status || (line?.status === "INVOICED" && status === "PAID"));

  const set = (patch: Partial<FormState>) => {
    setFormError(null);
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as FieldName[]) delete next[key];
      return next;
    });
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const fail = (fieldErrors: Partial<Record<FieldName, string>>) => {
    setErrors(fieldErrors);
    // Wait for the error text to render, then move focus to the first problem
    setTimeout(() => focusFirst(fieldErrors), 0);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const problems = validate(form);
    if (Object.keys(problems).length) {
      fail(problems);
      return;
    }

    const payload = toPayload(form);
    const onError = (err: Error) => {
      const field = errorField(err.message);
      if (field) fail({ [field]: err.message });
      else setFormError(err.message || "Could not save the cost.");
    };

    if (line) {
      // Send only what changed
      const changes = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => value !== (line[key as keyof SpendLine] ?? null)),
      );
      if (Object.keys(changes).length === 0) {
        onDone();
        return;
      }
      updateLine.mutate(
        { lineId: line.id, data: changes },
        {
          onSuccess: () => {
            toast.success("Cost updated");
            onDone();
          },
          onError,
        },
      );
    } else {
      createLine.mutate(payload, {
        onSuccess: () => {
          toast.success("Cost added");
          onDone();
        },
        onError,
      });
    }
  };

  const isEstimate = form.status === "ESTIMATED";
  const isPaid = form.status === "PAID";
  const actual = form.status === "INVOICED" || isPaid;
  const currencies = Array.from(new Set([...CURRENCIES, initiative.currency, form.currency]));
  const invalid = (field: FieldName) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${FIELD_IDS[field]}-error` } : {});

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit cost" : "Add cost"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update this cost. Every change is recorded in the audit log." : `A cost for ${initiative.name}. Start with an estimate if you only have a quote.`}
        </DialogDescription>
      </DialogHeader>

      {reconciled && (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          Reconciled for {new Date(`${line.reconciled_month}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}, so the
          amount, currency, date and category can't change. Ask Finance to reopen it if they're wrong.
        </p>
      )}

      <form id="spend-line-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="cost-category" error={errors.categoryId} hint={category?.help_text} className="sm:col-span-2">
          <Select
            value={form.categoryId || undefined}
            onValueChange={(v) => {
              const picked = reference?.spend_categories.find((c) => String(c.id) === v);
              set({ categoryId: v, costType: picked?.default_cost_type ?? form.costType });
            }}
            disabled={isLocked("categoryId")}
          >
            <SelectTrigger id="cost-category" className="w-full" {...invalid("categoryId")}>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {groups.map(({ type, categories }) => (
                <SelectGroup key={type.id}>
                  <SelectLabel>{type.name}</SelectLabel>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Item" htmlFor="cost-description">
          <Input id="cost-description" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="e.g. 10x20 grey carpet" maxLength={255} autoFocus />
        </Field>
        <Field label="Vendor" htmlFor="cost-vendor">
          <Input
            id="cost-vendor"
            list="cost-vendor-options"
            value={form.vendor}
            onChange={(e) => set({ vendor: e.target.value })}
            placeholder="e.g. Freeman"
            maxLength={255}
            autoComplete="off"
          />
          <datalist id="cost-vendor-options">
            {vendors.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>

        <Field label="Status" htmlFor="cost-status" className="sm:col-span-2">
          <ToggleGroup
            id="cost-status"
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={form.status}
            onValueChange={(v) => v && set({ status: v as SpendStatus })}
            className="w-full"
          >
            {SPEND_STATUSES.map((status) => (
              <ToggleGroupItem key={status} value={status} disabled={!statusAllowed(status)} className={`flex-1 ${SELECTED}`}>
                {SPEND_STATUS_LABELS[status]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        {isEstimate ? (
          <Field label="Estimate" htmlFor="cost-estimate" error={errors.estimate}>
            <Input id="cost-estimate" type="number" inputMode="decimal" step="0.01" value={form.estimate} onChange={(e) => set({ estimate: e.target.value })} placeholder="0.00" {...invalid("estimate")} />
          </Field>
        ) : (
          <>
            <Field label="Amount" htmlFor="cost-amount" error={errors.amount}>
              <Input
                id="cost-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.amount}
                onChange={(e) => set({ amount: e.target.value })}
                placeholder="0.00"
                disabled={isLocked("amount")}
                {...invalid("amount")}
              />
            </Field>
            <Field label="Estimate (optional)" htmlFor="cost-estimate" error={errors.estimate}>
              <Input
                id="cost-estimate"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.estimate}
                onChange={(e) => set({ estimate: e.target.value })}
                placeholder="The quote, to compare with the actual"
                disabled={isLocked("estimate")}
                {...invalid("estimate")}
              />
            </Field>
          </>
        )}

        <Field label="Currency" htmlFor="cost-currency" error={errors.currency}>
          <Select value={form.currency} onValueChange={(v) => set({ currency: v })} disabled={isLocked("currency")}>
            <SelectTrigger id="cost-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {currencies.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={actual ? "Invoice date" : "Expected date"} htmlFor="cost-date" error={errors.incurredOn} hint="Decides which month the cost counts in.">
          <Input id="cost-date" type="date" value={form.incurredOn} onChange={(e) => set({ incurredOn: e.target.value })} disabled={isLocked("incurredOn")} {...invalid("incurredOn")} />
        </Field>

        <Field
          label={actual ? "Invoice #" : "Invoice # (optional)"}
          htmlFor="cost-invoice"
          error={errors.invoiceRef}
          hint={INVOICE_HELP}
          className={isEstimate ? "sm:col-span-2" : undefined}
        >
          <Input id="cost-invoice" value={form.invoiceRef} onChange={(e) => set({ invoiceRef: e.target.value })} placeholder="e.g. INV-2231" maxLength={100} {...invalid("invoiceRef")} />
        </Field>

        {isPaid && (
          <>
            <Field label="Paid on" htmlFor="cost-paid-on" error={errors.paidOn}>
              <Input id="cost-paid-on" type="date" value={form.paidOn} onChange={(e) => set({ paidOn: e.target.value })} disabled={isLocked("paidOn")} {...invalid("paidOn")} />
            </Field>
            <Field label="Payment method" htmlFor="cost-payment-method">
              <Select value={form.paymentMethod || undefined} onValueChange={(v) => set({ paymentMethod: v as PaymentMethod })} disabled={isLocked("paymentMethod")}>
                <SelectTrigger id="cost-payment-method" className="w-full">
                  <SelectValue placeholder="How it was paid" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

        <Field label="Cost type" htmlFor="cost-type" hint={category?.default_cost_type ? `Usually ${category.default_cost_type} for this category.` : undefined}>
          <ToggleGroup
            id="cost-type"
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={form.costType}
            onValueChange={(v) => set({ costType: (v || "") as CostType | "" })}
            disabled={isLocked("costType")}
          >
            <ToggleGroupItem value="OPEX" className={`px-4 ${SELECTED}`}>
              OPEX
            </ToggleGroupItem>
            <ToggleGroupItem value="CAPEX" className={`px-4 ${SELECTED}`}>
              CAPEX
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field label="Note" htmlFor="cost-note" className="sm:col-span-2">
          <Textarea id="cost-note" value={form.note} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="Anything Finance should know" />
        </Field>
      </form>

      {formError && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {formError}
        </p>
      )}

      <DialogFooter className="sticky -bottom-4 z-10 bg-slate-50 dark:bg-zinc-900">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" form="spend-line-form" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Add cost"}
        </Button>
      </DialogFooter>
    </>
  );
}

interface SpendLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative: InitiativeListItem;
  /** Pass a cost to edit it; leave out to add one */
  line?: SpendLine;
  /** Vendors already used on this initiative, offered as suggestions */
  vendors: string[];
}

export default function SpendLineDialog({ open, onOpenChange, initiative, line, vendors }: SpendLineDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {open && <SpendLineForm initiative={initiative} line={line} vendors={vendors} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
