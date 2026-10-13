import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getInitiatives } from "@/services/initiativesService";
import type { InitiativeFilters } from "@/types/initiatives";

export function useInitiatives(filters: InitiativeFilters) {
  return useQuery({
    queryKey: queryKeys.initiatives(filters),
    queryFn: () => getInitiatives(filters),
    // Keep the current rows on screen while a new filter combination loads
    placeholderData: keepPreviousData,
  });
}
