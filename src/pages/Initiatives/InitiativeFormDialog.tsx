import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateInitiative, useUpdateInitiative } from "@/hooks/useInitiatives";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeCreate, InitiativeListItem, InitiativeStatus, OwnerOption } from "@/types/initiatives";
import type { ReferenceItem } from "@/types/referenceData";
import OwnerPicker from "./OwnerPicker";
import { STATUS_LABELS, STATUS_TRANSITIONS } from "./status";

const CURRENCIES = ["USD", "CAD", "GBP", "AUD", "EUR"];
const NONE = "none";

interface FormState {
  name: string;
  brandId: string;
  channelId: string;
  subChannelId: string;
  funnelStageId: string;
  goalId: string;
  primaryKpiId: string;
  startDate: string;
  endDate: string;
  budget: string;
  currency: string;
  status: InitiativeStatus;
}

const EMPTY_FORM: FormState = {
  name: "",
  brandId: "",
  channelId: "",
  subChannelId: "",
  funnelStageId: "",
  goalId: "",
  primaryKpiId: "",
  startDate: "",
  endDate: "",
  budget: "",
  currency: "USD",
  status: "PLANNED",
};

const idText = (value: number | null) => (value === null ? "" : String(value));

function formFromInitiative(item: InitiativeListItem): FormState {
  return {
    name: item.name,
    brandId: String(item.brand_id),
    channelId: String(item.channel_id),
    subChannelId: idText(item.sub_channel_id),
    funnelStageId: idText(item.funnel_stage_id),
    goalId: idText(item.goal_id),
    primaryKpiId: idText(item.primary_kpi_id),
    startDate: item.start_date ?? "",
    endDate: item.end_date ?? "",
    budget: item.budget_amount === null ? "" : String(item.budget_amount),
    currency: item.currency,
    status: item.status,
  };
}

const toId = (value: string) => (value ? Number(value) : null);

// Same rules the API enforces, checked first so people get instant feedback
function validate(form: FormState): string | null {
  if (!form.name.trim()) return "Enter a name.";
  if (!form.brandId) return "Choose a brand.";
  if (!form.channelId) return "Choose a channel.";
  if (form.startDate && form.endDate && form.endDate < form.startDate) return "End date can't be before the start date.";
  if (form.budget && (Number.isNaN(Number(form.budget)) || Number(form.budget) < 0)) return "Budget must be a positive number.";
  return null;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  optional?: boolean;
  children: React.ReactNode;
}

function Field({ label, htmlFor, optional, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </Label>
      {children}
    </div>
  );
}

interface ReferenceSelectProps {
  id: string;
  value: string;
  items: ReferenceItem[];
  placeholder: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
  disabled?: boolean;
}

