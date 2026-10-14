import { apiClient } from "./apiClient";
import type { Decision, DecisionInput, Evaluation, EvaluationInput, OutcomeInput, OutcomeList, Performance } from "@/types/performance";

export function getPerformance(initiativeId: string) {
  return apiClient.get<Performance>(`/api/initiatives/${initiativeId}/performance`);
}

export function getOutcomes(initiativeId: string) {
  return apiClient.get<OutcomeList>(`/api/initiatives/${initiativeId}/outcomes`);
}

/** periodStart is the first of the month, e.g. "2026-11-01" */
export function saveOutcomes(initiativeId: string, periodStart: string, values: OutcomeInput[]) {
  return apiClient.put<OutcomeList>(`/api/initiatives/${initiativeId}/outcomes/${periodStart}`, { values }, { actionLabel: "Saving results" });
}

export function getEvaluation(initiativeId: string) {
  return apiClient.get<Evaluation>(`/api/initiatives/${initiativeId}/evaluation`);
}

export function saveEvaluation(initiativeId: string, data: EvaluationInput) {
  return apiClient.put<Evaluation>(`/api/initiatives/${initiativeId}/evaluation`, data, { actionLabel: "Saving target" });
}

export function getDecisions(initiativeId: string) {
  return apiClient.get<Decision[]>(`/api/initiatives/${initiativeId}/decisions`);
}

export function recordDecision(initiativeId: string, data: DecisionInput) {
  return apiClient.post<Decision>(`/api/initiatives/${initiativeId}/decisions`, data, { actionLabel: "Recording decision" });
}
