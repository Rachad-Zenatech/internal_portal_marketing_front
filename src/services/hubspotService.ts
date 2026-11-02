import { apiClient } from "./apiClient";
import type { HubSpotCampaign, HubSpotSocialPost, HubSpotSyncStatus } from "@/types/hubspot";

/** Every social post from the last sync, newest first, with its counters and campaign */
export function getHubSpotSocialPosts() {
  return apiClient.get<HubSpotSocialPost[]>("/api/hubspot/social-posts");
}

/** Every HubSpot campaign from the last sync, with its report figures, assets and linked initiative */
export function getHubSpotCampaigns() {
  return apiClient.get<HubSpotCampaign[]>("/api/hubspot/campaigns");
}

/** Whether HubSpot is set up, whether a sync is running, and the last run */
export function getHubSpotStatus() {
  return apiClient.get<HubSpotSyncStatus>("/api/integrations/hubspot/sync-status");
}

/** Start reading every campaign from HubSpot. Returns at once; the status shows when it's done. */
export function startHubSpotSync() {
  return apiClient.post<{ started: boolean }>("/api/integrations/hubspot/sync", undefined, { actionLabel: "Starting the HubSpot sync" });
}
