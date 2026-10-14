// Marketing reference data — mirrors backend models/reference_data_model.py

export interface ReferenceItem {
  id: number;
  code: string;
  name: string;
  sort_order: number;
}

export interface DescribedReferenceItem extends ReferenceItem {
  description: string | null;
}

export interface ChannelItem extends ReferenceItem {
  sub_channel_ids: number[];
}

export interface GoalItem extends ReferenceItem {
  funnel_stage_id: number;
}

/** Groups cost categories for reporting */
export interface ExpenseType extends DescribedReferenceItem {
  /** Where costs of this type come from */
  source: "PORTAL" | "TRAVEL_SYSTEM";
}

/** Picked on each cost */
export interface SpendCategory extends ReferenceItem {
  expense_type_id: number;
  applies_to: "ALL" | "EVENTS" | "ADS";
  /** False when costs only arrive from another system (e.g. travel) */
  manual_entry_allowed: boolean;
  default_cost_type: "OPEX" | "CAPEX" | null;
  /** Shown under the category picker */
  help_text: string | null;
}

/** A result recorded per month: counted (COUNT) or money (MONEY: pipeline, revenue) */
export interface OutcomeMetric extends ReferenceItem {
  unit: "COUNT" | "MONEY";
}

/** What success means by default for a sub-channel */
export interface EvaluationDefault {
  sub_channel_id: number;
  funnel_stage_id: number | null;
  goal_id: number | null;
  primary_kpi_id: number | null;
  maturity_days: number;
}

/** What came of a demo; funnel_rank: 0 none yet / not a fit, 1 follow-up … 4 became a customer */
export interface DemoOutcome extends ReferenceItem {
  funnel_rank: number;
}

export interface ReferenceData {
  brands: ReferenceItem[];
  channels: ChannelItem[];
  sub_channels: ReferenceItem[];
  funnel_stages: ReferenceItem[];
  goals: GoalItem[];
  primary_kpis: ReferenceItem[];
  performance_ratings: DescribedReferenceItem[];
  scale_or_cut_options: DescribedReferenceItem[];
  regions: ReferenceItem[];
  event_types: ReferenceItem[];
  expense_types: ExpenseType[];
  spend_categories: SpendCategory[];
  outcome_metrics: OutcomeMetric[];
  /** Channel code → primary KPI codes it can use; channels not listed (only Other) can use any */
  kpi_choices_by_channel: Record<string, string[]>;
  /** Channel code → result codes it can record, in form order; channels not listed (only Other) can record any */
  result_metrics_by_channel: Record<string, string[]>;
  evaluation_defaults: EvaluationDefault[];
  /** Booth, scheduled or live demo */
  demo_types: ReferenceItem[];
  demo_outcomes: DemoOutcome[];
}
