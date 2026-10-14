import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { createSpendLine, deleteSpendLine, getSpendLines, getSpendSummary, updateSpendLine } from "@/services/spendService";
import type { SpendLineCreate, SpendLineUpdate } from "@/types/spend";

export function useSpendLines(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.spendLines(initiativeId ?? ""),
    queryFn: () => getSpendLines(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

export function useSpendSummary(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.spendSummary(initiativeId ?? ""),
    queryFn: () => getSpendSummary(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

// A cost changes the cost sheet, its totals, and the cost totals on the initiative and the list
export function useRefreshCosts(initiativeId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.spendLines(initiativeId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.spendSummary(initiativeId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.initiative(initiativeId) }),
      queryClient.invalidateQueries({ queryKey: ["initiatives"] }),
      queryClient.invalidateQueries({ queryKey: ["event-overview"] }),
    ]);
}

export function useCreateSpendLine(initiativeId: string) {
  const refresh = useRefreshCosts(initiativeId);
  return useMutation({
    mutationFn: (data: SpendLineCreate) => createSpendLine(initiativeId, data),
    onSuccess: refresh,
  });
}

export function useUpdateSpendLine(initiativeId: string) {
  const refresh = useRefreshCosts(initiativeId);
  return useMutation({
    mutationFn: ({ lineId, data }: { lineId: string; data: SpendLineUpdate }) => updateSpendLine(lineId, data),
    onSuccess: refresh,
  });
}

export function useDeleteSpendLine(initiativeId: string) {
  const refresh = useRefreshCosts(initiativeId);
  return useMutation({
    mutationFn: (lineId: string) => deleteSpendLine(lineId),
    onSuccess: refresh,
  });
}
