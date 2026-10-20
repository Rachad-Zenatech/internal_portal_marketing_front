/** mock: generated data for mock connections, Google isn't called. live: the Google Ads API. */
export type GoogleAdsMode = "mock" | "live";

/** One ad account read in a sync run */
export interface GoogleAdsAccountRun {
  account_id: string;
  account_name: string | null;
  connection_id: string;
  campaigns: number;
  results: number;
  /** Why the account couldn't be read (the other accounts still synced) */
  error: string | null;
}

export interface GoogleAdsSyncSummary {
  mode: GoogleAdsMode;
  date_from: string;
  date_to: string;
  connections: number;
  accounts: number;
  accounts_failed: number;
  campaigns_created: number;
  campaigns_updated: number;
  campaigns_unchanged: number;
  campaigns_skipped: number;
  /** Weekly results */
  results_created: number;
  results_updated: number;
  results_unchanged: number;
  results_removed: number;
  spend_conflicts: number;
  account_runs: GoogleAdsAccountRun[];
  warnings: string[];
}

export interface GoogleAdsConnectedAccount {
  connection_id: string;
  account_id: string;
  account_name: string | null;
  currency: string | null;
  /** Manager (MCC) accounts are listed but not synced */
  is_manager: boolean;
  company_name: string | null;
}

export interface GoogleAdsSyncStatus {
  mode: GoogleAdsMode;
  /** The scheduled sync is on */
  enabled: boolean;
  /** Connecting can work: always in mock mode, in live mode when the OAuth client is set up */
  configured: boolean;
  interval_minutes: number;
  lookback_days: number;
  connected_accounts: GoogleAdsConnectedAccount[];
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  last_run_summary: GoogleAdsSyncSummary | null;
}
