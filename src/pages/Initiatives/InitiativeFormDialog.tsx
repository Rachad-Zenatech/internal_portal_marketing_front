import { useEffect, useMemo, useState } from "react";
import { CalendarDays, History, Loader2, MapPin, Target, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCreateInitiative, useUpdateInitiative } from "@/hooks/useInitiatives";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import { appStorage } from "@/lib/storage";
import type { EventDetailsInput, InitiativeCreate, InitiativeListItem, InitiativeStatus, OwnerOption } from "@/types/initiatives";
import type { ReferenceItem } from "@/types/referenceData";
import CountryPicker from "./CountryPicker";
import { boothSizeEquivalent } from "./format";
import {
  EVENT_PLATFORM_SUGGESTIONS,
  EVENTS_CHANNEL_CODE,
  type AreaUnit,
  boothSizeInSqm,
  boothSizeProblem,
  eventUrlProblem,
  IN_PERSON_EVENT_SUB_CHANNELS,
  missingEventFields,
  ONLINE_EVENT_SUB_CHANNELS,
  requiredEventFields,
} from "./eventRules";
import OwnerPicker from "./OwnerPicker";
import { STATUS_LABELS, STATUS_TRANSITIONS } from "./status";
import RequiredMark from "@/components/RequiredMark";

const CURRENCIES = ["USD", "CAD", "GBP", "AUD", "EUR"];
const NONE = "none";
// The picked option in a segmented control, so it stands out in light and dark
const SELECTED = "data-[state=on]:bg-slate-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900";

interface FormState {
  name: string;
  brandId: string;
  channelId: string;
  subChannelId: string;
  funnelStageId: string;
  goalId: string;
  primaryKpiId: string;
  marketId: string;
  startDate: string;
  endDate: string;
  budget: string;
  currency: string;
  status: InitiativeStatus;
  // Event details, only used in the Events channel
  eventTypeId: string;
  venue: string;
  city: string;
  countryCode: string;
  regionId: string;
  // Virtual events and webinars
  platform: string;
  eventUrl: string;
  // In-person events: typed in either unit, always sent in m²
  boothSize: string;
  boothUnit: AreaUnit;
}

const EMPTY_FORM: FormState = {
  name: "",
  brandId: "",
  channelId: "",
  subChannelId: "",
  funnelStageId: "",
  goalId: "",
  primaryKpiId: "",
  marketId: "",
  startDate: "",
  endDate: "",
  budget: "",
  currency: "USD",
  status: "PLANNED",
  eventTypeId: "",
  venue: "",
  city: "",
  countryCode: "",
  regionId: "",
  platform: "",
  eventUrl: "",
  boothSize: "",
  boothUnit: "sqm",
};

// A new initiative's form is kept in the browser while it's being filled in, so closing it by accident
// (or a page refresh) loses nothing. It's cleared once the initiative or draft is saved, or on "Start over".
const unsavedKey = (userId: string | undefined) => `marketing.unsavedInitiative.${userId ?? "anonymous"}`;

interface UnsavedForm {
  form: FormState;
  owner: OwnerOption | null;
}

function readUnsaved(userId: string | undefined): UnsavedForm | null {
  try {
    const raw = appStorage.getItem(unsavedKey(userId));
    return raw ? (JSON.parse(raw) as UnsavedForm) : null;
  } catch {
    return null;
  }
}

function discardUnsaved(userId: string | undefined) {
  appStorage.removeItem(unsavedKey(userId));
}

// Anything typed or picked; a preset channel, the default currency and status don't count
const UNTYPED_FIELDS = new Set<keyof FormState>(["channelId", "currency", "status", "boothUnit"]);
function hasContent(form: FormState) {
  return (Object.keys(form) as (keyof FormState)[]).some((field) => !UNTYPED_FIELDS.has(field) && form[field] !== "");
}

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
    marketId: idText(item.market_id),
    startDate: item.start_date ?? "",
    endDate: item.end_date ?? "",
    budget: item.budget_amount === null ? "" : String(item.budget_amount),
    currency: item.currency,
    // Finishing a draft picks a real status; Planned to start with
    status: item.status === "DRAFT" ? "PLANNED" : item.status,
    eventTypeId: idText(item.event_type_id),
    venue: item.venue ?? "",
    city: item.city ?? "",
    countryCode: item.country_code ?? "",
    regionId: idText(item.region_id),
    platform: item.platform ?? "",
    eventUrl: item.event_url ?? "",
    boothSize: item.booth_size_sqm === null ? "" : String(item.booth_size_sqm),
    boothUnit: "sqm",
  };
}

