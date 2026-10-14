import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { createDemo, deleteDemo, getDemos, getDemoSummary, updateDemo } from "@/services/demosService";
import type { DemoCreate, DemoUpdate } from "@/types/demos";

export function useDemos(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.demos(initiativeId ?? ""),
    queryFn: () => getDemos(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

export function useDemoSummary(initiativeId: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.demoSummary(initiativeId ?? ""),
    queryFn: () => getDemoSummary(initiativeId as string),
    enabled: Boolean(initiativeId) && options.enabled !== false,
  });
}

// A demo changes the log and its summary (counts, cost per demo, customers)
function useRefreshDemos(initiativeId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.demos(initiativeId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.demoSummary(initiativeId) }),
    ]);
}

export function useCreateDemo(initiativeId: string) {
  const refresh = useRefreshDemos(initiativeId);
  return useMutation({
    mutationFn: (data: DemoCreate) => createDemo(initiativeId, data),
    onSuccess: refresh,
  });
}

export function useUpdateDemo(initiativeId: string) {
  const refresh = useRefreshDemos(initiativeId);
  return useMutation({
    mutationFn: ({ demoId, data, quiet }: { demoId: string; data: DemoUpdate; quiet?: boolean }) => updateDemo(demoId, data, { quiet }),
    onSuccess: refresh,
  });
}

export function useDeleteDemo(initiativeId: string) {
  const refresh = useRefreshDemos(initiativeId);
  return useMutation({
    mutationFn: (demoId: string) => deleteDemo(demoId),
    onSuccess: refresh,
  });
}
