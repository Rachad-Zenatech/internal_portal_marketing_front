import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getSpendLines, getSpendSummary } from "@/services/spendService";

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
