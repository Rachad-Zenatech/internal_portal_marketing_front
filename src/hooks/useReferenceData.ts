import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getReferenceData } from "@/services/referenceDataService";

// Lookup lists change rarely; keep them for the session.
export function useReferenceData() {
  return useQuery({
    queryKey: queryKeys.referenceData(),
    queryFn: getReferenceData,
    staleTime: 1000 * 60 * 30,
  });
}
