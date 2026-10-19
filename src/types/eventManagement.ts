// Event management — mirrors backend models/event_management_model.py

export type StaffRole = "LEAD" | "BOOTH_STAFF" | "DEMO" | "SPEAKER" | "SETUP" | "EXECUTIVE" | "OTHER";
export type EventTiming = "NOW" | "UPCOMING" | "PAST" | "UNSCHEDULED";

export interface StaffAssignment {
  id: string;
  initiative_id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role: StaffRole;
  notes: string | null;
  updated_at: string;
}

export interface StaffAssignmentCreate {
  user_id: string;
  role?: StaffRole;
  notes?: string | null;
}

export type StaffAssignmentUpdate = Partial<Omit<StaffAssignmentCreate, "user_id">>;

export type NavanBookingType = "FLIGHT" | "HOTEL" | "CAR" | "RAIL" | "OTHER";

/** Someone on the event's active Navan bookings (kept by the Navan sync). Not necessarily a portal user. */
export interface EventTraveller {
  name: string;
  email: string | null;
  department: string | null;
  /** The portal user with the same email, if there is one */
  user_id: string | null;
  /** What they booked, sorted */
  booking_types: NavanBookingType[];
  bookings: number;
  /** Their share of the bookings in the event's currency (other currencies are left out) */
  amount: number;
  currency: string;
  first_travel: string | null;
  last_travel: string | null;
}

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
  /** Planned travel spend (part of the budget), and the travel costs in the event's currency */
  travel_budget_amount: number | null;
  /** Navan's estimate and the Navan bookings so far (sum of Navan costs), in the event's currency */
  navan_estimate_amount: number | null;
  navan_actual: number | null;
  /** Invoiced and paid travel costs */
  travel_spent: number;
  /** Every travel cost, including approved ones not yet paid */
  travel_expected: number;
  staff_count: number;
  /** People on the event's active Navan bookings */
  traveller_count: number;
  demos_given: number;
  demos_booked: number;
  leads: number | null;
  has_results: boolean;
}
