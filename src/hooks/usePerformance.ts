import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  getDecisions,
  getEvaluation,
  getOutcomes,
  getPerformance,
  recordDecision,
  saveEvaluation,
  saveOutcomes,
} from "@/services/performanceService";
import type { DecisionInput, EvaluationInput, OutcomeInput } from "@/types/performance";

export function usePerformance(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.performance(initiativeId ?? ""),
    queryFn: () => getPerformance(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

export function useOutcomes(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.outcomes(initiativeId ?? ""),
    queryFn: () => getOutcomes(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

export function useEvaluation(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.evaluation(initiativeId ?? ""),
    queryFn: () => getEvaluation(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

export function useDecisions(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.decisions(initiativeId ?? ""),
    queryFn: () => getDecisions(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

export function useSaveOutcomes(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodStart, values }: { periodStart: string; values: OutcomeInput[] }) => saveOutcomes(initiativeId, periodStart, values),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.outcomes(initiativeId), data);
      return queryClient.invalidateQueries({ queryKey: queryKeys.performance(initiativeId) });
    },
  });
}

export function useSaveEvaluation(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EvaluationInput) => saveEvaluation(initiativeId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.evaluation(initiativeId), data);
      return queryClient.invalidateQueries({ queryKey: queryKeys.performance(initiativeId) });
    },
  });
}

export function useRecordDecision(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DecisionInput) => recordDecision(initiativeId, data),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.decisions(initiativeId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.performance(initiativeId) }),
      ]),
  });
}
