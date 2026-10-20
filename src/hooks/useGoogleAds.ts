import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getGoogleAdsStatus, syncGoogleAds } from "@/services/googleAdsService";

/** The Google Ads sync's mode (mock or live), connected accounts and last run */
export function useGoogleAdsStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.googleAdsStatus(),
    queryFn: getGoogleAdsStatus,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Run the Google Ads sync now. It can add campaigns and change results and costs, so everything is refreshed. */
export function useSyncGoogleAds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncGoogleAds,
    onSettled: () => queryClient.invalidateQueries(),
  });
}
