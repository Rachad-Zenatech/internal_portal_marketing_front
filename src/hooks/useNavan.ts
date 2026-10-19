import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getNavanStatus, syncNavanCosts } from "@/services/navanService";

/** The Navan sync's status and the Navan events from its last run (for linking an event to one) */
export function useNavanStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.navanStatus(),
    queryFn: getNavanStatus,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Run the Navan sync now. It can change travel costs on any event, and create events, so everything is refreshed. */
export function useSyncNavan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncNavanCosts,
    onSettled: () => queryClient.invalidateQueries(),
  });
}
