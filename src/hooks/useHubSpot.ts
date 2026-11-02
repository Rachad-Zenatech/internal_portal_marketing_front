import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getHubSpotCampaigns, getHubSpotSocialPosts, getHubSpotStatus, startHubSpotSync } from "@/services/hubspotService";

/** The synced HubSpot social posts */
export function useHubSpotSocialPosts() {
  return useQuery({
    queryKey: queryKeys.hubspotSocialPosts(),
    queryFn: getHubSpotSocialPosts,
    staleTime: 5 * 60 * 1000,
  });
}

/** The synced HubSpot campaigns */
export function useHubSpotCampaigns() {
  return useQuery({
    queryKey: queryKeys.hubspotCampaigns(),
    queryFn: getHubSpotCampaigns,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The HubSpot sync's status. While a sync runs it's checked every few seconds, and the campaigns are reloaded when
 * it finishes.
 */
export function useHubSpotStatus() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.hubspotStatus(),
    queryFn: getHubSpotStatus,
    staleTime: 60 * 1000,
    refetchInterval: (q) => (q.state.data?.running ? 4000 : false),
  });
  const running = query.data?.running ?? false;
  const wasRunning = useRef(running);
  useEffect(() => {
    if (wasRunning.current && !running) {
      queryClient.invalidateQueries({ queryKey: queryKeys.hubspotCampaigns() });
      queryClient.invalidateQueries({ queryKey: queryKeys.hubspotSocialPosts() });
    }
    wasRunning.current = running;
  }, [running, queryClient]);
  return query;
}

/** Start a sync now; the status starts checking for the end of it */
export function useStartHubSpotSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startHubSpotSync,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.hubspotStatus() }),
  });
}
