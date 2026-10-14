import { apiClient } from "./apiClient";
import type { SpendLine, SpendLineCreate, SpendLineUpdate, SpendSummary } from "@/types/spend";

export function getSpendLines(initiativeId: string) {
  return apiClient.get<SpendLine[]>(`/api/initiatives/${initiativeId}/spend-lines`);
}

export function getSpendSummary(initiativeId: string) {
  return apiClient.get<SpendSummary>(`/api/initiatives/${initiativeId}/spend-summary`);
}

export function createSpendLine(initiativeId: string, data: SpendLineCreate) {
  return apiClient.post<SpendLine>(`/api/initiatives/${initiativeId}/spend-lines`, data, { actionLabel: "Saving cost" });
}

export function updateSpendLine(lineId: string, data: SpendLineUpdate) {
  return apiClient.patch<SpendLine>(`/api/spend-lines/${lineId}`, data, { actionLabel: "Saving cost" });
}

export function deleteSpendLine(lineId: string) {
  return apiClient.delete<null>(`/api/spend-lines/${lineId}`, { actionLabel: "Deleting cost" });
}
