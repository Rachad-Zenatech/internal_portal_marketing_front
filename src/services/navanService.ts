import { apiClient } from "./apiClient";
import type { NavanSyncStatus, NavanSyncSummary } from "@/types/navan";

/** Whether the Navan sync is set up, and its last run with the Navan events it found */
export function getNavanStatus() {
  return apiClient.get<NavanSyncStatus>("/api/integrations/navan/sync-status");
}

/** Read Navan bookings now and update every linked event's travel cost (the scheduled sync does the same) */
export function syncNavanCosts() {
  return apiClient.post<NavanSyncSummary>("/api/integrations/navan/sync-costs", undefined, { actionLabel: "Syncing with Navan" });
}