const toId = (value: string) => (value ? Number(value) : null);
const toText = (value: string) => value.trim() || null;

function eventFromForm(form: FormState, subChannelCode: string | undefined): Required<EventDetailsInput> {
  // In-person events can't have a platform or link, so switching to one clears them
  const inPerson = IN_PERSON_EVENT_SUB_CHANNELS.has(subChannelCode ?? "");
  return {
    event_type_id: toId(form.eventTypeId),
    venue: toText(form.venue),
    city: toText(form.city),
    country_code: form.countryCode || null,
    region_id: toId(form.regionId),
    platform: inPerson ? null : toText(form.platform),
    event_url: inPerson ? null : toText(form.eventUrl),
    // Only in-person events have a booth, so switching away clears it
    booth_size_sqm: inPerson ? boothSizeInSqm(form.boothSize, form.boothUnit) : null,
  };
}

// Only the event fields that differ from the saved initiative, or undefined if none do
function changedEventFields(form: FormState, subChannelCode: string | undefined, initiative: InitiativeListItem): EventDetailsInput | undefined {
  const changed = Object.fromEntries(
    Object.entries(eventFromForm(form, subChannelCode)).filter(([field, value]) => value !== initiative[field as keyof EventDetailsInput]),
  );
  return Object.keys(changed).length ? changed : undefined;
}

