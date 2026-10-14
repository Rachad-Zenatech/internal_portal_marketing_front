// Demos given at events — mirrors backend models/demo_model.py

export type DemoSource = "MANUAL" | "MOBILE" | "HUBSPOT";

export interface Demo {
  id: string;
  initiative_id: string;
  demo_at: string;
  demo_type_id: number;
  demo_type_code: string;
  demo_type_name: string;
  /** The organisation only; people's details stay in HubSpot */
  company: string | null;
  hubspot_url: string | null;
  brand_id: number | null;
  brand_name: string | null;
  product_note: string | null;
  given_by: string | null;
  given_by_name: string | null;
  outcome_id: number;
  outcome_code: string;
  outcome_name: string;
  /** 0 none yet / not a fit, 1 follow-up … 4 became a customer */
  outcome_rank: number;
  outcome_updated_at: string | null;
  note: string | null;
  source: DemoSource;
  updated_at: string;
}

export interface DemoCreate {
  demo_type_id: number;
  /** Defaults to now */
  demo_at?: string | null;
  company?: string | null;
  hubspot_url?: string | null;
  /** Defaults to the event's brand */
  brand_id?: number | null;
  product_note?: string | null;
  /** Defaults to the person logging it */
  given_by?: string | null;
  /** Defaults to "No outcome yet" */
  outcome_id?: number | null;
  note?: string | null;
  source?: "MANUAL" | "MOBILE";
}

/** Partial update: only the fields sent are changed; null clears an optional field */
export type DemoUpdate = Partial<Omit<DemoCreate, "source">>;

/** One slice of the demos, e.g. one type, product or staff member */
export interface DemoCount {
  key: string;
  name: string;
  count: number;
}

export interface DemoFunnel {
  demos: number;
  /** Outcome known (anything but "No outcome yet") */
  with_outcome: number;
  /** Follow-up booked or further along */
  follow_ups: number;
  /** Deal opened or became a customer */
  deals: number;
  customers: number;
}

export interface DemoSummary {
  total: number;
  funnel: DemoFunnel;
  /** % of demos with a known outcome that led to a follow-up or further */
  follow_up_rate: number | null;
  /** % of demos that became customers */
  customer_rate: number | null;
  by_type: DemoCount[];
  by_outcome: DemoCount[];
  by_brand: DemoCount[];
  by_given_by: DemoCount[];
  /** The event's expected total cost (estimates included), in its own currency */
  expected_cost: number;
  currency: string;
  cost_per_demo: number | null;
  /** Cost ÷ customers won through demos */
  cost_per_customer: number | null;
  /** Some costs are in another currency and aren't included */
  mixed_currencies: boolean;
}
