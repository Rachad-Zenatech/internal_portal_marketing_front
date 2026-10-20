import { apiClient } from "./apiClient";
import type { AdSyncProvider, AdSyncStatus, AdSyncSummary } from "@/types/adSync";

/** Each ad platform with a sync: its name, its API path, and its settings' prefix (for set-up hints) */
export const AD_SYNC_PLATFORMS: Record<AdSyncProvider, { label: string; path: string; envPrefix: string; signIn: string }> = {
  GOOGLE_ADS: { label: "Google Ads", path: "google-ads", envPrefix: "GOOGLE_ADS", signIn: "Google" },
  MICROSOFT_ADS: { label: "Microsoft Ads", path: "microsoft-ads", envPrefix: "MICROSOFT_ADS", signIn: "Microsoft" },
};

export const AD_SYNC_PROVIDERS = Object.keys(AD_SYNC_PLATFORMS) as AdSyncProvider[];

export function isAdSyncProvider(provider: string | null | undefined): provider is AdSyncProvider {
  return !!provider && provider in AD_SYNC_PLATFORMS;
}

/** The platform's sync mode, connected accounts and last run */
export function getAdSyncStatus(provider: AdSyncProvider) {
  return apiClient.get<AdSyncStatus>(`/api/integrations/${AD_SYNC_PLATFORMS[provider].path}/sync-status`);
}

/** Read the platform's connected accounts now and update their campaigns and weekly results */
export function syncAdPlatform(provider: AdSyncProvider) {
  const { path, label } = AD_SYNC_PLATFORMS[provider];
  return apiClient.post<AdSyncSummary>(`/api/integrations/${path}/sync`, undefined, { actionLabel: `Syncing with ${label}` });
}
