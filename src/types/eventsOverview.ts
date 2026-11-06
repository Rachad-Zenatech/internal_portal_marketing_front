// Events Overview: the Navan events with the HubSpot results matched to them (GET /api/events/navan-events)
import type { CostCategories, EventPerformance, EventPerformanceFilters, EventPeriod } from "./eventPerformance";

export interface NavanFigures {
  navan_event_name: string | null;
  /** Booked through Navan, in the event's currency */
  travel_cost: number;
  travel_budget: number | null;
  navan_estimate: number | null;
  travellers: number;
  bookings: number;
  first_travel: string | null;
  last_travel: string | null;
}

export interface HubSpotCampaignFigures {
  id: string;
  name: string;
  status: string | null;
  currency: string | null;
  budget_total: number | null;
  spend_total: number | null;
  /** The currency of the spend and budget: the campaign's own, else HubSpot's account currency */
  spend_currency: string | null;
  sessions: number | null;
  new_contacts_first_touch: number | null;
  new_contacts_last_touch: number | null;
  influenced_contacts: number | null;
  list_contacts: number | null;
  funnel: Record<string, Record<string, number>>;
}

export interface HubSpotMarketingEventFigures {
  id: string;
  name: string;
  event_type: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  event_url: string | null;
  registrants: number | null;
  attendees: number | null;
  cancellations: number | null;
  no_shows: number | null;
}

/** AUTO: found from the names. MANUAL: picked by someone. NONE: nothing matches (found, or picked as none) */
/** CAMPAIGN: the event is a HubSpot campaign. AUTO: found from the names. MANUAL: picked. NONE: no match */
export type HubSpotMatchMethod = "CAMPAIGN" | "AUTO" | "MANUAL" | "NONE";

export interface EventHubSpotMatch {
  method: HubSpotMatchMethod;
  picked_none: boolean;
  score: number | null;
  campaign: HubSpotCampaignFigures | null;
  marketing_event: HubSpotMarketingEventFigures | null;
}

/** The results HubSpot has for the event; null where there's no match or HubSpot doesn't know */
export interface EventTurnout {
  registrants: number | null;
  attended: number | null;
  no_shows: number | null;
  /** The event's leads: contacts on its campaign's lists, else on a list named like it, else first touch */
  leads: number | null;
  leads_basis: "CAMPAIGN_LISTS" | "NAMED_LIST" | "FIRST_TOUCH" | "TYPED" | null;
  leads_list_name: string | null;
  /** Credited to the event's campaign as a first touch */
  new_contacts: number | null;
  influenced_contacts: number | null;
  sessions: number | null;
  mqls: number | null;
  sqls: number | null;
  opportunities: number | null;
  customers: number | null;
  /** Attended, leads, mqls or customers that HubSpot had nothing for and a typed-in result fills */
  typed_fields: string[];
}

/** A Navan trip joined to a HubSpot event (AUTO: by name, MANUAL: joined by hand) */
export interface NavanTrip {
  id: string;
  name: string;
  method: "AUTO" | "MANUAL";
}

export interface EventOverviewRow extends EventPerformance {
  /** HUBSPOT: a HubSpot event (a campaign) with its Navan trips. NAVAN: a Navan trip that matches no HubSpot event */
  source: "HUBSPOT" | "NAVAN";
  /** HUBSPOT when the cost / budget is the HubSpot campaign's (the portal has none for the event) */
  cost_source: "HUBSPOT" | null;
  budget_source: "HUBSPOT" | null;
  navan_events: NavanTrip[];
  navan: NavanFigures;
  hubspot: EventHubSpotMatch;
  turnout: EventTurnout;
  hubspot_cost_per_lead: number | null;
}

export interface OverviewTotals {
  currency: string;
  event_count: number;
  approved_budget: number | null;
  actual_spend: number | null;
  budget_variance: number | null;
  travel_cost: number;
  leads: number | null;
  cost_per_lead: number | null;
}

export interface OverviewMonth {
  month: string;
  currency: string;
  approved_budget: number;
  actual_spend: number;
  travel_cost: number;
}

export interface OverviewCostBreakdown extends CostCategories {
  currency: string;
}

export interface OverviewHubSpotSummary {
  matched: number;
  unmatched: number;
  registrants: number | null;
  attended: number | null;
  leads: number | null;
  new_contacts: number | null;
  influenced_contacts: number | null;
  mqls: number | null;
  sqls: number | null;
  opportunities: number | null;
  customers: number | null;
  travellers: number;
}

export interface EventsOverviewResponse {
  period: EventPeriod;
  totals: OverviewTotals[];
  monthly: OverviewMonth[];
  cost_breakdown: OverviewCostBreakdown[];
  hubspot: OverviewHubSpotSummary;
  events: EventOverviewRow[];
}

export interface Traveller {
  name: string;
  email: string | null;
  department: string | null;
  booking_types: string[];
  bookings: number;
  amount: number;
  currency: string;
  first_travel: string | null;
  last_travel: string | null;
}

export interface Participant {
  name: string | null;
  email: string | null;
  /** REGISTERED, ATTENDED, CANCELLED or NO_SHOW */
  state: string | null;
  at: string | null;
}

export interface EventOverviewDetail extends EventOverviewRow {
  travellers: Traveller[];
  participants: Participant[];
  /** The matched campaign's assets by type: a list of {id, name}, or {count} for meetings */
  campaign_assets: Record<string, unknown>;
}

export interface HubSpotOption {
  id: string;
  name: string;
  starts_on: string | null;
}

export interface HubSpotOptions {
  campaigns: HubSpotOption[];
  marketing_events: HubSpotOption[];
}

export interface NavanTripOption {
  id: string;
  name: string;
  starts_on: string | null;
}

export interface NavanTripLinkUpdate {
  trip_id: string;
  /** false takes the trip off the event again */
  link: boolean;
}

export interface HubSpotLinkUpdate {
  campaign_id?: string | null;
  marketing_event_id?: string | null;
  /** Both ids empty and none set: "no HubSpot match". Neither: back to the name match. */
  none?: boolean;
}

export type EventsOverviewFilters = EventPerformanceFilters;
