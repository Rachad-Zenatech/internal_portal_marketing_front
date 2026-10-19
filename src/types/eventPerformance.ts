// Event performance: what events cost and what they brought in. Mirrors GET /api/events/performance

export type EventPerformanceTiming = "UPCOMING" | "NOW" | "PAST";
export type CostGroup = "TRAVEL" | "BOOTH" | "MATERIALS" | "STAFF_OTHER";
export type CostBreakdown = Record<CostGroup, number>;
export type MoneyOutcome = "PROFIT" | "BROKE_EVEN" | "LOST_MONEY" | "NO_REVENUE";
export type EventResult = "UPCOMING" | "TOO_EARLY" | "SUCCESSFUL" | "NOT_SUCCESSFUL" | "AWAITING_REVENUE";

/** The figures shared by one event and by the totals for a currency; null when not recorded */
interface PerformanceFigures {
  currency: string;
  cost: number;
  cost_breakdown: CostBreakdown;
  visitors: number | null;
  leads: number | null;
  demos: number | null;
  follow_ups: number | null;
  customers: number | null;
  revenue: number | null;
  pipeline: number | null;
  /** Null when the divisor is missing or 0, or the cost is 0 */
  cost_per_visitor: number | null;
  cost_per_lead: number | null;
  cost_per_demo: number | null;
  cost_per_follow_up: number | null;
  cost_per_customer: number | null;
  roi_percent: number | null;
  money_outcome: MoneyOutcome | null;
}

export interface EventPerformance extends PerformanceFigures {
  id: string;
  name: string;
  event_code: string | null;
  brand_name: string;
  market_name: string | null;
  sub_channel_code: string | null;
  sub_channel_name: string | null;
  city: string | null;
  country_code: string | null;
  platform: string | null;
  start_date: string;
  end_date: string | null;
  timing: EventPerformanceTiming;
  status: string;
  budget_amount: number | null;
  /** Cost lines in another currency, left out of the cost */
  other_currency_lines: number;
  result: EventResult;
  /** When the result can be judged (end of the maturity window) */
  matures_on: string | null;
}

export interface EventPerformanceTotals extends PerformanceFigures {
  event_count: number;
  successful_count: number;
  unsuccessful_count: number;
  /** Too early to judge, or awaiting revenue */
  awaiting_count: number;
}

export interface EventPerformanceResponse {
  /** On now, then upcoming (soonest first), then past (most recent first) */
  events: EventPerformance[];
  /** One row per currency */
  totals: EventPerformanceTotals[];
}

export interface EventPerformanceFilters {
  from?: string;
  to?: string;
  brand_id?: number;
  market_id?: number;
  sub_channel_id?: number;
  timing?: EventPerformanceTiming;
}
