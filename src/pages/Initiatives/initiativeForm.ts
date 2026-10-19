// The create/edit wizard's state: what's typed, how it's kept in the browser, checked, and turned into an API body
import { appStorage } from "@/lib/storage";
import type {
  ChannelDetails,
  DataSource,
  EventDetailsInput,
  InitiativeCreate,
  InitiativeListItem,
  InitiativeStatus,
  LinkSystem,
  OwnerOption,
} from "@/types/initiatives";
import type { ReferenceData } from "@/types/referenceData";
import {
  type AreaUnit,
  boothSizeInSqm,
  boothSizeProblem,
  EVENTS_CHANNEL_CODE,
  eventUrlProblem,
  IN_PERSON_EVENT_SUB_CHANNELS,
  missingEventFields,
} from "./eventRules";
import { channelFieldProblem, channelFields, MAX_DESCRIPTION } from "./initiativeFields";

export const WIZARD_STEPS = [
  { title: "Basic Information", short: "Basics" },
  { title: "Budget & Timeline", short: "Budget" },
  { title: "Objectives & KPIs", short: "Objectives" },
  { title: "Data Source & Integrations", short: "Data source" },
  { title: "Evaluation Settings", short: "Evaluation" },
  { title: "Review", short: "Review" },
] as const;
export const REVIEW_STEP = WIZARD_STEPS.length - 1;

export interface LinkRow {
  system: LinkSystem | "";
  externalId: string;
  accountId: string;
}

export interface FormState {
  name: string;
  brandId: string;
  channelId: string;
  subChannelId: string;
  description: string;
  /** Channel-specific fields (see CHANNEL_FIELDS), by key */
  channelDetails: Record<string, string>;
  funnelStageId: string;
  goalId: string;
  primaryKpiId: string;
  kpiTarget: string;
  marketId: string;
  startDate: string;
  endDate: string;
  budget: string;
  currency: string;
  status: InitiativeStatus;
  dataSource: DataSource;
  links: LinkRow[];
  maturityDays: string;
  /** Once the maturity window is typed in, a new sub-channel no longer replaces it with its default */
  maturityEdited: boolean;
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
  // Planned travel spend: part of the budget, in the same currency; Navan costs are compared with it
  travelBudget: string;
  // The Navan event its bookings come from; empty means the Navan event with the same name
  navanEvent: string;
  // Navan's estimated travel cost, copied from its group event page
  navanEstimate: string;
}

export const EMPTY_LINK: LinkRow = { system: "", externalId: "", accountId: "" };

export const EMPTY_FORM: FormState = {
  name: "",
  brandId: "",
  channelId: "",
  subChannelId: "",
  description: "",
  channelDetails: {},
  funnelStageId: "",
  goalId: "",
  primaryKpiId: "",
  kpiTarget: "",
  marketId: "",
  startDate: "",
  endDate: "",
  budget: "",
  currency: "USD",
  status: "PLANNED",
  dataSource: "MANUAL",
  links: [{ ...EMPTY_LINK }],
  maturityDays: "",
  maturityEdited: false,
  eventTypeId: "",
  venue: "",
  city: "",
  countryCode: "",
  regionId: "",
  platform: "",
  eventUrl: "",
  boothSize: "",
  boothUnit: "sqm",
  travelBudget: "",
  navanEvent: "",
  navanEstimate: "",
};

// ─── Kept in the browser ─────────────────────────────────────────────────────
// A new initiative's form is kept in the browser while it's being filled in, so closing it by accident
// (or a page refresh) loses nothing. It's cleared once the initiative or draft is saved, or on "Start over".
const unsavedKey = (userId: string | undefined) => `marketing.unsavedInitiative.${userId ?? "anonymous"}`;

export interface UnsavedForm {
  form: FormState;
  owner: OwnerOption | null;
  step?: number;
}

// Anything typed or picked; a preset channel and the defaults don't count
const UNTYPED_FIELDS = new Set<keyof FormState>(["channelId", "currency", "status", "boothUnit", "dataSource", "maturityDays", "maturityEdited"]);

export function hasContent(form: FormState) {
  return (Object.keys(form) as (keyof FormState)[]).some((field) => {
    if (UNTYPED_FIELDS.has(field)) return false;
    const value = form[field];
    if (field === "links") return form.links.some((l) => l.system || l.externalId.trim() || l.accountId.trim());
    if (field === "channelDetails") return Object.values(form.channelDetails).some((v) => v.trim());
    return value !== "";
  });
}

