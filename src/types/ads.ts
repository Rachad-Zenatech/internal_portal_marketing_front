// Paid ads (Google Ads + Bing Ads): mirrors the shared paid ads API contract

export type AdPlatform = "GOOGLE_ADS" | "BING_ADS";
export type AdResultStatus = "ACTIVE" | "PAUSED" | "ENDED";
/** Where a row came from: typed in, a spreadsheet upload, or (later) the Data Studio feed */
export type AdResultSource = "MANUAL" | "SPREADSHEET" | "DATA_STUDIO";

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

/** A Google Ads or Bing Ads initiative, for pickers */
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