function ReferenceSelect({ id, value, items, placeholder, onChange, allowNone, disabled }: ReferenceSelectProps) {
  return (
    <Select value={value || (allowNone ? NONE : undefined)} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>None</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.id} value={String(item.id)}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface InitiativeFormProps {
  initiative?: InitiativeListItem;
  onDone: () => void;
}

// Mounted each time the dialog opens, so the fields always start from the latest values
function InitiativeForm({ initiative, onDone }: InitiativeFormProps) {
  const isEdit = Boolean(initiative);
  const { user } = useAuth();
  const { data: reference } = useReferenceData();
  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative(initiative?.id ?? "");
  const mutation = isEdit ? updateInitiative : createInitiative;

  const [form, setForm] = useState<FormState>(initiative ? formFromInitiative(initiative) : EMPTY_FORM);
  const [owner, setOwner] = useState<OwnerOption | null>(() => {
    if (initiative) {
      return initiative.owner_user_id ? { id: initiative.owner_user_id, full_name: initiative.owner_name, email: "" } : null;
    }
    return user ? { id: user.id, full_name: user.full_name, email: user.email } : null;
  });
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<FormState>) => {
    setError(null);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  // Sub-channel options follow the chosen channel
  const subChannels = useMemo(() => {
    if (!reference || !form.channelId) return [];
    const channel = reference.channels.find((c) => String(c.id) === form.channelId);
    const allowed = new Set(channel?.sub_channel_ids ?? []);
    return reference.sub_channels.filter((s) => allowed.has(s.id));
  }, [reference, form.channelId]);

  // Goal options follow the funnel stage (Rule 1)
  const goals = useMemo(() => {
    if (!reference || !form.funnelStageId) return [];
    return reference.goals.filter((g) => String(g.funnel_stage_id) === form.funnelStageId);
  }, [reference, form.funnelStageId]);

  // New initiatives can start in any status; existing ones follow the allowed transitions
  const statusOptions: InitiativeStatus[] = initiative
    ? [initiative.status, ...STATUS_TRANSITIONS[initiative.status]]
    : (Object.keys(STATUS_LABELS) as InitiativeStatus[]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }

    const payload: InitiativeCreate = {
      name: form.name.trim(),
      brand_id: Number(form.brandId),
      channel_id: Number(form.channelId),
      sub_channel_id: toId(form.subChannelId),
      funnel_stage_id: toId(form.funnelStageId),
      goal_id: toId(form.goalId),
      primary_kpi_id: toId(form.primaryKpiId),
      owner_user_id: owner?.id ?? null,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      budget_amount: form.budget ? Number(form.budget) : null,
      currency: form.currency,
      status: form.status,
    };

    // The API ignores fields that didn't change, so editing sends the whole form
    mutation.mutate(payload, {
      onSuccess: (saved) => {
        toast.success(isEdit ? `"${saved.name}" saved` : `"${saved.name}" created`);
        onDone();
      },
      onError: (err) => setError(err instanceof Error ? err.message : "Could not save the initiative."),
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit initiative" : "New initiative"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update this initiative's details. Every change is recorded in the audit log."
            : "Add a marketing initiative for any channel. You can add budget details and results later."}
        </DialogDescription>
      </DialogHeader>

      <form id="initiative-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Name" htmlFor="initiative-name">
            <Input
              id="initiative-name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Facility Expo 2026 - Booth"
              maxLength={255}
              autoFocus
            />
          </Field>
        </div>

        <Field label="Brand" htmlFor="initiative-brand">
          <ReferenceSelect id="initiative-brand" value={form.brandId} items={reference?.brands ?? []} placeholder="Choose a brand" onChange={(v) => set({ brandId: v })} />
        </Field>
        <Field label="Owner" htmlFor="initiative-owner">
          <OwnerPicker id="initiative-owner" value={owner} onChange={setOwner} />
        </Field>

        <Field label="Channel" htmlFor="initiative-channel">
          <ReferenceSelect
            id="initiative-channel"
            value={form.channelId}
            items={reference?.channels ?? []}
            placeholder="Choose a channel"
            // A new channel may not include the selected sub-channel
            onChange={(v) => set({ channelId: v, subChannelId: "" })}
          />
        </Field>
        <Field label="Sub-channel" htmlFor="initiative-sub-channel" optional>
          <ReferenceSelect
            id="initiative-sub-channel"
            value={form.subChannelId}
            items={subChannels}
            placeholder={form.channelId ? "Choose a sub-channel" : "Choose a channel first"}
            onChange={(v) => set({ subChannelId: v })}
            allowNone
            disabled={!form.channelId}
          />
        </Field>

        <Field label="Funnel stage" htmlFor="initiative-funnel-stage" optional>
          <ReferenceSelect
            id="initiative-funnel-stage"
            value={form.funnelStageId}
            items={reference?.funnel_stages ?? []}
            placeholder="Choose a funnel stage"
            // A new stage may not allow the selected goal
            onChange={(v) => set({ funnelStageId: v, goalId: "" })}
            allowNone
          />
        </Field>
        <Field label="Goal" htmlFor="initiative-goal" optional>
          <ReferenceSelect
            id="initiative-goal"
            value={form.goalId}
            items={goals}
            placeholder={form.funnelStageId ? "Choose a goal" : "Choose a funnel stage first"}
            onChange={(v) => set({ goalId: v })}
            allowNone
            disabled={!form.funnelStageId}
          />
        </Field>

        <Field label="Primary KPI" htmlFor="initiative-kpi" optional>
          <ReferenceSelect
            id="initiative-kpi"
            value={form.primaryKpiId}
            items={reference?.primary_kpis ?? []}
            placeholder="Choose a KPI"
            onChange={(v) => set({ primaryKpiId: v })}
            allowNone
          />
        </Field>
        <Field label="Status" htmlFor="initiative-status">
          <Select value={form.status} onValueChange={(v) => set({ status: v as InitiativeStatus })}>
            <SelectTrigger id="initiative-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Start date" htmlFor="initiative-start" optional>
          <Input id="initiative-start" type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </Field>
        <Field label="End date" htmlFor="initiative-end" optional>
          <Input id="initiative-end" type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set({ endDate: e.target.value })} />
        </Field>

        <Field label="Budget" htmlFor="initiative-budget" optional>
          <Input
            id="initiative-budget"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.budget}
            onChange={(e) => set({ budget: e.target.value })}
            placeholder="0.00"
          />
        </Field>
        <Field label="Currency" htmlFor="initiative-currency">
          <Select value={form.currency} onValueChange={(v) => set({ currency: v })}>
            <SelectTrigger id="initiative-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set([...CURRENCIES, form.currency])).map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </form>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="initiative-form" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create initiative"}
        </Button>
      </DialogFooter>
    </>
  );
}

interface InitiativeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an initiative to edit it; leave out to create a new one */
  initiative?: InitiativeListItem;
}

export default function InitiativeFormDialog({ open, onOpenChange, initiative }: InitiativeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <InitiativeForm initiative={initiative} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
