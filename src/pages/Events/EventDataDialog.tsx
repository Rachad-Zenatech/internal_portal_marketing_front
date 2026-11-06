// Type in what's missing for an event: its approved budget and its results (attendees, leads, MQLs, demos, customers,
// revenue). Saved through the same endpoints as the rest of the platform (the initiative's budget, and the typed-in
// results of the month the event starts), so every other page sees them too.
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUpdateInitiative } from "@/hooks/useInitiatives";
import { useOutcomes, useSaveOutcomes } from "@/hooks/usePerformance";
import type { EventOverviewDetail, EventTurnout } from "@/types/eventsOverview";
import type { OutcomeInput, OutcomeList } from "@/types/performance";
import { Field } from "../Initiatives/SpendLineDialog";
import { fmtCount } from "../PaidAds/adsDisplay";

type ResultKey = "attendees" | "leads" | "mqls" | "demos" | "customers" | "revenue";

const RESULTS: Array<{ key: ResultKey; label: string; metric: string; money?: boolean; hubspot?: keyof EventTurnout }> = [
  { key: "attendees", label: "Attendees", metric: "VISITORS", hubspot: "attended" },
  { key: "leads", label: "Leads", metric: "LEADS", hubspot: "leads" },
  { key: "mqls", label: "MQLs", metric: "MQLS", hubspot: "mqls" },
  { key: "demos", label: "Demos", metric: "DEMOS" },
  { key: "customers", label: "Customers", metric: "CUSTOMERS", hubspot: "customers" },
  { key: "revenue", label: "Revenue", metric: "REVENUE", money: true },
];

type Form = Record<ResultKey | "budget", string>;

/** The first of the month the event starts in: the month its typed-in results are kept under */
const periodOf = (startDate: string) => `${startDate.slice(0, 7)}-01`;

const toText = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function typedValues(outcomes: OutcomeList | undefined, period: string): Partial<Record<ResultKey, number>> {
  const typed: Partial<Record<ResultKey, number>> = {};
  for (const r of RESULTS) {
    const found = outcomes?.values.find((v) => v.source === "MANUAL" && v.period_start.slice(0, 10) === period && v.metric_code === r.metric);
    if (found) typed[r.key] = found.value;
  }
  return typed;
}

function EditForm({ event, outcomes, onDone }: { event: EventOverviewDetail; outcomes: OutcomeList | undefined; onDone: () => void }) {
  const queryClient = useQueryClient();
  const updateInitiative = useUpdateInitiative(event.id);
  const saveOutcomes = useSaveOutcomes(event.id);
  const period = periodOf(event.start_date);
  const initial = useMemo(() => typedValues(outcomes, period), [outcomes, period]);
  const [form, setForm] = useState<Form>(() => ({
    budget: toText(event.approved_budget),
    ...Object.fromEntries(RESULTS.map((r) => [r.key, toText(initial[r.key])])),
  }) as Form);
  const [error, setError] = useState<string | null>(null);
  const pending = updateInitiative.isPending || saveOutcomes.isPending;
  const set = (key: keyof Form, value: string) => {
    setError(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const otherMonths = (outcomes?.periods ?? []).filter((p) => p.slice(0, 10) !== period).length;

  const parse = (text: string, label: string, whole: boolean): number | null | "bad" => {
    if (text.trim() === "") return null;
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0 || (whole && !Number.isInteger(n))) {
      setError(`${label} must be ${whole ? "a whole number" : "a number"} of 0 or more.`);
      return "bad";
    }
    return n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const budget = parse(form.budget, "The budget", false);
    if (budget === "bad") return;
    const values: OutcomeInput[] = [];
    for (const r of RESULTS) {
      if (r.key === "demos" && outcomes?.demos_from_log) continue;
      const value = parse(form[r.key], r.label, !r.money);
      if (value === "bad") return;
      // Only what changed: a new or changed number, or null where a typed one was cleared
      if (value !== (initial[r.key] ?? null)) values.push({ metric_code: r.metric, value });
    }
    try {
      if (budget !== null && budget !== event.approved_budget) await updateInitiative.mutateAsync({ budget_amount: budget });
      if (values.length) await saveOutcomes.mutateAsync({ periodStart: period, values });
      await queryClient.invalidateQueries({ queryKey: ["events-overview"] });
      toast.success(budget === null && !values.length ? "Nothing to change" : "Event data saved");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit data for {event.name}</DialogTitle>
        <DialogDescription>
          Type in what's missing. Where HubSpot has a number it's the one shown; what you type fills the gaps. Results are kept under {new Date(`${period}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}, when the event starts.
        </DialogDescription>
      </DialogHeader>

      <form id="event-data-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={`Approved budget (${event.currency})`} htmlFor="event-budget" className="sm:col-span-2" hint="The budget for the whole event. It can't be cleared here.">
          <Input id="event-budget" inputMode="decimal" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. 12000" />
        </Field>
        {RESULTS.map((r) => {
          const hubspotValue = r.hubspot ? event.turnout[r.hubspot] : null;
          const fromHubSpot = typeof hubspotValue === "number" && hubspotValue > 0 && !event.turnout.typed_fields.includes(r.hubspot as string);
          const locked = r.key === "demos" && outcomes?.demos_from_log;
          return (
            <Field
              key={r.key}
              label={r.money ? `${r.label} (${event.currency})` : r.label}
              htmlFor={`event-${r.key}`}
              hint={locked ? "Counted from the event's demo log." : fromHubSpot ? `HubSpot has ${fmtCount(hubspotValue as number)}, which is shown instead.` : undefined}
            >
              <Input id={`event-${r.key}`} inputMode={r.money ? "decimal" : "numeric"} value={form[r.key]} onChange={(e) => set(r.key, e.target.value)} disabled={locked} placeholder="Not entered" />
            </Field>
          );
        })}
      </form>
      {otherMonths > 0 && <p className="text-xs text-muted-foreground">Results typed in for other months are kept as they are; change them on the event's workspace.</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" form="event-data-form" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

interface EventDataDialogProps {
  event: EventOverviewDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EventDataDialog({ event, open, onOpenChange }: EventDataDialogProps) {
  const outcomes = useOutcomes(open ? event.id : undefined);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {outcomes.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading the event's results
          </div>
        ) : (
          <EditForm event={event} outcomes={outcomes.data} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
