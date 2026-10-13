import { apiClient } from "./apiClient";
import type { InitiativeFilters, InitiativeListResponse } from "@/types/initiatives";

export function getInitiatives(filters: InitiativeFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return apiClient.get<InitiativeListResponse>(`/api/initiatives${query ? `?${query}` : ""}`);
}
