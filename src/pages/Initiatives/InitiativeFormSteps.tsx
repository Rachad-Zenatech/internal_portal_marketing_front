// The wizard's steps. Each gets the whole form and a setter; checks live in initiativeForm.ts.
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Link2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import RequiredMark from "@/components/RequiredMark";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNavanStatus } from "@/hooks/useNavan";
import { countryName } from "@/lib/countries";
import type { DataSource, InitiativeListItem, InitiativeStatus, OwnerOption } from "@/types/initiatives";
import type { ChoiceItem, ReferenceData, ReferenceItem } from "@/types/referenceData";
import CountryPicker from "./CountryPicker";
import {
  type AreaUnit,
  boothSizeInSqm,
  boothSizeProblem,
  EVENT_PLATFORM_SUGGESTIONS,
  IN_PERSON_EVENT_SUB_CHANNELS,
  ONLINE_EVENT_SUB_CHANNELS,
  requiredEventFields,
} from "./eventRules";
import { boothSizeEquivalent, formatBoothSize, formatDates, formatMoney } from "./format";
import { channelContext, EMPTY_LINK, type FormState, type LinkRow, WIZARD_STEPS } from "./initiativeForm";
import { channelFields, choiceName, choicesFor, DATA_SOURCE_LABELS, formatKpiValue, linkSystemName, MAX_DESCRIPTION } from "./initiativeFields";
import OwnerPicker from "./OwnerPicker";
import { STATUS_LABELS } from "./status";

export const CURRENCIES = ["USD", "CAD", "GBP", "AUD", "EUR"];
const NONE = "none";
// The picked option in a segmented control, so it stands out in light and dark
const SELECTED = "data-[state=on]:bg-slate-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900";
const HINT = "text-xs text-muted-foreground";

export interface StepProps {
  form: FormState;
  set: (patch: Partial<FormState>) => void;
  reference: ReferenceData | undefined;
  initiative?: InitiativeListItem;
}