export function readUnsaved(userId: string | undefined): UnsavedForm | null {
  try {
    const raw = appStorage.getItem(unsavedKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as UnsavedForm;
    // Only the fields the form has today: an older form may hold ones since removed
    const known = Object.entries(saved.form ?? {}).filter(([field]) => field in EMPTY_FORM);
    const form = { ...EMPTY_FORM, ...Object.fromEntries(known) } as FormState;
    if (!Array.isArray(form.links) || form.links.length === 0) form.links = [{ ...EMPTY_LINK }];
    if (typeof form.channelDetails !== "object" || form.channelDetails === null) form.channelDetails = {};
    return hasContent(form) ? { form, owner: saved.owner ?? null, step: saved.step } : null;
  } catch {
    return null;
  }
}

export function keepUnsaved(userId: string | undefined, unsaved: UnsavedForm) {
  appStorage.setItem(unsavedKey(userId), JSON.stringify(unsaved));
}

export function discardUnsaved(userId: string | undefined) {
  appStorage.removeItem(unsavedKey(userId));
}

// ─── From and to the API ─────────────────────────────────────────────────────
const idText = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const amountText = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

export function formFromInitiative(item: InitiativeListItem, maturityDays?: number): FormState {
  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(item.channel_details ?? {})) if (value) details[key] = String(value);
  const links = (item.links ?? []).map((l) => ({ system: l.system, externalId: l.external_id, accountId: l.account_id ?? "" }));
  return {
    name: item.name,
    brandId: String(item.brand_id),
    channelId: String(item.channel_id),
    subChannelId: idText(item.sub_channel_id),
    description: item.description ?? "",
    channelDetails: details,
    funnelStageId: idText(item.funnel_stage_id),
    goalId: idText(item.goal_id),
    primaryKpiId: idText(item.primary_kpi_id ?? item.primary_kpi?.id),
    kpiTarget: amountText(item.kpi_target),
    marketId: idText(item.market_id),
    startDate: item.start_date ?? "",
    endDate: item.end_date ?? "",
    budget: amountText(item.budget_amount),
    currency: item.currency,
    // Finishing a draft picks a real status; Planned to start with
    status: item.status === "DRAFT" ? "PLANNED" : item.status,
    dataSource: item.data_source ?? (links.length ? "LINKED" : "MANUAL"),
    links: links.length ? links : [{ ...EMPTY_LINK }],
    maturityDays: maturityDays === undefined ? "" : String(maturityDays),
    maturityEdited: maturityDays !== undefined,
    eventTypeId: idText(item.event_type_id),
    venue: item.venue ?? "",
    city: item.city ?? "",
    countryCode: item.country_code ?? "",
    regionId: idText(item.region_id),
    platform: item.platform ?? "",
    eventUrl: item.event_url ?? "",
    boothSize: amountText(item.booth_size_sqm),
    boothUnit: "sqm",
    travelBudget: amountText(item.travel_budget_amount),
    navanEvent: item.navan_event_name ?? "",
    navanEstimate: amountText(item.navan_estimate_amount),
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
    travel_budget_amount: form.travelBudget ? Number(form.travelBudget) : null,
    navan_event_name: toText(form.navanEvent),
    navan_estimate_amount: form.navanEstimate ? Number(form.navanEstimate) : null,
  };
}

// Only the event fields that differ from the saved initiative, or undefined if none do
function changedEventFields(form: FormState, subChannelCode: string | undefined, initiative: InitiativeListItem): EventDetailsInput | undefined {
  const changed = Object.fromEntries(
    Object.entries(eventFromForm(form, subChannelCode)).filter(([field, value]) => value !== initiative[field as keyof EventDetailsInput]),
  );
  return Object.keys(changed).length ? changed : undefined;
}

