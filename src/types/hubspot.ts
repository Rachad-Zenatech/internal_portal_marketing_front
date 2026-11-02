/** HubSpot's own campaign status; null when it isn't set there */
export type HubSpotCampaignStatus = "planned" | "in_progress" | "active" | "paused" | "completed";

/** One asset attached to a campaign (a list, email, page, event...) */
export interface HubSpotAsset {
  id: string;
  name: string | null;
}

/** By asset type (e.g. OBJECT_LIST): the assets, or only a count for meetings (their names are people's names) */
export type HubSpotAssets = Record<string, HubSpotAsset[] | { count: number }>;

/** Contacts who reached each lifecycle stage (a customer counts at every stage before too) */
export interface HubSpotFunnel {
  lead: number;
  mql: number;
  sql: number;
  opportunity: number;
  customer: number;
}

/** The funnel counted three ways; a kind is missing when it doesn't apply (no contact lists) or couldn't be read */
export interface HubSpotFunnels {
  first_touch?: HubSpotFunnel;
  last_touch?: HubSpotFunnel;
  /** Among the people on the campaign's contact lists */
  lists?: HubSpotFunnel;
}

/** Where a campaign's currency came from: HubSpot itself, the country of the linked event, or the linked initiative */
export type HubSpotCurrencySource = "HUBSPOT" | "COUNTRY" | "INITIATIVE";

/** A HubSpot campaign as the last sync read it */
export interface HubSpotCampaign {
  id: string;
  name: string;
  status: HubSpotCampaignStatus | string | null;
  start_date: string | null;
  end_date: string | null;
  /** HubSpot's own currency; when it has none, that of the linked event's country, else the linked initiative's */
  currency: string | null;
  /** Where the currency came from; null when unknown */
  currency_source: HubSpotCurrencySource | null;
  /** Totals of the campaign's budget and spend items in HubSpot */
  budget_total: number | null;
  spend_total: number | null;
  /** Budget less spend (negative when over budget); null without a budget */
  remaining_budget: number | null;
  /** Spend as a percent of budget; null without a budget */
  budget_used_pct: number | null;
  owner_name: string | null;
  utm: string | null;
  notes: string | null;
  audience: string | null;
  /** HubSpot's campaign report, to date */
  sessions: number | null;
  new_contacts_first_touch: number | null;
  new_contacts_last_touch: number | null;
  influenced_contacts: number | null;
  assets: HubSpotAssets;
  /** People on its contact lists, each counted once (lead lists for events, but also audiences); null without lists */
  list_contacts?: number | null;
  funnel?: HubSpotFunnels;
  hubspot_created_at: string | null;
  hubspot_updated_at: string | null;
  synced_at: string;
  initiative_id: string | null;
  initiative_name: string | null;
}

export interface HubSpotSyncSummary {
  campaigns: number;
  created: number;
  updated: number;
  removed: number;
  /** Asset lists HubSpot wouldn't give (campaigns x types) */
  unreadable_asset_types: number;
  /** Campaigns with no budget set in HubSpot */
  without_budget?: number;
  /** Initiatives added for campaigns that had none, and the sync's own brought in step with HubSpot */
  initiatives_created: number;
  initiatives_updated: number;
  /** Why the funnel (contacts and lists) couldn't be read; the campaigns synced without it */
  funnel_error?: string | null;
}

export interface HubSpotSyncStatus {
  configured: boolean;
  /** The scheduled sync is on */
  enabled: boolean;
  interval_minutes: number;
  /** A sync is running on the server now */
  running: boolean;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  last_run_summary: HubSpotSyncSummary | null;
}
