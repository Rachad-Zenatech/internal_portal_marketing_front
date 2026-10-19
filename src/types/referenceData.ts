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
  /** A sub-channel must be picked (the channel has a real choice besides Other) */
  sub_channel_required?: boolean;
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

/** Optional primary KPI an initiative can be judged on (any channel can use any KPI) */
export interface PrimaryKpi extends ReferenceItem {
  unit: "COUNT" | "MONEY" | "PERCENT";
}

/** A picklist value, e.g. { code: "LEADS", name: "Leads" } for a campaign objective */
export interface ChoiceItem {
  code: string;
  name: string;
}

/** What success means by default for a sub-channel */
export interface EvaluationDefault {
  sub_channel_id: number;
  funnel_stage_id: number | null;
  goal_id: number | null;
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
  primary_kpis: PrimaryKpi[];
  /**
   * Allowed values for picklist fields, keyed by field name (e.g. campaign_objective, focus_area, content_type,
   * email_platform, partnership_type, link_system). May be missing while the API catches up.
   */
  choices?: Record<string, ChoiceItem[]>;
  performance_ratings: DescribedReferenceItem[];
  scale_or_cut_options: DescribedReferenceItem[];
  regions: ReferenceItem[];
  /** Where a budget is spent, e.g. London; initiatives without one count as Unassigned */
  markets: ReferenceItem[];
  event_types: ReferenceItem[];
  expense_types: ExpenseType[];
  spend_categories: SpendCategory[];
  outcome_metrics: OutcomeMetric[];
  /** Channel code → result codes it can record, in form order; channels not listed (only Other) can record any */
  result_metrics_by_channel: Record<string, string[]>;
  evaluation_defaults: EvaluationDefault[];
  /** Booth, scheduled or live demo */
  demo_types: ReferenceItem[];
  demo_outcomes: DemoOutcome[];
}
