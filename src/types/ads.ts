// Paid ads (every Paid Search and Paid Social platform): mirrors the shared paid ads API contract

/** The campaign's sub-channel is its platform */
export type AdPlatform =
  | "GOOGLE_ADS"
  | "BING_ADS"
  | "LINKEDIN_ADS"
  | "META_ADS"
  | "YOUTUBE_ADS"
  | "TIKTOK_ADS"
  | "X_ADS"
  | "REDDIT_ADS"
  | "DISPLAY_PROGRAMMATIC"
  | "OTHER";
export type AdResultStatus = "ACTIVE" | "PAUSED" | "ENDED";
/** Where a row came from: typed in, a spreadsheet upload, or (later) the Data Studio feed */
export type AdResultSource = "MANUAL" | "SPREADSHEET" | "DATA_STUDIO" | "GOOGLE_ADS_API";

/** CTR, CPC, conversion rate, CPL and the cost per figures are calculated by the API; null when they can't be */
export interface AdMetrics {
  budget_amount: number | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  hubspot_contacts: number | null;
  mqls: number | null;
  sqls: number | null;
  ctr: number | null;
  cpc: number | null;
  conversion_rate: number | null;
  cpl: number | null;
  cost_per_mql: number | null;
  cost_per_sql: number | null;
  budget_used_percent: number | null;
}

/** One campaign (or one of its ad groups) for one period */
export interface AdResult extends AdMetrics {
  id: string;
  initiative_id: string;
  campaign_name: string;
  platform: AdPlatform;
  brand_id: number;
  brand_name: string;
  market_id: number | null;
  market_name: string | null;
  currency: string;
  /** null = the whole campaign */
  ad_group: string | null;
  period_start: string;
  /** null while it's running */
  period_end: string | null;
  status: AdResultStatus;
  report_url: string | null;
  tracking_detail: string | null;
  source: AdResultSource;
  updated_at: string;
  updated_by_name: string | null;
}

export interface AdTotals extends AdMetrics {
  platform: AdPlatform | "ALL";
  currency: string;
  campaign_count: number;
}

export interface AdResultsResponse {
  results: AdResult[];
  /** Per platform and per currency, plus "ALL" */
  totals: AdTotals[];
}

export interface AdResultFilters {
  platform?: AdPlatform;
  brand_id?: number;
  market_id?: number;
  initiative_id?: string;
  /** YYYY-MM-DD; a period counts when it overlaps [from, to] */
  from?: string;
  to?: string;
  status?: AdResultStatus;
}

/** An ad campaign (Paid Search or Paid Social initiative with a platform), for pickers */
export interface AdCampaign {
  initiative_id: string;
  name: string;
  platform: AdPlatform;
  brand_name: string;
  market_name: string | null;
  currency: string;
  status: string;
  result_count: number;
  last_period_start: string | null;
}

export interface AdResultCreate {
  initiative_id: string;
  ad_group?: string | null;
  period_start: string;
  period_end?: string | null;
  budget_amount?: number | null;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  hubspot_contacts?: number | null;
  mqls?: number | null;
  sqls?: number | null;
  status?: AdResultStatus;
  report_url?: string | null;
  tracking_detail?: string | null;
}

/** Any field except the campaign; null clears an optional one */
export type AdResultUpdate = Partial<Omit<AdResultCreate, "initiative_id">>;

// ─── Spreadsheet upload ──────────────────────────────────────────────────────

export type AdImportRowStatus = "NEW" | "UPDATE" | "UNCHANGED" | "INVALID" | "NEW_CAMPAIGN";

export interface AdImportRow {
  row_number: number;
  status: AdImportRowStatus;
  messages: string[];
  campaign_name: string | null;
  ad_group: string | null;
  platform: AdPlatform | null;
  brand: string | null;
  market: string | null;
  period_start: string | null;
  period_end: string | null;
  budget_amount: number | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  hubspot_contacts: number | null;
  mqls: number | null;
  sqls: number | null;
  /** The row's campaign status (the row check is "status") */
  result_status?: AdResultStatus | null;
  report_url: string | null;
  initiative_id: string | null;
}

