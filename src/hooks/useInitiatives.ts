import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  createInitiative,
  deleteInitiative,
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
    // Every filtered list may now include the new initiative, and a new event joins the overview
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["initiatives"] }),
        queryClient.invalidateQueries({ queryKey: ["event-overview"] }),
      ]),
  });
}

export function useUpdateInitiative(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InitiativeUpdate) => updateInitiative(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.initiative(id), updated);
      // Dates, budget, KPI and currency feed the event overview and every derived figure
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["initiatives"] }),
        queryClient.invalidateQueries({ queryKey: ["event-overview"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.performance(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.evaluation(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.spendSummary(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.demoSummary(id) }),
        // Brand, channel and market decide which monthly budget its costs count against
        queryClient.invalidateQueries({ queryKey: queryKeys.budgetMonths() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.budgets() }),
      ]);
    },
  });
}

export function useDeleteInitiative(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteInitiative(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.initiative(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["initiatives"] }),
        queryClient.invalidateQueries({ queryKey: ["event-overview"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.budgetMonths() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.budgets() }),
      ]);
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