// ─── Building blocks ─────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  className?: string;
  hint?: React.ReactNode;
  hintId?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, required, className, hint, hintId, children }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-foreground/80">
        {label}
        {required && <RequiredMark />}
      </Label>
      {children}
      {hint && (
        <p id={hintId} className={HINT}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function StepIntro({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

interface PickerProps {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
}

function ReferenceSelect({ items, ...props }: PickerProps & { items: ReferenceItem[] }) {
  return <PlainSelect {...props} options={items.map((i) => ({ value: String(i.id), label: i.name }))} />;
}

function ChoiceSelect({ items, ...props }: PickerProps & { items: ChoiceItem[] }) {
  return <PlainSelect {...props} options={items.map((i) => ({ value: i.code, label: i.name }))} />;
}

function PlainSelect({ id, value, options, placeholder, onChange, allowNone, noneLabel = "None", disabled }: PickerProps & { options: { value: string; label: string }[] }) {
  return (
    <Select value={value || (allowNone ? NONE : undefined)} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {allowNone && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A number with the currency in front, e.g. [USD | 5000] */
function MoneyInput({ id, currency, value, onChange, describedBy }: { id: string; currency: string; value: string; onChange: (v: string) => void; describedBy?: string }) {
  return (
    <div className="flex">
      <span className="flex w-16 shrink-0 items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/60 text-sm text-muted-foreground">{currency}</span>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="rounded-l-none tabular-nums"
        aria-describedby={describedBy}
      />
    </div>
  );
}

const defaultMaturity = (reference: ReferenceData | undefined, subChannelId: string) =>
  reference?.evaluation_defaults.find((d) => String(d.sub_channel_id) === subChannelId)?.maturity_days;

// ─── Step 1: Basic information ───────────────────────────────────────────────
export function BasicsStep({ form, set, reference, initiative }: StepProps) {
  const { channelCode, hasSubChannels, subChannelRequired, isEvent } = channelContext(form, reference);
  const subChannels = useMemo(() => {
    const channel = reference?.channels.find((c) => String(c.id) === form.channelId);
    const allowed = new Set(channel?.sub_channel_ids ?? []);
    return (reference?.sub_channels ?? []).filter((s) => allowed.has(s.id));
  }, [reference, form.channelId]);

  // The maturity window follows the sub-channel's default until someone types one in
  const pickSubChannel = (subChannelId: string) => {
    const patch: Partial<FormState> = { subChannelId };
    if (!form.maturityEdited) patch.maturityDays = String(defaultMaturity(reference, subChannelId) ?? "");
    set(patch);
  };

  const fields = channelFields(channelCode);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro>Name the initiative and say where it runs.</StepIntro>
      <Grid>
        <Field label="Initiative name" htmlFor="initiative-name" required className="sm:col-span-2">
          <Input id="initiative-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Facility Expo 2026 booth" maxLength={255} autoFocus />
        </Field>
        <Field label="Brand" htmlFor="initiative-brand" required>
          <ReferenceSelect id="initiative-brand" value={form.brandId} items={reference?.brands ?? []} placeholder="Choose a brand" onChange={(v) => set({ brandId: v })} />
        </Field>
        <Field label="Channel" htmlFor="initiative-channel" required>
          <ReferenceSelect
            id="initiative-channel"
            value={form.channelId}
            items={reference?.channels ?? []}
            placeholder="Choose a channel"
            // A new channel may not include the selected sub-channel, and has its own extra fields
            onChange={(v) => set({ channelId: v, subChannelId: "", channelDetails: {}, ...(form.maturityEdited ? {} : { maturityDays: "" }) })}
          />
        </Field>
        <Field label="Sub-channel" htmlFor="initiative-sub-channel" required={subChannelRequired} className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
          <ReferenceSelect
            id="initiative-sub-channel"
            value={form.subChannelId}
            items={subChannels}
            placeholder={!form.channelId ? "Choose a channel first" : hasSubChannels ? "Choose a sub-channel" : "This channel has no sub-channels"}
            onChange={pickSubChannel}
            disabled={!form.channelId || !hasSubChannels}
          />
        </Field>
        <Field
          label="Description"
          htmlFor="initiative-description"
          className="sm:col-span-2"
          hint={`${form.description.length} of ${MAX_DESCRIPTION} characters`}
        >
          <Textarea
            id="initiative-description"
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="What is this initiative and who is it for?"
            maxLength={MAX_DESCRIPTION}
            rows={3}
          />
        </Field>
      </Grid>

      {fields.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">{reference?.channels.find((c) => c.code === channelCode)?.name} details</h3>
          <Grid>
            {fields.map((field) => {
              const id = `initiative-detail-${field.key}`;
              const value = form.channelDetails[field.key] ?? "";
              const change = (v: string) => set({ channelDetails: { ...form.channelDetails, [field.key]: v } });
              return (
                <Field key={field.key} label={field.label} htmlFor={id} hint={field.hint}>
                  {field.kind === "choice" ? (
                    <ChoiceSelect id={id} value={value} items={choicesFor(reference, field.key)} placeholder={`Choose ${field.label.toLowerCase()}`} onChange={change} allowNone />
                  ) : (
                    <Input id={id} value={value} onChange={(e) => change(e.target.value)} placeholder={field.placeholder} maxLength={field.maxLength} />
                  )}
                </Field>
              );
            })}
          </Grid>
        </section>
      )}

      {isEvent && <EventFields form={form} set={set} reference={reference} initiative={initiative} />}
    </div>
  );
}

function EventFields({ form, set, reference, initiative }: StepProps) {
  const { subChannelCode } = channelContext(form, reference);
  const requiredEvent = requiredEventFields(subChannelCode);
  const isOnline = ONLINE_EVENT_SUB_CHANNELS.has(subChannelCode ?? "");
  const inPerson = IN_PERSON_EVENT_SUB_CHANNELS.has(subChannelCode ?? "");
  // Online events lead with platform and link; a location is optional and tucked behind a toggle
  // (it stays visible whenever it has values, so nothing hidden gets saved)
  const [locationOpen, setLocationOpen] = useState(false);
  const locationVisible = locationOpen || Boolean(form.venue || form.city || form.countryCode);
  const showLocation = !isOnline || locationVisible;

  // Navan events from the last sync, to pick from; the one in use is the typed name, or else the event's own name
  const { data: navan } = useNavanStatus(true);
  const navanEvents = navan?.last_run_summary?.events ?? [];
  const navanTyped = form.navanEvent.trim();
  const navanName = (navanTyped || form.name.trim()).toLowerCase();
  const navanMatch = navanName ? navanEvents.find((e) => e.name.toLowerCase() === navanName) : undefined;
  const navanTaken = navanMatch?.link === "SET" && navanMatch.initiative_id !== (initiative?.id ?? null);
  const navanHint = navanTaken
    ? `As of the last Navan sync, that Navan event is linked to ${navanMatch?.initiative_name}.`
    : navanMatch
      ? `${navanMatch.bookings} active ${navanMatch.bookings === 1 ? "booking" : "bookings"} in Navan (${navanMatch.totals.map((t) => formatMoney(t.amount, t.currency)).join(", ") || "nothing spent"}). The total is added to this event's travel costs and updates automatically.`
      : navanTyped
        ? "No Navan bookings for this event name yet. Use the name exactly as it is in Navan."
        : "Leave empty to use the Navan event with the same name as this event. Its bookings' total is added to the travel costs.";

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Event details
        </h3>
        {initiative?.event_code ? (
          <span className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground" title="Generated automatically">
            {initiative.event_code}
          </span>
        ) : (
          <span className={HINT}>The event code is generated when you save</span>
        )}
      </div>
      <Grid>
        <Field label="Event type" htmlFor="initiative-event-type">
          <ReferenceSelect id="initiative-event-type" value={form.eventTypeId} items={reference?.event_types ?? []} placeholder="Choose an event type" onChange={(v) => set({ eventTypeId: v })} allowNone />
        </Field>
        <Field label="Region" htmlFor="initiative-region">
          <ReferenceSelect id="initiative-region" value={form.regionId} items={reference?.regions ?? []} placeholder="Choose a region" onChange={(v) => set({ regionId: v })} allowNone />
        </Field>
        {isOnline && (
          <>
            <Field label="Platform" htmlFor="initiative-platform">
              <Input id="initiative-platform" list="initiative-platform-options" value={form.platform} onChange={(e) => set({ platform: e.target.value })} placeholder="e.g. Zoom" maxLength={80} autoComplete="off" />
              <datalist id="initiative-platform-options">
                {EVENT_PLATFORM_SUGGESTIONS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
            <Field label="Event link" htmlFor="initiative-event-url">
              <Input id="initiative-event-url" type="url" inputMode="url" value={form.eventUrl} onChange={(e) => set({ eventUrl: e.target.value })} placeholder="https://" maxLength={500} />
            </Field>
            <div className="sm:col-span-2">
              {locationVisible ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-muted-foreground"
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
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-primary" onClick={() => setLocationOpen(true)}>
                  <MapPin className="h-3.5 w-3.5" />
                  Add a location
                </Button>
              )}
            </div>
          </>
        )}
        {inPerson && (
          <Field
            label="Booth size"
            htmlFor="initiative-booth-size"
            className="sm:col-span-2"
            hintId="initiative-booth-size-hint"
            hint={
              form.boothSize.trim() && !boothSizeProblem(form.boothSize)
                ? boothSizeEquivalent(Number(form.boothSize), form.boothUnit)
                : "Used to compare cost per m² across events. For example, a 10 x 20 ft booth is 200 sq ft (18.6 m²)."
            }
          >
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
              <ToggleGroup type="single" variant="outline" size="sm" spacing={0} value={form.boothUnit} onValueChange={(v) => v && set({ boothUnit: v as AreaUnit })} aria-label="Booth size unit">
                <ToggleGroupItem value="sqm" className={`px-3 ${SELECTED}`}>
                  m²
                </ToggleGroupItem>
                <ToggleGroupItem value="sqft" className={`px-3 ${SELECTED}`}>
                  sq ft
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
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
        <Field label="Navan event" htmlFor="initiative-navan-event" className="sm:col-span-2" hint={navanHint} hintId="initiative-navan-event-hint">
          <Input
            id="initiative-navan-event"
            list="initiative-navan-events"
            value={form.navanEvent}
            onChange={(e) => set({ navanEvent: e.target.value })}
            placeholder={form.name.trim() || "Same as the event name"}
            maxLength={255}
            aria-describedby="initiative-navan-event-hint"
          />
          <datalist id="initiative-navan-events">
            {navanEvents.map((e) => (
              <option key={e.name} value={e.name} />
            ))}
          </datalist>
        </Field>
      </Grid>
    </section>
  );
}

// ─── Step 2: Budget & timeline ───────────────────────────────────────────────
interface BudgetStepProps extends StepProps {
  owner: OwnerOption | null;
  setOwner: (owner: OwnerOption) => void;
  statusOptions: InitiativeStatus[];
}

export function BudgetStep({ form, set, reference, owner, setOwner, statusOptions }: BudgetStepProps) {
  const { isEvent } = channelContext(form, reference);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro>Set the money, the dates and who is responsible.</StepIntro>
      <Grid>
        <Field label="Allocated budget" htmlFor="initiative-budget" required hint="0 is fine if there is no budget yet.">
          <Input
            id="initiative-budget"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.budget}
            onChange={(e) => set({ budget: e.target.value })}
            placeholder="0.00"
            className="tabular-nums"
          />
        </Field>
        <Field label="Currency" htmlFor="initiative-currency" required>
          <PlainSelect
            id="initiative-currency"
            value={form.currency}
            options={Array.from(new Set([...CURRENCIES, form.currency])).map((c) => ({ value: c, label: c }))}
            placeholder="Choose a currency"
            onChange={(v) => set({ currency: v })}
          />
        </Field>
        <Field
          label="Start date"
          htmlFor="initiative-start"
          hint={
            form.startDate ? undefined : (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Recommended. Without a start date it shows as needing review.
              </span>
            )
          }
        >
          <DatePicker id="initiative-start" value={form.startDate} onChange={(v) => set({ startDate: v })} clearable />
        </Field>
        <Field label="End date" htmlFor="initiative-end">
          <DatePicker id="initiative-end" value={form.endDate} min={form.startDate || undefined} onChange={(v) => set({ endDate: v })} clearable />
        </Field>
        <Field label="Owner" htmlFor="initiative-owner" required>
          <OwnerPicker id="initiative-owner" value={owner} onChange={setOwner} />
        </Field>
        <Field label="Status" htmlFor="initiative-status">
          <PlainSelect id="initiative-status" value={form.status} options={statusOptions.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} placeholder="Choose a status" onChange={(v) => set({ status: v as InitiativeStatus })} />
        </Field>
        <Field label="Market" htmlFor="initiative-market" hint="Which monthly budget its costs count against.">
          <ReferenceSelect id="initiative-market" value={form.marketId} items={reference?.markets ?? []} placeholder="Choose a market" onChange={(v) => set({ marketId: v })} allowNone noneLabel="No market" />
        </Field>
      </Grid>
      {isEvent && (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Event travel</h3>
          <Grid>
            <Field
              label="Travel budget"
              htmlFor="initiative-travel-budget"
              hintId="initiative-travel-budget-hint"
              hint="Flights, hotels, ground transport and per diems you plan to spend. Navan bookings are compared with it. Must be less than the event budget."
            >
              <MoneyInput id="initiative-travel-budget" currency={form.currency} value={form.travelBudget} onChange={(v) => set({ travelBudget: v })} describedBy="initiative-travel-budget-hint" />
            </Field>
            <Field
              label="Navan estimate"
              htmlFor="initiative-navan-estimate"
              hintId="initiative-navan-estimate-hint"
              hint={'The "estimated" amount on the event\'s Navan page. Navan doesn\'t share it through its API yet, so copy it here.'}
            >
              <MoneyInput id="initiative-navan-estimate" currency={form.currency} value={form.navanEstimate} onChange={(v) => set({ navanEstimate: v })} describedBy="initiative-navan-estimate-hint" />
            </Field>
          </Grid>
        </section>
      )}
    </div>
  );
}

// ─── Step 3: Objectives & KPIs ───────────────────────────────────────────────
export function ObjectivesStep({ form, set, reference }: StepProps) {
  const goals = useMemo(() => (reference?.goals ?? []).filter((g) => String(g.funnel_stage_id) === form.funnelStageId), [reference, form.funnelStageId]);
  const kpi = reference?.primary_kpis?.find((k) => String(k.id) === form.primaryKpiId);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro>All optional. The primary KPI is shown with its target; whether it was worth it is still judged on return on investment.</StepIntro>
      <Grid>
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
        <Field label="Primary KPI" htmlFor="initiative-kpi">
          <ReferenceSelect
            id="initiative-kpi"
            value={form.primaryKpiId}
            items={reference?.primary_kpis ?? []}
            placeholder="Choose a KPI"
            // No KPI, no target
            onChange={(v) => set(v ? { primaryKpiId: v } : { primaryKpiId: "", kpiTarget: "" })}
            allowNone
          />
        </Field>
        <Field label="KPI target" htmlFor="initiative-kpi-target" hint={kpi ? undefined : "Choose a KPI first."}>
          <div className="flex">
            {kpi?.unit === "MONEY" && (
              <span className="flex w-16 shrink-0 items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/60 text-sm text-muted-foreground">{form.currency}</span>
            )}
            <Input
              id="initiative-kpi-target"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.kpiTarget}
              onChange={(e) => set({ kpiTarget: e.target.value })}
              placeholder={kpi?.unit === "PERCENT" ? "e.g. 2.5" : "e.g. 100"}
              disabled={!kpi}
              className={`tabular-nums ${kpi?.unit === "MONEY" ? "rounded-l-none" : ""} ${kpi?.unit === "PERCENT" ? "rounded-r-none" : ""}`}
            />
            {kpi?.unit === "PERCENT" && (
              <span className="flex w-10 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-input bg-muted/60 text-sm text-muted-foreground">%</span>
            )}
          </div>
        </Field>
      </Grid>
    </div>
  );
}

// ─── Step 4: Data source & integrations ─────────────────────────────────────
const DATA_SOURCE_OPTIONS: { value: DataSource; title: string; text: string }[] = [
  { value: "LINKED", title: "Link an existing external campaign", text: "Results and spend can come from HubSpot or an ad platform." },
  { value: "MANUAL", title: "Enter results manually", text: "Type in results each month on the initiative's page." },
  { value: "LATER", title: "Connect a data source later", text: "Decide later. It shows as needing review if nothing is tracked." },
];

export function DataSourceStep({ form, set, reference }: StepProps) {
  const systems = choicesFor(reference, "link_system");
  const updateLink = (index: number, patch: Partial<LinkRow>) => set({ links: form.links.map((l, i) => (i === index ? { ...l, ...patch } : l)) });
  const removeLink = (index: number) => {
    const rest = form.links.filter((_, i) => i !== index);
    set({ links: rest.length ? rest : [{ ...EMPTY_LINK }] });
  };
  return (
    <div className="flex flex-col gap-5">
      <StepIntro>Where this initiative's results will come from.</StepIntro>
      <div role="radiogroup" aria-label="Data source" className="flex flex-col gap-2">
        {DATA_SOURCE_OPTIONS.map((option) => {
          const checked = form.dataSource === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
            >
              <input
                type="radio"
                name="initiative-data-source"
                value={option.value}
                checked={checked}
                onChange={() => set({ dataSource: option.value })}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.text}</span>
              </span>
            </label>
          );
        })}
      </div>

      {form.dataSource === "LINKED" && (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Linked campaigns
          </h3>
          <p className={HINT}>Each external campaign can belong to one initiative only.</p>
          {form.links.map((link, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:border-0 sm:p-0">
              <Field label="System" htmlFor={`initiative-link-${index}-system`} required>
                <ChoiceSelect
                  id={`initiative-link-${index}-system`}
                  value={link.system}
                  items={systems}
                  placeholder="Choose a system"
                  onChange={(v) => updateLink(index, { system: v as LinkRow["system"] })}
                />
              </Field>
              <Field label="Campaign ID" htmlFor={`initiative-link-${index}-id`} required>
                <Input id={`initiative-link-${index}-id`} value={link.externalId} onChange={(e) => updateLink(index, { externalId: e.target.value })} placeholder="e.g. 1234567890" maxLength={100} />
              </Field>
              <Field label="Account ID" htmlFor={`initiative-link-${index}-account`}>
                <Input id={`initiative-link-${index}-account`} value={link.accountId} onChange={(e) => updateLink(index, { accountId: e.target.value })} placeholder="Optional" maxLength={100} />
              </Field>
              <Button type="button" variant="ghost" size="icon" className="justify-self-end text-muted-foreground" onClick={() => removeLink(index)} aria-label={`Remove campaign ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => set({ links: [...form.links, { ...EMPTY_LINK }] })}>
            <Plus className="h-4 w-4" />
            Add another campaign
          </Button>
        </section>
      )}
    </div>
  );
}

// ─── Step 5: Evaluation settings ─────────────────────────────────────────────
export function EvaluationStep({ form, set, reference }: StepProps) {
  const fallback = defaultMaturity(reference, form.subChannelId);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro>Advanced. How long to wait before judging whether it was worth it.</StepIntro>
      <Grid>
        <Field
          label="Maturity window (days)"
          htmlFor="initiative-maturity"
          hint={fallback !== undefined ? `The default for this sub-channel is ${fallback} days. Deals need time to close before the verdict.` : "From 0 to 730 days. Deals need time to close before the verdict."}
        >
          <Input
            id="initiative-maturity"
            type="number"
            inputMode="numeric"
            min={0}
            max={730}
            step={1}
            value={form.maturityDays}
            onChange={(e) => set({ maturityDays: e.target.value, maturityEdited: true })}
            placeholder={fallback !== undefined ? String(fallback) : "e.g. 180"}
            className="tabular-nums"
          />
        </Field>
        <Field label="Revenue basis" htmlFor="initiative-revenue-basis" hint="Return on investment is worked out from closed revenue.">
          <Input id="initiative-revenue-basis" value="Closed revenue" readOnly disabled />
        </Field>
      </Grid>
    </div>
  );
}

// ─── Review ──────────────────────────────────────────────────────────────────
function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Row({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{value || <span className="text-muted-foreground">Not set</span>}</dd>
    </div>
  );
}

interface ReviewStepProps extends StepProps {
  owner: OwnerOption | null;
  goTo: (step: number) => void;
}

export function ReviewStep({ form, reference, owner, goTo }: ReviewStepProps) {
  const { channel, channelCode, subChannelCode, isEvent } = channelContext(form, reference);
  const byId = (items: ReferenceItem[] | undefined, id: string) => items?.find((i) => String(i.id) === id)?.name;
  const kpi = reference?.primary_kpis?.find((k) => String(k.id) === form.primaryKpiId);
  const money = (value: string) => (value === "" ? null : formatMoney(Number(value), form.currency));
  const links = form.links.filter((l) => l.system && l.externalId.trim());
  const inPerson = IN_PERSON_EVENT_SUB_CHANNELS.has(subChannelCode ?? "");
  const place = [form.venue, form.city, countryName(form.countryCode)].filter(Boolean).join(", ");
  return (
    <div className="flex flex-col gap-4">
      <StepIntro>Check the details before you save. You can change any of them later.</StepIntro>
      <ReviewSection title={WIZARD_STEPS[0].title} onEdit={() => goTo(0)}>
        <Row label="Initiative name" value={form.name.trim()} wide />
        <Row label="Brand" value={byId(reference?.brands, form.brandId)} />
        <Row label="Channel" value={[channel?.name, byId(reference?.sub_channels, form.subChannelId)].filter(Boolean).join(" / ")} />
        <Row label="Description" value={form.description.trim()} wide />
        {channelFields(channelCode).map((field) => {
          const value = form.channelDetails[field.key]?.trim();
          return <Row key={field.key} label={field.label} value={field.kind === "choice" ? choiceName(reference, field.key, value) : value} />;
        })}
        {isEvent && (
          <>
            <Row label="Event type" value={byId(reference?.event_types, form.eventTypeId)} />
            <Row label="Region" value={byId(reference?.regions, form.regionId)} />
            {(place || !ONLINE_EVENT_SUB_CHANNELS.has(subChannelCode ?? "")) && <Row label="Location" value={place} />}
            {ONLINE_EVENT_SUB_CHANNELS.has(subChannelCode ?? "") && <Row label="Platform" value={[form.platform.trim(), form.eventUrl.trim()].filter(Boolean).join(", ")} />}
            {inPerson && form.boothSize && !boothSizeProblem(form.boothSize) && (
              <Row label="Booth size" value={formatBoothSize(boothSizeInSqm(form.boothSize, form.boothUnit) ?? 0)} />
            )}
            <Row label="Navan event" value={form.navanEvent.trim() || (form.name.trim() ? `${form.name.trim()} (same name)` : null)} />
          </>
        )}
      </ReviewSection>
      <ReviewSection title={WIZARD_STEPS[1].title} onEdit={() => goTo(1)}>
        <Row label="Allocated budget" value={money(form.budget)} />
        <Row label="Dates" value={form.startDate || form.endDate ? formatDates(form.startDate || null, form.endDate || null) : null} />
        <Row label="Owner" value={owner?.full_name || owner?.email} />
        <Row label="Status" value={STATUS_LABELS[form.status]} />
        <Row label="Market" value={byId(reference?.markets, form.marketId)} />
        {isEvent && (
          <>
            <Row label="Travel budget" value={money(form.travelBudget)} />
            <Row label="Navan estimate" value={money(form.navanEstimate)} />
          </>
        )}
      </ReviewSection>
      <ReviewSection title={WIZARD_STEPS[2].title} onEdit={() => goTo(2)}>
        <Row label="Funnel stage" value={byId(reference?.funnel_stages, form.funnelStageId)} />
        <Row label="Goal" value={byId(reference?.goals, form.goalId)} />
        <Row label="Primary KPI" value={kpi?.name} />
        <Row label="KPI target" value={kpi && form.kpiTarget !== "" ? formatKpiValue(Number(form.kpiTarget), kpi.unit, form.currency) : null} />
      </ReviewSection>
      <ReviewSection title={WIZARD_STEPS[3].title} onEdit={() => goTo(3)}>
        <Row label="Data source" value={DATA_SOURCE_LABELS[form.dataSource]} wide />
        {form.dataSource === "LINKED" && (
          <Row
            label="Linked campaigns"
            wide
            value={
              links.length ? (
                <ul className="flex flex-col gap-1">
                  {links.map((l, i) => (
                    <li key={i}>
                      {linkSystemName(reference, l.system)}: {l.externalId.trim()}
                      {l.accountId.trim() && <span className="text-muted-foreground"> (account {l.accountId.trim()})</span>}
                    </li>
                  ))}
                </ul>
              ) : null
            }
          />
        )}
      </ReviewSection>
      <ReviewSection title={WIZARD_STEPS[4].title} onEdit={() => goTo(4)}>
        <Row
          label="Maturity window"
          value={form.maturityDays !== "" ? `${form.maturityDays} days` : defaultMaturity(reference, form.subChannelId) !== undefined ? `${defaultMaturity(reference, form.subChannelId)} days (default)` : "Default"}
        />
        <Row label="Revenue basis" value="Closed revenue" />
      </ReviewSection>
    </div>
  );
}