export interface AdImportCounts {
  new: number;
  update: number;
  unchanged: number;
  invalid: number;
  new_campaign: number;
}

export interface AdImportPreview {
  batch_id: string;
  filename: string;
  rows: AdImportRow[];
  counts: AdImportCounts;
}

export interface AdImportConfirmResult {
  batch_id: string;
  status: string;
  created: number;
  updated: number;
  unchanged: number;
  campaigns_created: number;
  skipped: number;
}

export interface AdImportUndoResult {
  batch_id: string;
  status: string;
  removed: number;
  restored: number;
  skipped: number;
  campaigns_removed: number;
}

// ─── The Paid Advertising page ───────────────────────────────────────────────

export type CampaignObjective = "AWARENESS" | "TRAFFIC" | "LEADS" | "CONVERSIONS" | "ENGAGEMENT" | "VIDEO_VIEWS";
export type CampaignStatus = "DRAFT" | "PLANNED" | "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
export type AttentionKind = "BUDGET" | "CPL_ABOVE_TARGET" | "CPL_ABOVE_PLATFORM" | "UNEXPECTEDLY_PAUSED" | "DATA_DELAYED";
export type DataHealthStatus = "OK" | "STALE" | "NO_DATA" | "CONNECTION" | "NOT_STARTED";
export type DataSourceKind = "API" | "MANUAL" | "SPREADSHEET" | "DATA_STUDIO" | "GOOGLE_ADS_API";

export interface AdsOverviewFilters {
  /** YYYY-MM-DD */
  from: string;
  to: string;
  brand_id?: number;
  market_id?: number;
  platform?: AdPlatform;
  objective?: CampaignObjective;
  status?: CampaignStatus;
  currency?: string;
}

/** Key figures for a date range, one currency. Verified leads and platform conversions are never added together. */
export interface AdsKpis {
  allocated_budget: number | null;
  actual_spend: number | null;
  budget_remaining: number | null;
  remaining_percent: number | null;
  verified_leads: number | null;
  cost_per_lead: number | null;
  conversions: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  mqls: number | null;
  sqls: number | null;
  campaign_count: number;
  active_campaign_count: number;
}

export interface AdsPlatformRow {
  platform: AdPlatform;
  campaign_count: number;
  allocated_budget: number | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  conversions: number | null;
  verified_leads: number | null;
  cpl: number | null;
  mqls: number | null;
  sqls: number | null;
  budget_used_percent: number | null;
  previous_spend: number | null;
  previous_verified_leads: number | null;
  previous_cpl: number | null;
}

export interface AdsBrandRow {
  brand_id: number;
  brand_name: string;
  campaign_count: number;
  allocated_budget: number | null;
  spend: number | null;
  budget_used_percent: number | null;
  verified_leads: number | null;
  cpl: number | null;
}

export interface AdsMonthRow {
  month: string;
  start: string;
  end: string;
  allocated_budget: number | null;
  spend: number | null;
  verified_leads: number | null;
}

export interface AdsTimePoint {
  start: string;
  end: string;
  spend: number;
  verified_leads: number;
  conversions: number;
  impressions: number;
  clicks: number;
}

export interface AdsAttentionReason {
  kind: AttentionKind;
  severity: "HIGH" | "MEDIUM";
  /** Budget: percent used; cost per lead: the campaign's */
  value: number | null;
  /** Budget: the alert percent; cost per lead: the target or the platform's */
  benchmark: number | null;
}

export interface AdsAttentionItem extends AdsAttentionReason {
  initiative_id: string;
  name: string;
  platform: AdPlatform;
  brand_name: string;
}

export interface AdsSuccessMetric {
  code: "CPM" | "CPC" | "CPE" | "CPL" | "CPA";
  label: string;
  value: number | null;
  target: number | null;
  on_target: boolean | null;
}

export interface AdsDataHealth {
  status: DataHealthStatus;
  source: DataSourceKind | null;
  last_data_date: string | null;
  connection_status: string | null;
}

export interface AdsPrimaryKpi {
  code: string;
  name: string;
  unit: "COUNT" | "MONEY" | "PERCENT";
}

