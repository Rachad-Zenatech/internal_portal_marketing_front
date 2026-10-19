/** A Navan event seen in the bookings, with its active booking total and the event it's linked to */
export interface NavanEvent {
  name: string;
  bookings: number;
  totals: { currency: string; amount: number }[];
  first_travel: string | null;
  initiative_id: string | null;
  initiative_name: string | null;
  /** SET: the event's "Navan event" names it. NAME_MATCH: the event has the same name. */
  link: "SET" | "NAME_MATCH" | null;
  /** Active bookings by type, e.g. FLIGHT / HOTEL / CAR */
  by_type?: { booking_type: string; currency: string; amount: number; bookings: number }[];
  /** Navan's estimate for the event, when the source gives one (demo mode only today) */
  estimate?: { currency: string; amount: number } | null;
}

/** live: real Navan. demo: generated bookings for the [Demo] events, Navan isn't called. */
export type NavanMode = "live" | "demo";

export interface NavanSyncSummary {
  mode?: NavanMode;
  bookings: number;
  linked: number;
  /** Events added to the portal because Navan had bookings for them */
  events_created: number;
  /** Cost lines */
  created: number;
  updated: number;
  removed: number;
  conflicts: number;
  estimates_updated?: number;
  events: NavanEvent[];
}

export interface NavanSyncStatus {
  mode: NavanMode;
  enabled: boolean;
  configured: boolean;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  last_run_summary: NavanSyncSummary | null;
}
