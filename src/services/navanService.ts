import { apiClient } from "./apiClient";
import type { NavanSyncStatus } from "@/types/navan";

/** Whether the Navan sync is set up, and its last run with the Navan events it found */
export function getNavanStatus() {
  return apiClient.get<NavanSyncStatus>("/api/integrations/navan/sync-status");
}
