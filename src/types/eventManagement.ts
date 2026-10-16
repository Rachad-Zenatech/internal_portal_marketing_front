// Event management — mirrors backend models/event_management_model.py

export type StaffRole = "LEAD" | "BOOTH_STAFF" | "DEMO" | "SPEAKER" | "SETUP" | "EXECUTIVE" | "OTHER";
export type TravelStatus = "REQUESTED" | "BOOKED" | "CANCELLED";
/** What the travel system can act on: worked out from the details, or reported back by the travel system */
export type TravelReadiness = "NOT_TRAVELLING" | "MISSING_DETAILS" | "READY" | TravelStatus;
export type EventTiming = "NOW" | "UPCOMING" | "PAST" | "UNSCHEDULED";

export interface StaffAssignment {
  id: string;
  initiative_id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role: StaffRole;
  travel_needed: boolean;
  departs_from: string | null;
  arrive_on: string | null;
  depart_on: string | null;
  needs_flight: boolean;
  needs_hotel: boolean;
  needs_ground_transport: boolean;
  needs_stipend: boolean;
  cargo_note: string | null;
  notes: string | null;
  travel_status: TravelStatus | null;
  travel_status_at: string | null;
  readiness: TravelReadiness;
  /** What's still needed before the travel system can book them */
  missing: string[];
  updated_at: string;
}

export interface StaffAssignmentCreate {
  user_id: string;
  role?: StaffRole;
  travel_needed?: boolean;
  departs_from?: string | null;
  /** Defaults to the day before the event starts */
  arrive_on?: string | null;
  /** Defaults to the event's last day */
  depart_on?: string | null;
  needs_flight?: boolean;
  needs_hotel?: boolean;
  needs_ground_transport?: boolean;
  needs_stipend?: boolean;
  cargo_note?: string | null;
  notes?: string | null;
}

export type StaffAssignmentUpdate = Partial<Omit<StaffAssignmentCreate, "user_id">>;

/** One event card: what it is, and what still needs doing */
export interface EventOverviewItem {
  id: string;
  name: string;
  event_code: string | null;
  brand_name: string;
  sub_channel_code: string | null;
  sub_channel_name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  timing: EventTiming;
  /** Days until it starts (UPCOMING) or since it ended (PAST) */
  days_away: number | null;
  venue: string | null;
  city: string | null;
  country_code: string | null;
  platform: string | null;
  owner_name: string | null;
  budget_amount: number | null;
  currency: string;
  expected_cost: number;
  actual_cost: number;
  cost_lines: number;
  /** The part of the budget for travel, and the travel system's costs in the event's currency */
  travel_budget_amount: number | null;
  /** Invoiced and paid travel costs */
  travel_spent: number;
  /** Every travel cost, including approved ones not yet paid */
  travel_expected: number;
  staff_count: number;
  staff_ready: number;
  staff_missing_details: number;
  staff_booked: number;
  demos_given: number;
  demos_booked: number;
  leads: number | null;
  has_results: boolean;
}
