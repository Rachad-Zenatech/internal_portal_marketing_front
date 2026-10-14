import { apiClient } from "./apiClient";
import type { Demo, DemoCreate, DemoSummary, DemoUpdate } from "@/types/demos";

export function getDemos(initiativeId: string) {
  return apiClient.get<Demo[]>(`/api/initiatives/${initiativeId}/demos`);
}

export function getDemoSummary(initiativeId: string) {
  return apiClient.get<DemoSummary>(`/api/initiatives/${initiativeId}/demos/summary`);
}

export function createDemo(initiativeId: string, data: DemoCreate) {
  return apiClient.post<Demo>(`/api/initiatives/${initiativeId}/demos`, data, { actionLabel: "Logging demo" });
}

export function updateDemo(demoId: string, data: DemoUpdate, options: { quiet?: boolean } = {}) {
  // Quick inline changes (e.g. the outcome) skip the full-screen saving overlay
  return apiClient.patch<Demo>(`/api/demos/${demoId}`, data, options.quiet ? { skipGlobalLoading: true } : { actionLabel: "Saving demo" });
}

export function deleteDemo(demoId: string) {
  return apiClient.delete<null>(`/api/demos/${demoId}`, { actionLabel: "Deleting demo" });
}
