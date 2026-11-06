import { apiClient } from "./apiClient";
import type { PaidSearchEntry } from "@/pages/PaidSearch/paidSearchFields";

/** Every entry on the Paid Search board, in board order */
export function getPaidSearchEntries() {
  return apiClient.get<PaidSearchEntry[]>("/api/paid-search/entries");
}

/** Save the whole board, in order (rows not in it are removed). Quiet: it runs on its own as people type. */
export function savePaidSearchEntries(entries: PaidSearchEntry[]) {
  return apiClient.put<{ saved: number }>("/api/paid-search/entries", { entries }, { skipGlobalLoading: true });
}