// Same rules the API enforces, checked first so people get instant feedback. A draft needs only a name,
// brand and channel; anything filled in still has to be valid.
function validate(form: FormState, isEvent: boolean, subChannelCode: string | undefined, draft = false): string | null {
  if (!form.name.trim()) return draft ? "Enter a name to save a draft." : "Enter a name.";
  if (!form.brandId) return draft ? "Choose a brand to save a draft." : "Choose a brand.";
  if (!form.channelId) return draft ? "Choose a channel to save a draft." : "Choose a channel.";
  if (form.startDate && form.endDate && form.endDate < form.startDate) return "End date can't be before the start date.";
  if (form.budget && (Number.isNaN(Number(form.budget)) || Number(form.budget) < 0)) return "Budget must be 0 or more.";
  if (isEvent) {
    const missing = draft ? null : missingEventFields(subChannelCode, { city: form.city, country_code: form.countryCode });
    if (missing) return missing;
    if (!IN_PERSON_EVENT_SUB_CHANNELS.has(subChannelCode ?? "")) return eventUrlProblem(form.eventUrl);
    return boothSizeProblem(form.boothSize);
  }
  return null;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, required, className, children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-slate-700 dark:text-zinc-300">
        {label}
        {required && <RequiredMark />}
      </Label>
      {children}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface ReferenceSelectProps {
  id: string;
  value: string;
  items: ReferenceItem[];
  placeholder: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
  /** Label for the empty option, "None" by default */
  noneLabel?: string;
  disabled?: boolean;
}

function ReferenceSelect({ id, value, items, placeholder, onChange, allowNone, noneLabel = "None", disabled }: ReferenceSelectProps) {
  return (
    <Select value={value || (allowNone ? NONE : undefined)} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {allowNone && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
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
  /** Start a new initiative in this channel, e.g. "EVENTS" from the Events page */
  defaultChannelCode?: string;
  onDone: () => void;
}

// Mounted each time the dialog opens, so the fields always start from the latest values
function InitiativeForm({ initiative, defaultChannelCode, onDone }: InitiativeFormProps) {
  const isEdit = Boolean(initiative);
  const isDraft = initiative?.status === "DRAFT";
  const { user } = useAuth();
  const { data: reference } = useReferenceData();
  const defaultChannelId = defaultChannelCode ? reference?.channels.find((c) => c.code === defaultChannelCode)?.id : undefined;
  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative(initiative?.id ?? "");
  const mutation = isEdit ? updateInitiative : createInitiative;

  // What was typed into a new form before it was closed, if anything
  const [restored, setRestored] = useState(() => (initiative ? null : readUnsaved(user?.id)));
  const [form, setForm] = useState<FormState>(() => (initiative ? formFromInitiative(initiative) : (restored?.form ?? EMPTY_FORM)));
  // A preset channel applies once reference data has loaded, and only while nothing has been chosen
  const [presetApplied, setPresetApplied] = useState(false);
  if (!initiative && !presetApplied && defaultChannelId !== undefined) {
    setPresetApplied(true);
    if (!form.channelId) setForm((prev) => ({ ...prev, channelId: String(defaultChannelId) }));
  }
  const [owner, setOwner] = useState<OwnerOption | null>(() => {
    if (restored) return restored.owner;
    if (initiative) {
      return initiative.owner_user_id ? { id: initiative.owner_user_id, full_name: initiative.owner_name, email: "" } : null;
    }
    return user ? { id: user.id, full_name: user.full_name, email: user.email } : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // The "kept" message from an earlier close isn't needed once the form is open again
  useEffect(() => {
    toast.dismiss("unsaved-initiative");
  }, []);

  // Keep a new form in the browser as it's filled in
  useEffect(() => {
    if (isEdit) return;
    if (hasContent(form)) appStorage.setItem(unsavedKey(user?.id), JSON.stringify({ form, owner } satisfies UnsavedForm));
    else discardUnsaved(user?.id);
  }, [isEdit, form, owner, user?.id]);

  const startOver = () => {
    discardUnsaved(user?.id);
    setRestored(null);
    setError(null);
    setForm({ ...EMPTY_FORM, channelId: defaultChannelId === undefined ? "" : String(defaultChannelId) });
    setOwner(user ? { id: user.id, full_name: user.full_name, email: user.email } : null);
  };

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

  // Primary KPIs follow the channel too: no ad measures like CPM on an event. A KPI saved before this rule stays
  // listed (marked) so the field still shows it; the API only checks it when it changes.
  const channelCode = reference?.channels.find((c) => String(c.id) === form.channelId)?.code;
  const kpiChoices = useMemo(() => {
    const all = reference?.primary_kpis ?? [];
    const allowed = channelCode ? reference?.kpi_choices_by_channel?.[channelCode] : undefined;
    if (!allowed) return all;
    return all
      .filter((k) => allowed.includes(k.code) || String(k.id) === form.primaryKpiId)
      .map((k) => (allowed.includes(k.code) ? k : { ...k, name: `${k.name} (not used for this channel)` }));
  }, [reference, channelCode, form.primaryKpiId]);
  const kpiFitsChannel = (kpiId: string, code: string | undefined) => {
    const allowed = code ? reference?.kpi_choices_by_channel?.[code] : undefined;
    const kpiCode = reference?.primary_kpis.find((k) => String(k.id) === kpiId)?.code;
    return !kpiId || !allowed || (kpiCode !== undefined && allowed.includes(kpiCode));
  };

  // The event block appears for the Events channel, with required fields set by the sub-channel
  const isEvent = channelCode === EVENTS_CHANNEL_CODE;
  const subChannelCode = reference?.sub_channels.find((s) => String(s.id) === form.subChannelId)?.code;
  const requiredEvent = requiredEventFields(subChannelCode);
  const isOnline = ONLINE_EVENT_SUB_CHANNELS.has(subChannelCode ?? "");
  // Online events lead with platform and link; a location is optional and tucked behind a toggle
  // (it stays visible whenever it has values, so nothing hidden gets saved)
  const [locationOpen, setLocationOpen] = useState(false);
  const hasLocation = Boolean(form.venue || form.city || form.countryCode);
  const locationVisible = locationOpen || hasLocation;
  const showLocation = !isOnline || locationVisible;

  // Goal options follow the funnel stage (Rule 1)
  const goals = useMemo(() => {
    if (!reference || !form.funnelStageId) return [];
    return reference.goals.filter((g) => String(g.funnel_stage_id) === form.funnelStageId);
  }, [reference, form.funnelStageId]);

  // New initiatives can start in any status; existing ones follow the allowed transitions. Draft isn't picked
  // here: it's what "Save as draft" does.
  const statusOptions: InitiativeStatus[] = !initiative
    ? (Object.keys(STATUS_LABELS) as InitiativeStatus[]).filter((s) => s !== "DRAFT")
    : isDraft
      ? STATUS_TRANSITIONS.DRAFT
      : [initiative.status, ...STATUS_TRANSITIONS[initiative.status]];

  const save = (asDraft: boolean) => {
    const problem = validate(form, isEvent, subChannelCode, asDraft);
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
      // A form kept from before markets existed has no market
      market_id: toId(form.marketId ?? ""),
      owner_user_id: owner?.id ?? null,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      budget_amount: form.budget ? Number(form.budget) : null,
      currency: form.currency,
      status: asDraft ? "DRAFT" : form.status,
    };
    // Other channels never send event details. Edits send only the event fields that changed.
    if (isEvent) {
      const event = initiative ? changedEventFields(form, subChannelCode, initiative) : eventFromForm(form, subChannelCode);
      if (event) payload.event = event;
    }

    // The API ignores top-level fields that didn't change, so editing sends the whole form
    setSavingDraft(asDraft);
    mutation.mutate(payload, {
      onSuccess: (saved) => {
        if (!isEdit) discardUnsaved(user?.id);
        if (asDraft) {
          toast.success(`"${saved.name}" saved as a draft`, { description: "Open it any time to finish it." });
        } else {
          toast.success(isDraft ? `"${saved.name}" is set up` : isEdit ? `"${saved.name}" saved` : `"${saved.name}" created`);
        }
        onDone();
      },
      onError: (err) => setError(err instanceof Error ? err.message : "Could not save the initiative."),
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    save(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isDraft ? "Finish draft" : isEdit ? "Edit initiative" : "New initiative"}</DialogTitle>
        <DialogDescription>
          {isDraft
            ? "Fill in what's missing and choose a status, or save it as a draft again for later."
            : isEdit
            ? "Update this initiative's details. Every change is recorded in the audit log."
            : "Add a marketing initiative for any channel. You can add budget details and results later."}
        </DialogDescription>
      </DialogHeader>

      {restored && (
        <div className="-mt-1 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4 shrink-0" aria-hidden />
            Picked up where you left off.
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0" onClick={startOver}>
            Start over
          </Button>
        </div>
      )}

      <form id="initiative-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <FormSection title="Basics">
          <Field label="Name" htmlFor="initiative-name" required className="sm:col-span-2">
            <Input
              id="initiative-name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Facility Expo 2026 - Booth"
              maxLength={255}
              autoFocus
            />
          </Field>
          <Field label="Brand" htmlFor="initiative-brand" required>
            <ReferenceSelect id="initiative-brand" value={form.brandId} items={reference?.brands ?? []} placeholder="Choose a brand" onChange={(v) => set({ brandId: v })} />
          </Field>
          <Field label="Owner" htmlFor="initiative-owner">
            <OwnerPicker id="initiative-owner" value={owner} onChange={setOwner} />
          </Field>
          <Field label="Channel" htmlFor="initiative-channel" required>
            <ReferenceSelect
              id="initiative-channel"
              value={form.channelId}
              items={reference?.channels ?? []}
              placeholder="Choose a channel"
              // A new channel may not include the selected sub-channel
              onChange={(v) => {
                // A KPI that doesn't fit the new channel is cleared rather than saved and rejected
                const newCode = reference?.channels.find((c) => String(c.id) === v)?.code;
                set({ channelId: v, subChannelId: "", ...(kpiFitsChannel(form.primaryKpiId, newCode) ? {} : { primaryKpiId: "" }) });
              }}
            />
          </Field>
          <Field label="Sub-channel" htmlFor="initiative-sub-channel">
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
          <Field label="Market" htmlFor="initiative-market">
            <ReferenceSelect
              id="initiative-market"
              value={form.marketId ?? ""}
              items={reference?.markets ?? []}
              placeholder="Choose a market"
              onChange={(v) => set({ marketId: v })}
              allowNone
              noneLabel="No market"
            />
          </Field>
        </FormSection>

        <FormSection title="Schedule & budget">
          <Field label="Start date" htmlFor="initiative-start">
            <DatePicker id="initiative-start" value={form.startDate} onChange={(v) => set({ startDate: v })} clearable />
          </Field>
          <Field label="End date" htmlFor="initiative-end">
            <DatePicker id="initiative-end" value={form.endDate} min={form.startDate || undefined} onChange={(v) => set({ endDate: v })} clearable />
          </Field>
          <Field label="Budget" htmlFor="initiative-budget">
            <div className="flex">
              <Select value={form.currency} onValueChange={(v) => set({ currency: v })}>
                <SelectTrigger aria-label="Currency" className="w-24 shrink-0 rounded-r-none border-r-0 bg-slate-50 dark:bg-zinc-800/60">
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
              <Input
                id="initiative-budget"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.budget}
                onChange={(e) => set({ budget: e.target.value })}
                placeholder="0.00"
                className="rounded-l-none tabular-nums"
              />
            </div>
          </Field>
          <Field label="Status" htmlFor="initiative-status" required>
            <Select value={form.status} onValueChange={(v) => set({ status: v as InitiativeStatus })}>
              <SelectTrigger id="initiative-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                {statusOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FormSection>

        {isEvent && (
          <section className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                  <CalendarDays className="h-4 w-4" />
                </span>
                Event details
              </h3>
              {initiative?.event_code ? (
                <span
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  title="Generated automatically"
                >
                  {initiative.event_code}
                </span>
              ) : (
                <span className="text-xs text-slate-500 dark:text-zinc-400">Event code is generated when you save</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Event type" htmlFor="initiative-event-type">
                <ReferenceSelect
                  id="initiative-event-type"
                  value={form.eventTypeId}
                  items={reference?.event_types ?? []}
                  placeholder="Choose an event type"
                  onChange={(v) => set({ eventTypeId: v })}
                  allowNone
                />
              </Field>
              <Field label="Region" htmlFor="initiative-region">
                <ReferenceSelect
                  id="initiative-region"
                  value={form.regionId}
                  items={reference?.regions ?? []}
                  placeholder="Choose a region"
                  onChange={(v) => set({ regionId: v })}
                  allowNone
                />
              </Field>
              {isOnline && (
                <>
                  <Field label="Platform" htmlFor="initiative-platform">
                    <Input
                      id="initiative-platform"
                      list="initiative-platform-options"
                      value={form.platform}
                      onChange={(e) => set({ platform: e.target.value })}
                      placeholder="e.g. Zoom"
                      maxLength={80}
                      autoComplete="off"
                    />
                    <datalist id="initiative-platform-options">
                      {EVENT_PLATFORM_SUGGESTIONS.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Event link" htmlFor="initiative-event-url">
                    <Input
                      id="initiative-event-url"
                      type="url"
                      inputMode="url"
                      value={form.eventUrl}
                      onChange={(e) => set({ eventUrl: e.target.value })}
                      placeholder="https://"
                      maxLength={500}
                    />
                  </Field>
                </>
              )}

              {isOnline && (
                <div className="sm:col-span-2">
                  {locationVisible ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-slate-500"
                      // Hiding the location removes it, so nothing is saved that you can't see
                      onClick={() => {
                        setLocationOpen(false);
                        set({ venue: "", city: "", countryCode: "" });
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove location
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-blue-600 dark:text-blue-400" onClick={() => setLocationOpen(true)}>
                      <MapPin className="h-3.5 w-3.5" />
                      Add a location
                    </Button>
                  )}
                </div>
              )}

              {IN_PERSON_EVENT_SUB_CHANNELS.has(subChannelCode ?? "") && (
                <Field label="Booth size" htmlFor="initiative-booth-size" className="sm:col-span-2">
                  <div className="flex gap-2">
                    <Input
                      id="initiative-booth-size"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      value={form.boothSize}
                      onChange={(e) => set({ boothSize: e.target.value })}
                      placeholder={form.boothUnit === "sqft" ? "e.g. 200" : "e.g. 18.6"}
                      className="max-w-40"
                      aria-describedby="initiative-booth-size-hint"
                    />
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      spacing={0}
                      value={form.boothUnit}
                      onValueChange={(v) => v && set({ boothUnit: v as AreaUnit })}
                      aria-label="Booth size unit"
                    >
                      <ToggleGroupItem value="sqm" className={`px-3 ${SELECTED}`}>
                        m²
                      </ToggleGroupItem>
                      <ToggleGroupItem value="sqft" className={`px-3 ${SELECTED}`}>
                        sq ft
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <p id="initiative-booth-size-hint" className="text-xs text-slate-500 dark:text-zinc-400">
                    {form.boothSize.trim() && !boothSizeProblem(form.boothSize)
                      ? boothSizeEquivalent(Number(form.boothSize), form.boothUnit)
                      : "Used to compare cost per m² across events. For example, a 10×20 ft booth is 200 sq ft (18.6 m²)."}
                  </p>
                </Field>
              )}

              {showLocation && (
                <>
                  <Field label="Venue" htmlFor="initiative-venue" className="sm:col-span-2">
                    <Input id="initiative-venue" value={form.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="e.g. Las Vegas Convention Center" maxLength={255} />
                  </Field>
                  <Field label="City" htmlFor="initiative-city" required={requiredEvent.includes("city")}>
                    <Input id="initiative-city" value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="e.g. Las Vegas" maxLength={120} />
                  </Field>
                  <Field label="Country" htmlFor="initiative-country" required={requiredEvent.includes("country_code")}>
                    <CountryPicker id="initiative-country" value={form.countryCode} onChange={(v) => set({ countryCode: v })} />
                  </Field>
                </>
              )}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                <Target className="h-4 w-4" />
              </span>
              Goal
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">What this initiative is for, and the number you'll judge it on.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Funnel stage" htmlFor="initiative-funnel-stage">
              <ReferenceSelect
                id="initiative-funnel-stage"
                value={form.funnelStageId}
                items={reference?.funnel_stages ?? []}
                placeholder="Choose a stage"
                // A new stage may not allow the selected goal
                onChange={(v) => set({ funnelStageId: v, goalId: "" })}
                allowNone
              />
            </Field>
            <Field label="Goal" htmlFor="initiative-goal">
              <ReferenceSelect
                id="initiative-goal"
                value={form.goalId}
                items={goals}
                placeholder={form.funnelStageId ? "Choose a goal" : "Choose a stage first"}
                onChange={(v) => set({ goalId: v })}
                allowNone
                disabled={!form.funnelStageId}
              />
            </Field>
            <Field label="Main KPI" htmlFor="initiative-kpi">
              <ReferenceSelect
                id="initiative-kpi"
                value={form.primaryKpiId}
                items={kpiChoices}
                placeholder="Choose a KPI"
                onChange={(v) => set({ primaryKpiId: v })}
                allowNone
              />
            </Field>
          </div>
        </section>
      </form>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Stays visible while the form scrolls */}
      <DialogFooter className="sticky -bottom-4 z-10 bg-slate-50 dark:bg-zinc-900">
        <span className="mr-auto hidden self-center text-xs text-slate-500 sm:block dark:text-zinc-400">
          <span className="text-red-500">*</span> Required
        </span>
        <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        {(!isEdit || isDraft) && (
          <Button type="button" variant="outline" onClick={() => save(true)} disabled={mutation.isPending}>
            {mutation.isPending && savingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDraft ? "Save draft" : "Save as draft"}
          </Button>
        )}
        <Button type="submit" form="initiative-form" disabled={mutation.isPending}>
          {mutation.isPending && !savingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isDraft ? "Finish and save" : isEdit ? "Save changes" : "Create initiative"}
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
  /** For a new initiative: start in this channel, e.g. "EVENTS" */
  defaultChannelCode?: string;
}

export default function InitiativeFormDialog({ open, onOpenChange, initiative, defaultChannelCode }: InitiativeFormDialogProps) {
  const { user } = useAuth();

  // Closing a new form that has something in it keeps it (see unsavedKey); say so, with a way to throw it away
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next || initiative || !readUnsaved(user?.id)) return;
    toast("Your new initiative is kept", {
      id: "unsaved-initiative",
      description: "Open the form again to pick up where you left off.",
      action: { label: "Discard", onClick: () => discardUnsaved(user?.id) },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <InitiativeForm initiative={initiative} defaultChannelCode={defaultChannelCode} onDone={() => handleOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
