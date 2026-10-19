// Events Overview: what events cost and what they brought in. Mirrors GET /api/events/performance

/** The seven categories of the cost breakdown (actual spend, split) */
export type CostCategory = "BOOTH_SPACE" | "TRAVEL" | "GROUND_TRANSPORT" | "STAFF_TIME" | "MEALS_PER_DIEMS" | "MATERIALS" | "OTHER";
export type CostCategories = Record<CostCategory, number>;

export interface EventPeriod {
  from: string;
  to: string;
}

/** The six key figures; null where they can't be worked out */
export interface EventKeyFigures {
  /** Budgets of the events that have one; null when none has */
  approved_budget: number | null;
  /** Invoiced and paid cost lines */
  actual_spend: number | null;
  /** Actual spend of the events with a budget minus the approved budget; below zero is under budget */
  budget_variance: number | null;
  /** Actual spend of the events (same filters) in the same period one year earlier */
  prior_year_spend: number | null;
  leads: number | null;
  cost_per_lead: number | null;
}

/** The totals for one currency (money is never added across currencies) */
export interface EventPerformanceTotals extends EventKeyFigures {
  currency: string;
  event_count: number;
  /** The same figures for the previous period */
  previous: EventKeyFigures | null;
}

/** One month of the Budget vs Actual vs Prior Year chart, by the month events start */
export interface EventMonthlyRow {
  /** "2026-10-01" */
  month: string;
  currency: string;
  approved_budget: number;
  actual_spend: number;
  prior_year_spend: number;
}

/** Event funnel across every event in scope; null where nothing was recorded */
export interface EventFunnelCounts {
  attendees: number | null;
  leads: number | null;
  qualified_leads: number | null;
  demos: number | null;
  customers: number | null;
}

export type CostBreakdownRow = CostCategories & { currency: string };

export interface EventPerformance extends EventFunnelCounts {
  id: string;
  name: string;
  event_code: string | null;
  brand_name: string;
  market_name: string | null;
  city: string | null;
  country_code: string | null;
  event_type_name: string | null;
  owner_name: string | null;
  start_date: string;
  end_date: string | null;
  /** The initiative's status, e.g. ACTIVE */
  status: string;
  currency: string;
  approved_budget: number | null;
  /** Invoiced and paid, in the event's currency */
  actual_cost: number;
  /** Estimates and commitments not invoiced yet */
  awaiting_cost: number;
  /** Actual cost of last year's event with the same name; null if there isn't one */
  prior_year_cost: number | null;
  prior_year_event_id: string | null;
  /** actual_cost - approved_budget; null without a budget */
  variance: number | null;
  revenue: number | null;
  cost_per_lead: number | null;
  roi_percent: number | null;
  /** Actual cost split into the seven categories */
  cost_categories: CostCategories;
  /** Cost lines in another currency, left out (never converted) */
  other_currency_lines: number;
}

export interface EventPerformanceResponse {
  /** Null for All time */
  period: EventPeriod | null;
  /** Same length, right before the period; null when there's nothing to compare with */
  previous_period: EventPeriod | null;
  totals: EventPerformanceTotals[];
  monthly: EventMonthlyRow[];
  funnel: EventFunnelCounts;
  cost_breakdown: CostBreakdownRow[];
  /** Start date, newest first */
  events: EventPerformance[];
}

export interface EventPerformanceFilters {
  from?: string;
  to?: string;
  brand_id?: number;
  /** The Region filter: markets */
  market_id?: number;
  event_type_id?: number;
  owner_user_id?: string;
  /** The initiative's status, e.g. COMPLETED */
  status?: string;
}
