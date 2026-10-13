import { apiClient } from "./apiClient";
import type {
  InitiativeCreate,
  InitiativeFilters,
  InitiativeListItem,
  InitiativeListResponse,
  InitiativeUpdate,
  OwnerOption,
} from "@/types/initiatives";

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

export function createInitiative(data: InitiativeCreate) {
  return apiClient.post<InitiativeListItem>("/api/initiatives", data, { actionLabel: "Creating initiative" });
}

export function getOwnerOptions(search: string) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiClient.get<OwnerOption[]>(`/api/initiatives/owner-options${query}`, { skipGlobalLoading: true });
}

export function getInitiative(id: string) {
  return apiClient.get<InitiativeListItem>(`/api/initiatives/${id}`);
}

export function updateInitiative(id: string, data: InitiativeUpdate) {
  return apiClient.patch<InitiativeListItem>(`/api/initiatives/${id}`, data, { actionLabel: "Saving initiative" });
}
