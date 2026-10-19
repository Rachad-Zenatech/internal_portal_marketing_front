import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getNavanStatus } from "@/services/navanService";

/** The Navan sync's status and the Navan events from its last run (for linking an event to one) */
export function useNavanStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.navanStatus(),
    queryFn: getNavanStatus,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
