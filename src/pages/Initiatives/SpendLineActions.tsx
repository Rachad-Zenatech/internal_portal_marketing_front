import { useState } from "react";
import { CheckCircle2, FileText, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeleteSpendLine, useUpdateSpendLine } from "@/hooks/useSpend";
import type { PaymentMethod, SpendLine, SpendLineUpdate } from "@/types/spend";
import { formatMoney, isoToday } from "./format";
import { INVOICE_HELP, PAYMENT_METHOD_LABELS } from "./spendRules";

function QuickField({ id, label, error, children }: { id: string; label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-slate-700 dark:text-zinc-300">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface QuickFormProps {
  line: SpendLine;
  initiativeId: string;
  onDone: () => void;
}

/** Invoice arrived: its number, date and the actual amount */
function MarkInvoicedForm({ line, initiativeId, onDone }: QuickFormProps) {
  const update = useUpdateSpendLine(initiativeId);
  const [invoiceRef, setInvoiceRef] = useState(line.invoice_ref ?? "");
  const [date, setDate] = useState(isoToday());
  const [amount, setAmount] = useState(String(line.amount));
  const [error, setError] = useState<{ field: "invoice" | "amount" | "form"; message: string } | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const actual = Number(amount);
    if (amount.trim() === "" || Number.isNaN(actual) || actual === 0) {
      setError({ field: "amount", message: "Enter the invoiced amount." });
      document.getElementById(`invoiced-amount-${line.id}`)?.focus();
      return;
    }
    const data: SpendLineUpdate = { status: "INVOICED", invoice_ref: invoiceRef.trim() || null, incurred_on: date, amount: actual };
    // Keep the agreed figure as the estimate, so the difference shows as variance
    if (line.estimated_amount === null && actual !== line.amount) data.estimated_amount = line.amount;
    update.mutate(
      { lineId: line.id, data },
      {
        onSuccess: () => {
          toast.success("Cost updated");
          onDone();
        },
        onError: (err) => {
          const duplicate = err.message.includes("already recorded");
          setError({ field: duplicate ? "invoice" : "form", message: err.message });
          if (duplicate) document.getElementById(`invoiced-ref-${line.id}`)?.focus();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Mark invoiced</p>
      <QuickField id={`invoiced-ref-${line.id}`} label="Invoice #" error={error?.field === "invoice" ? error.message : null}>
        <Input id={`invoiced-ref-${line.id}`} value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="e.g. INV-2231" maxLength={100} autoFocus />
      </QuickField>
      <p className="-mt-1 text-[11px] text-slate-500 dark:text-zinc-400">{INVOICE_HELP}</p>
      <div className="grid grid-cols-2 gap-2">
        <QuickField id={`invoiced-date-${line.id}`} label="Invoice date">
          <Input id={`invoiced-date-${line.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </QuickField>
        <QuickField id={`invoiced-amount-${line.id}`} label={`Actual (${line.currency})`} error={error?.field === "amount" ? error.message : null}>
          <Input id={`invoiced-amount-${line.id}`} type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </QuickField>
      </div>
      {error?.field === "form" && <p className="text-xs text-red-600 dark:text-red-400">{error.message}</p>}
      <Button type="submit" size="sm" disabled={update.isPending}>
        {update.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        Mark invoiced
      </Button>
    </form>
  );
}

/** Paid: the date and how */
function MarkPaidForm({ line, initiativeId, onDone }: QuickFormProps) {
  const update = useUpdateSpendLine(initiativeId);
  const [paidOn, setPaidOn] = useState(isoToday());
  const [method, setMethod] = useState<PaymentMethod>(line.payment_method ?? "AP_INVOICE");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!paidOn) {
      setError("Add the date it was paid.");
      document.getElementById(`paid-on-${line.id}`)?.focus();
      return;
    }
    update.mutate(
      { lineId: line.id, data: { status: "PAID", paid_on: paidOn, payment_method: method } },
      {
        onSuccess: () => {
          toast.success("Cost updated");
          onDone();
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Mark paid</p>
      <QuickField id={`paid-on-${line.id}`} label="Paid on" error={error}>
        <Input id={`paid-on-${line.id}`} type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} autoFocus />
      </QuickField>
      <QuickField id={`paid-method-${line.id}`} label="Payment method">
        <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
          <SelectTrigger id={`paid-method-${line.id}`} className="w-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </QuickField>
      <Button type="submit" size="sm" disabled={update.isPending}>
        {update.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        Mark paid
      </Button>
    </form>
  );
}

interface SpendLineActionsProps {
  line: SpendLine;
  initiativeId: string;
  onEdit: (line: SpendLine) => void;
}

/** Quick stage moves plus Edit / Delete for one cost */
export default function SpendLineActions({ line, initiativeId, onEdit }: SpendLineActionsProps) {
  const [quick, setQuick] = useState<"invoiced" | "paid" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useDeleteSpendLine(initiativeId);

  const locked = new Set(line.locked_fields);
  // Staff time is never invoiced, so it has no invoice / payment quick actions
  const staffTime = line.source === "STAFF_CALCULATOR";
  const canInvoice =
    !staffTime && line.editable && (line.status === "ESTIMATED" || line.status === "COMMITTED") && !locked.has("status") && !locked.has("amount");
  const canPay = !staffTime && line.editable && line.status === "INVOICED" && !locked.has("status");
  const quickAction = canInvoice ? "invoiced" : canPay ? "paid" : null;

  if (!line.editable && !line.can_delete) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {quickAction && (
        <Popover open={quick === quickAction} onOpenChange={(open) => setQuick(open ? quickAction : null)}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="xs" className="gap-1 text-xs whitespace-nowrap">
              {quickAction === "invoiced" ? <FileText className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {quickAction === "invoiced" ? "Mark invoiced" : "Mark paid"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            {quickAction === "invoiced" ? (
              <MarkInvoicedForm line={line} initiativeId={initiativeId} onDone={() => setQuick(null)} />
            ) : (
              <MarkPaidForm line={line} initiativeId={initiativeId} onDone={() => setQuick(null)} />
            )}
          </PopoverContent>
        </Popover>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for ${line.description || line.category_name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {line.editable && (
            <DropdownMenuItem onSelect={() => onEdit(line)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {line.can_delete && (
            <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-red-600 focus:text-red-600 dark:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this cost?</AlertDialogTitle>
            <AlertDialogDescription>
              {line.description || line.category_name}
              {line.vendor ? ` from ${line.vendor}` : ""} · {formatMoney(line.amount, line.currency)}. The deletion is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                // Keep the dialog open until the delete finishes
                event.preventDefault();
                remove.mutate(line.id, {
                  onSuccess: () => {
                    toast.success("Cost deleted");
                    setConfirmDelete(false);
                  },
                  onError: (err) => {
                    toast.error(err.message || "Could not delete the cost.");
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
    </div>
  );
}
