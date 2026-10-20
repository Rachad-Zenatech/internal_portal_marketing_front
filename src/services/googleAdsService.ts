import { apiClient } from "./apiClient";
import type { GoogleAdsSyncStatus, GoogleAdsSyncSummary } from "@/types/googleAds";

/** The Google Ads sync's mode, connected accounts and last run */
export function getGoogleAdsStatus() {
  return apiClient.get<GoogleAdsSyncStatus>("/api/integrations/google-ads/sync-status");
}

/** Read the connected Google Ads accounts now and update their campaigns and weekly results */
export function syncGoogleAds() {
  return apiClient.post<GoogleAdsSyncSummary>("/api/integrations/google-ads/sync", undefined, { actionLabel: "Syncing with Google Ads" });
}
