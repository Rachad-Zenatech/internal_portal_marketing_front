import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { createInitiative, getInitiatives, getOwnerOptions } from "@/services/initiativesService";
import type { InitiativeCreate, InitiativeFilters } from "@/types/initiatives";

export function useInitiatives(filters: InitiativeFilters) {
  return useQuery({
    queryKey: queryKeys.initiatives(filters),
    queryFn: () => getInitiatives(filters),
    // Keep the current rows on screen while a new filter combination loads
    placeholderData: keepPreviousData,
  });
}

export function useCreateInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InitiativeCreate) => createInitiative(data),
    // Every filtered list may now include the new initiative
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["initiatives"] }),
  });
}

export function useOwnerOptions(search: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.initiativeOwnerOptions(search),
    queryFn: () => getOwnerOptions(search),
    enabled,
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });
}