/** What the form knows about the picked channel and sub-channel */
export function channelContext(form: FormState, reference: ReferenceData | undefined) {
  const channel = reference?.channels.find((c) => String(c.id) === form.channelId);
  const subChannelCode = reference?.sub_channels.find((s) => String(s.id) === form.subChannelId)?.code;
  return {
    channel,
    channelCode: channel?.code,
    subChannelCode,
    hasSubChannels: Boolean(channel?.sub_channel_ids.length),
    // The back end's rule: required only when there's a real choice besides Other
    subChannelRequired: channel?.sub_channel_required ?? Boolean(channel?.sub_channel_ids.length),
    isEvent: channel?.code === EVENTS_CHANNEL_CODE,
  };
}

interface PayloadOptions {
  asDraft: boolean;
  owner: OwnerOption | null;
  reference: ReferenceData | undefined;
  initiative?: InitiativeListItem;
  /** The maturity window saved for an initiative being edited; only a change is sent */
  savedMaturityDays?: number;
}

export function payloadFromForm(form: FormState, { asDraft, owner, reference, initiative, savedMaturityDays }: PayloadOptions): InitiativeCreate {
  const { channelCode, subChannelCode, isEvent } = channelContext(form, reference);
  // Only the current channel's fields; switching channel drops the old ones
  const details: ChannelDetails = {};
  for (const field of channelFields(channelCode)) {
    const value = (form.channelDetails[field.key] ?? "").trim();
    if (value) details[field.key] = value;
  }
  const linked = form.dataSource === "LINKED";
  const payload: InitiativeCreate = {
    name: form.name.trim(),
    brand_id: Number(form.brandId),
    channel_id: Number(form.channelId),
    sub_channel_id: toId(form.subChannelId),
    description: toText(form.description),
    funnel_stage_id: toId(form.funnelStageId),
    goal_id: toId(form.goalId),
    primary_kpi_id: toId(form.primaryKpiId),
    // A target only means something with a KPI
    kpi_target: form.primaryKpiId && form.kpiTarget !== "" ? Number(form.kpiTarget) : null,
    market_id: toId(form.marketId),
    owner_user_id: owner?.id ?? null,
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    budget_amount: form.budget !== "" ? Number(form.budget) : null,
    currency: form.currency,
    status: asDraft ? "DRAFT" : form.status,
    channel_details: details,
    data_source: form.dataSource,
    // The whole set replaces what's saved; results typed in or connected later have none
    links: linked
      ? form.links
          .filter((l) => l.system && l.externalId.trim())
          .map((l) => ({ system: l.system as LinkSystem, external_id: l.externalId.trim(), account_id: toText(l.accountId) }))
      : [],
  };
  const maturity = form.maturityDays === "" ? undefined : Number(form.maturityDays);
  if (maturity !== undefined && maturity !== savedMaturityDays) payload.evaluation = { maturity_days: maturity };
  // Other channels never send event details. Edits send only the event fields that changed.
  if (isEvent) {
    const event = initiative ? changedEventFields(form, subChannelCode, initiative) : eventFromForm(form, subChannelCode);
    if (event) payload.event = event;
  }
  return payload;
}

// ─── Checks ──────────────────────────────────────────────────────────────────
export interface FormProblem {
  step: number;
  message: string;
  /** The field to point at, by id */
  field?: string;
}

// The travel budget is part of the event budget, so it has to be smaller. A draft can leave the budget empty.
function travelBudgetProblem(budget: string, travelBudget: string, draft: boolean): string | null {
  if (!travelBudget) return null;
  const travel = Number(travelBudget);
  if (Number.isNaN(travel) || travel < 0) return "Travel budget must be 0 or more.";
  if (!budget) return draft ? null : "Set the event budget before the travel budget.";
  if (travel >= Number(budget)) return "The travel budget has to be smaller than the event budget.";
  return null;
}

const notAmount = (value: string) => value !== "" && (Number.isNaN(Number(value)) || Number(value) < 0);

/**
 * Same rules the API enforces, checked first so people get instant feedback, for one step.
 * A draft needs only a name, brand and channel; anything filled in still has to be valid.
 */