export interface AdsCampaignRow {
  initiative_id: string;
  name: string;
  description: string | null;
  brand_id: number;
  brand_name: string;
  market_id: number | null;
  market_name: string | null;
  platform: AdPlatform;
  channel: "PAID_SEARCH" | "PAID_SOCIAL";
  objective: string | null;
  ad_account_id: string | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  currency: string;
  owner_name: string | null;
  data_source: string;
  /** The campaign's whole budget and its spend since it started */
  budget_amount: number | null;
  spend_to_date: number | null;
  budget_used_percent: number | null;
  /** For the date range */
  allocated_budget: number | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  verified_leads: number | null;
  mqls: number | null;
  sqls: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversion_rate: number | null;
  cpl: number | null;
  cost_per_mql: number | null;
  cost_per_conversion: number | null;
  revenue_to_date: number | null;
  roas: number | null;
  primary_kpi: AdsPrimaryKpi | null;
  kpi_target: number | null;
  /** Costs and rates for the date range; counts since the campaign started */
  primary_kpi_value: number | null;
  primary_kpi_on_target: boolean | null;
  success_metric: AdsSuccessMetric;
  report_url: string | null;
  result_count: number;
  data_health: AdsDataHealth;
  attention: AdsAttentionReason[];
}

export interface AdsOverview {
  date_from: string;
  date_to: string;
  previous_from: string;
  previous_to: string;
  today: string;
  currency: string;
  /** Currencies of the campaigns matching the filters, most used first */
  currencies: string[];
  kpis: AdsKpis;
  previous: AdsKpis;
  by_platform: AdsPlatformRow[];
  by_brand: AdsBrandRow[];
  by_month: AdsMonthRow[];
  bucket: "day" | "week" | "month";
  timeseries: AdsTimePoint[];
  attention: AdsAttentionItem[];
  campaigns: AdsCampaignRow[];
}

export interface AdsCampaignDetail {
  campaign: AdsCampaignRow;
  currency: string;
  date_from: string;
  date_to: string;
  bucket: "day" | "week" | "month";
  trend: AdsTimePoint[];
  funnel: {
    impressions: number | null;
    clicks: number | null;
    conversions: number | null;
    verified_leads: number | null;
    mqls: number | null;
    sqls: number | null;
  };
  /** The platform's cost per lead in the range */
  platform_cpl: number | null;
  budget: {
    budget_amount: number | null;
    spent: number | null;
    remaining: number | null;
    budget_used_percent: number | null;
    time_elapsed_percent: number | null;
    status: "NOT_STARTED" | "AHEAD" | "ON_TRACK" | "BEHIND" | null;
    days_total: number | null;
    days_elapsed: number | null;
  };
  /** Since the campaign started */
  crm: {
    verified_leads: number | null;
    mqls: number | null;
    sqls: number | null;
    demos: number | null;
    customers: number | null;
    revenue: number | null;
    spend: number | null;
    cost_per_lead: number | null;
    cost_per_sql: number | null;
    roas: number | null;
  };
  links: { system: string; external_id: string; account_id: string | null }[];
}

export interface AdsHealthProblem {
  initiative_id: string;
  name: string;
  brand_name: string;
  status: string;
  health: DataHealthStatus;
  last_data_date: string | null;
}

export interface AdsHealthPlatform {
  platform: AdPlatform;
  connection_status: string | null;
  connections: { account_name: string | null; account_id: string | null; status: string; updated_at: string }[];
  source: DataSourceKind | null;
  /** Ad account ids entered on its campaigns */
  accounts: string[];
  campaign_count: number;
  active_campaign_count: number;
  last_data_date: string | null;
  last_updated_at: string | null;
  /** When the Google Ads sync last worked and its mode (Google Ads and YouTube Ads only) */
  last_sync_at?: string | null;
  sync_mode?: "mock" | "live" | null;
  problems: AdsHealthProblem[];
}

export interface AdsHealth {
  today: string;
  stale_after_days: number;
  platforms: AdsHealthPlatform[];
}

export type AdsHealthFilters = Omit<AdsOverviewFilters, "from" | "to" | "currency">;
