import { apiClient } from "./apiClient";
import type { SpendLine, SpendSummary } from "@/types/spend";

export function getSpendLines(initiativeId: string) {
  return apiClient.get<SpendLine[]>(`/api/initiatives/${initiativeId}/spend-lines`);
}

export function getSpendSummary(initiativeId: string) {
  return apiClient.get<SpendSummary>(`/api/initiatives/${initiativeId}/spend-summary`);
}
