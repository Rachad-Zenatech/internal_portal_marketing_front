import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { AD_SYNC_PROVIDERS, getAdSyncStatus, syncAdPlatform } from "@/services/adSyncService";
import type { AdSyncProvider } from "@/types/adSync";

const STALE_TIME = 5 * 60 * 1000;

/** One ad platform's sync mode (mock or live), connected accounts and last run */
export function useAdSyncStatus(provider: AdSyncProvider, enabled = true) {
  return useQuery({
    queryKey: queryKeys.adSyncStatus(provider),
    queryFn: () => getAdSyncStatus(provider),
    enabled,
    staleTime: STALE_TIME,
  });
}

/** Every ad platform's sync status, in AD_SYNC_PROVIDERS order */
export function useAdSyncStatuses(enabled = true) {
  return useQueries({
    queries: AD_SYNC_PROVIDERS.map((provider) => ({
      queryKey: queryKeys.adSyncStatus(provider),
      queryFn: () => getAdSyncStatus(provider),
      enabled,
      staleTime: STALE_TIME,
    })),
  });
}

/** Run the platform's sync now. It can add campaigns and change results and costs, so everything is refreshed. */
export function useSyncAdPlatform(provider: AdSyncProvider) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncAdPlatform(provider),
    onSettled: () => queryClient.invalidateQueries(),
  });
}
