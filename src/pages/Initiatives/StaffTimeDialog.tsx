import { useState } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useCreateSpendLine } from "@/hooks/useSpend";
import type { InitiativeListItem } from "@/types/initiatives";
import { isoToday } from "./format";
import { Field } from "./SpendLineDialog";
import { staffTimeSentence } from "./spendRules";

const CURRENCIES = ["USD", "CAD", "GBP", "AUD", "EUR"];
const STAFF_TIME_CATEGORY = "STAFF_TIME";

interface FormState {
  people: string;
  days: string;
  dayRate: string;
  currency: string;
  date: string;
  note: string;
}

type FieldName = keyof FormState;

// Field order, used to focus the first one with a problem
const FIELD_IDS: Partial<Record<FieldName, string>> = {
  people: "staff-people",
  days: "staff-days",
  dayRate: "staff-rate",
  date: "staff-date",
};

/** The event's length in days (inclusive), or 1 without both dates */
function eventDays(initiative: InitiativeListItem) {
  if (!initiative.start_date || !initiative.end_date) return 1;
  return Math.max(Math.round((Date.parse(initiative.end_date) - Date.parse(initiative.start_date)) / 86_400_000) + 1, 1);
}

function validate(form: FormState): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  const people = Number(form.people);
  if (!Number.isInteger(people) || people < 1 || people > 100) errors.people = "Enter a whole number of people from 1 to 100.";
  const days = Number(form.days);
  if (form.days.trim() === "" || !(days > 0) || !Number.isInteger(days * 2)) errors.days = "Enter days per person, in half days (e.g. 2.5).";
  if (form.dayRate.trim() === "" || !(Number(form.dayRate) > 0)) errors.dayRate = "Enter a day rate above zero.";
  if (!form.date) errors.date = "Choose a date.";
  return errors;
}

function StaffTimeForm({ initiative, onDone }: { initiative: InitiativeListItem; onDone: () => void }) {
  const { data: reference } = useReferenceData();
  const createLine = useCreateSpendLine(initiative.id);
  const [form, setForm] = useState<FormState>({
    people: "",
    days: String(eventDays(initiative)),
    dayRate: "",
    currency: initiative.currency,
    date: initiative.end_date ?? isoToday(),
    note: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (patch: Partial<FormState>) => {
    setFormError(null);
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as FieldName[]) delete next[key];
      return next;
    });
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const people = Number(form.people);
  const days = Number(form.days);
  const dayRate = Number(form.dayRate);
  const complete = Object.keys(validate({ ...form, date: form.date || "x" })).length === 0;
  const total = complete ? Math.round(people * days * dayRate * 100) / 100 : null;
  const categoryId = reference?.spend_categories.find((c) => c.code === STAFF_TIME_CATEGORY)?.id;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const problems = validate(form);
    if (Object.keys(problems).length) {
      setErrors(problems);
      const first = (Object.keys(FIELD_IDS) as FieldName[]).find((f) => problems[f]);
      if (first) setTimeout(() => document.getElementById(FIELD_IDS[first] as string)?.focus(), 0);
      return;
    }
    if (!categoryId) {
      setFormError("The staff time category isn't available. Refresh the page and try again.");
      return;
    }
    createLine.mutate(
      {
        category_id: categoryId,
        source: "STAFF_CALCULATOR",
        status: "COMMITTED",
        description: staffTimeSentence(people, days, dayRate, form.currency),
        amount: total as number,
        currency: form.currency,
        incurred_on: form.date,
        note: form.note.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Staff time added");
          onDone();
        },
        onError: (err) => setFormError(err.message || "Could not save the staff time."),
      },
    );
  };

  const invalid = (field: FieldName) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${FIELD_IDS[field]}-error` } : {});

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add staff time</DialogTitle>
        <DialogDescription>
          The cost of people's time on {initiative.name}, worked out from a day rate. Nobody's salary is stored. Expense claims go
          through the travel management system instead.
        </DialogDescription>
      </DialogHeader>

      <form id="staff-time-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="People" htmlFor="staff-people" required error={errors.people}>
          <Input id="staff-people" type="number" inputMode="numeric" min={1} max={100} step={1} value={form.people} onChange={(e) => set({ people: e.target.value })} placeholder="e.g. 3" autoFocus {...invalid("people")} />
        </Field>
        <Field label="Days each" htmlFor="staff-days" required error={errors.days} hint={initiative.start_date && initiative.end_date ? "Defaults to the event's length." : undefined}>
          <Input id="staff-days" type="number" inputMode="decimal" min={0.5} step={0.5} value={form.days} onChange={(e) => set({ days: e.target.value })} {...invalid("days")} />
        </Field>
        <Field label="Day rate" htmlFor="staff-rate" required error={errors.dayRate} hint="An average cost per person per day.">
          <Input id="staff-rate" type="number" inputMode="decimal" min={0} step="0.01" value={form.dayRate} onChange={(e) => set({ dayRate: e.target.value })} placeholder="e.g. 400" {...invalid("dayRate")} />
        </Field>
        <Field label="Currency" htmlFor="staff-currency" required>
          <Select value={form.currency} onValueChange={(v) => set({ currency: v })}>
            <SelectTrigger id="staff-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {Array.from(new Set([...CURRENCIES, initiative.currency])).map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date" htmlFor="staff-date" required error={errors.date} hint="Decides which month the cost counts in.">
          <DatePicker id="staff-date" value={form.date} onChange={(v) => set({ date: v })} {...invalid("date")} />
        </Field>
        <Field label="Note (optional)" htmlFor="staff-note" className="sm:col-span-2">
          <Textarea id="staff-note" value={form.note} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="e.g. Booth staff, setup and teardown" />
        </Field>

        {/* The working, live, in words */}
        <div className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 sm:col-span-2 dark:border-indigo-900/60 dark:bg-indigo-950/30" aria-live="polite">
          <Calculator className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          {total !== null ? (
            <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{staffTimeSentence(people, days, dayRate, form.currency)}</p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-zinc-400">Enter the people, days and day rate to see the total.</p>
          )}
        </div>
      </form>

      {formError && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {formError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={createLine.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="staff-time-form" disabled={createLine.isPending}>
          {createLine.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add staff time
        </Button>
      </DialogFooter>
    </>
  );
}

interface StaffTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative: InitiativeListItem;
}

export default function StaffTimeDialog({ open, onOpenChange, initiative }: StaffTimeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && <StaffTimeForm initiative={initiative} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
