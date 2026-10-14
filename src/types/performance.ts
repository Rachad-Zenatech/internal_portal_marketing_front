// Results, success settings, decisions and the performance view — mirrors backend models/performance_model.py

export interface OutcomeValue {
  period_start: string;
  metric_code: string;
  value: number;
  currency: string | null;
  /** MANUAL when typed in; DEMO_LOG when counted from the demo log; other tools' names when synced */
  source: string;
  recorded_at: string | null;
  recorded_by_name: string | null;
}

export interface OutcomeList {
  /** Months that have any result, oldest first */
  periods: string[];
  values: OutcomeValue[];
  /** Demos are counted from the demo log, so they can't be typed in */
  demos_from_log: boolean;
}

export interface OutcomeInput {
  metric_code: string;
  /** null removes the value typed in for this month */
  value: number | null;
  currency?: string | null;
}

export type KpiUnit = "MONEY" | "PERCENT" | "COUNT";

export interface KpiRef {
  id: number;
  code: string;
  name: string;
  direction: "lower" | "higher" | null;
  unit: KpiUnit | null;
  /** False for KPIs that can't be worked out yet (Conversion Rate, LTV/CAC) */
  supported: boolean;
}

export interface Evaluation {
  /** The initiative's own primary KPI, or its sub-channel's default */
  primary_kpi: KpiRef | null;
  kpi_from_default: boolean;
  /** Set when the initiative's own KPI doesn't apply to its channel and the default is used instead */
  kpi_note: string | null;
  target_value: number | null;
  maturity_days: number;
  revenue_basis: "CLOSED_REVENUE";
  /** True until someone saves settings for this initiative */
  is_default: boolean;
  updated_at: string | null;
  updated_by_name: string | null;
}

export interface EvaluationInput {
  target_value: number | null;
  maturity_days: number;
}

export interface Decision {
  id: string;
  scale_or_cut_id: number;
  code: string;
  name: string;
  description: string | null;
  suggested_rating: string | null;
  note: string | null;
  decided_by_name: string | null;
  decided_at: string;
}

export interface DecisionInput {
  scale_or_cut_id: number;
  note?: string | null;
}

export interface LadderStep {
  code: string;
  name: string;
  count: number;
  cost_per: number | null;
  /** % of the step before that made it to this one */
  from_previous: number | null;
  previous_name: string | null;
}

export interface ExcludedAmount {
  currency: string;
  amount: number;
}

export type RatingCode = "HIGH" | "MEDIUM" | "LOW" | "TEST";

export interface Rating {
  code: RatingCode;
  name: string;
  reason: string;
  gap_percent: number | null;
}

export type MoneyOutcome = "PROFIT" | "BROKE_EVEN" | "LOST_MONEY" | "NO_REVENUE";

export type VerdictStage = "UPCOMING" | "EARLY" | "FINAL";

export interface Performance {
  currency: string;
  /** The expected total cost (estimates included) */
  cost: number;
  costs_excluded: ExcludedAmount[];
  /** Every result summed across months */
  totals: Record<string, number>;
  revenue: number | null;
  pipeline: number | null;
  revenue_excluded: ExcludedAmount[];
  ladder: LadderStep[];
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  roi_percent: number | null;
  money_outcome: MoneyOutcome | null;
  has_results: boolean;
  demos_from_log: boolean;
  evaluation: Evaluation;
  kpi_actual: number | null;
  matures_on: string | null;
  /** UPCOMING before it starts; EARLY until the maturity window ends; FINAL after that */
  stage: VerdictStage;
  /** Provisional rating on the primary KPI while EARLY */
  early_read: Rating | null;
  /** The verdict — Test until FINAL */
  rating: Rating;
  /** Code of the scale-or-cut option the system suggests */
  suggested_decision: string;
  latest_decision: Decision | null;
}
