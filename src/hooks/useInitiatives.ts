import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  createInitiative,
  getInitiative,
  getInitiatives,
  getOwnerOptions,
  updateInitiative,
} from "@/services/initiativesService";
import type { InitiativeCreate, InitiativeFilters, InitiativeUpdate } from "@/types/initiatives";

export function useInitiatives(filters: InitiativeFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.initiatives(filters),
    queryFn: () => getInitiatives(filters),
    enabled,
    // Keep the current rows on screen while a new filter combination loads
    placeholderData: keepPreviousData,
  });
}

export function useInitiative(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.initiative(id ?? ""),
    queryFn: () => getInitiative(id as string),
    enabled: Boolean(id),
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

export function useUpdateInitiative(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InitiativeUpdate) => updateInitiative(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.initiative(id), updated);
      return queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
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
