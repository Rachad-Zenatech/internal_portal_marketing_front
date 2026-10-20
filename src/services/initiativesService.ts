import type { EventBudgetChange, EventBudgetPreview } from "@/types/eventBudgets";
import { apiClient } from "./apiClient";
import type {
  InitiativeActivity,
  InitiativeCreate,
  InitiativeFilters,
  InitiativeListItem,
  InitiativeListResponse,
  InitiativeSummary,
  InitiativeUpdate,
  OwnerOption,
} from "@/types/initiatives";

function filterQuery(filters: InitiativeFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      // e.g. channel_ids=7&channel_ids=8
      for (const item of value) params.append(key, String(item));
    } else if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getInitiatives(filters: InitiativeFilters = {}) {
  return apiClient.get<InitiativeListResponse>(`/api/initiatives${filterQuery(filters)}`);
}

/** The KPI cards: counts and allocated budget for the same filters as the list (paging and needs_attention ignored) */
export function getInitiativeSummary(filters: InitiativeFilters = {}) {
  return apiClient.get<InitiativeSummary>(`/api/initiatives/summary${filterQuery(filters)}`, { skipGlobalLoading: true });
}

/** Newest first, from the audit log */
export function getInitiativeActivity(id: string, limit = 10) {
  return apiClient.get<InitiativeActivity[]>(`/api/initiatives/${id}/activity?limit=${limit}`, { skipGlobalLoading: true });
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

/** Drafts and initiatives outside Events only; an event past Draft is cancelled instead */
export function deleteInitiative(id: string) {
  return apiClient.delete<null>(`/api/initiatives/${id}`, { actionLabel: "Deleting initiative" });
}

/** Check a sheet of event budgets: which events it matches and what would change. Saves nothing. */
export function previewEventBudgets(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiClient.post<EventBudgetPreview>("/api/initiatives/event-budgets/preview", body, { actionLabel: "Checking spreadsheet" });
}

/** Save previewed event budgets, all or nothing */
export function applyEventBudgets(changes: EventBudgetChange[]) {
  return apiClient.post<{ updated: number }>("/api/initiatives/event-budgets/apply", { changes }, { actionLabel: "Saving budgets" });
}
