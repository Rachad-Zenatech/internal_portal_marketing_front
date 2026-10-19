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
  demos_given: number;
  demos_booked: number;
  leads: number | null;
  has_results: boolean;
}