export function stepProblem(step: number, form: FormState, reference: ReferenceData | undefined, owner: OwnerOption | null, draft = false): FormProblem | null {
  const { channelCode, subChannelCode, subChannelRequired, isEvent } = channelContext(form, reference);
  const problem = (message: string, field?: string): FormProblem => ({ step, message, field });
  if (step === 0) {
    if (!form.name.trim()) return problem(draft ? "Enter a name to save a draft." : "Enter a name.", "initiative-name");
    if (!form.brandId) return problem(draft ? "Choose a brand to save a draft." : "Choose a brand.", "initiative-brand");
    if (!form.channelId) return problem(draft ? "Choose a channel to save a draft." : "Choose a channel.", "initiative-channel");
    if (!draft && subChannelRequired && !form.subChannelId) return problem("Choose a sub-channel.", "initiative-sub-channel");
    if (form.description.length > MAX_DESCRIPTION) return problem(`The description can be up to ${MAX_DESCRIPTION} characters.`, "initiative-description");
    for (const field of channelFields(channelCode)) {
      const message = channelFieldProblem(field, form.channelDetails[field.key] ?? "");
      if (message) return problem(message, `initiative-detail-${field.key}`);
    }
    if (isEvent) {
      const missing = draft ? null : missingEventFields(subChannelCode, { city: form.city, country_code: form.countryCode });
      if (missing) return problem(missing, form.city.trim() ? "initiative-country" : "initiative-city");
      if (!IN_PERSON_EVENT_SUB_CHANNELS.has(subChannelCode ?? "")) {
        const urlProblem = eventUrlProblem(form.eventUrl);
        if (urlProblem) return problem(urlProblem, "initiative-event-url");
      }
      const boothProblem = boothSizeProblem(form.boothSize);
      if (boothProblem) return problem(boothProblem, "initiative-booth-size");
    }
    return null;
  }
  if (step === 1) {
    if (!draft && form.budget === "") return problem("Enter the allocated budget (0 is fine).", "initiative-budget");
    if (notAmount(form.budget)) return problem("Budget must be 0 or more.", "initiative-budget");
    if (!form.currency) return problem("Choose a currency.", "initiative-currency");
    if (form.startDate && form.endDate && form.endDate < form.startDate) return problem("End date can't be before the start date.", "initiative-end");
    if (!draft && !owner) return problem("Choose an owner.", "initiative-owner");
    if (isEvent) {
      const travelProblem = travelBudgetProblem(form.budget, form.travelBudget, draft);
      if (travelProblem) return problem(travelProblem, "initiative-travel-budget");
      if (notAmount(form.navanEstimate)) return problem("Navan estimate must be 0 or more.", "initiative-navan-estimate");
    }
    return null;
  }
  if (step === 2) {
    if (form.kpiTarget !== "" && !form.primaryKpiId) return problem("Choose a primary KPI for this target, or clear the target.", "initiative-kpi");
    if (notAmount(form.kpiTarget)) return problem("KPI target must be 0 or more.", "initiative-kpi-target");
    return null;
  }
  if (step === 3) {
    if (form.dataSource !== "LINKED") return null;
    const filled = form.links.filter((l) => l.system || l.externalId.trim() || l.accountId.trim());
    if (!draft && filled.length === 0) return problem("Add at least one campaign to link, or choose another option.", "initiative-link-0-system");
    for (const [index, link] of form.links.entries()) {
      if (!(link.system || link.externalId.trim() || link.accountId.trim())) continue;
      if (!link.system) return problem("Choose the system for each linked campaign.", `initiative-link-${index}-system`);
      if (!link.externalId.trim()) return problem("Enter the campaign ID for each linked campaign.", `initiative-link-${index}-id`);
      if (link.externalId.trim().length > 100 || link.accountId.trim().length > 100) return problem("IDs can be up to 100 characters.", `initiative-link-${index}-id`);
    }
    const keys = filled.map((l) => `${l.system}:${l.externalId.trim().toLowerCase()}`);
    if (new Set(keys).size !== keys.length) return problem("The same campaign is listed twice.");
    return null;
  }
  if (step === 4) {
    if (form.maturityDays === "") return null;
    const days = Number(form.maturityDays);
    if (!Number.isInteger(days) || days < 0 || days > 730) return problem("The maturity window must be a whole number of days from 0 to 730.", "initiative-maturity");
    return null;
  }
  return null;
}

/** The first problem in any step, so saving can jump to it */
export function firstProblem(form: FormState, reference: ReferenceData | undefined, owner: OwnerOption | null, draft = false): FormProblem | null {
  for (let step = 0; step < REVIEW_STEP; step += 1) {
    const found = stepProblem(step, form, reference, owner, draft);
    if (found) return found;
  }
  return null;
}
