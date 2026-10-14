import { apiClient } from "./apiClient";
import type { CostSheetPreview, ImportBatchSummary, ImportConfirmResult, ImportUndoResult } from "@/types/imports";

/** Check a cost sheet; nothing is saved as costs until the preview is confirmed */
export function uploadCostSheet(initiativeId: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiClient.post<CostSheetPreview>(`/api/initiatives/${initiativeId}/imports/cost-sheet`, body, { actionLabel: "Checking cost sheet" });
}

export function downloadCostSheetTemplate() {
  return apiClient.downloadFile("/api/imports/cost-sheet/template", "event-cost-sheet-template.xlsx");
}

export function confirmImport(batchId: string) {
  return apiClient.post<ImportConfirmResult>(`/api/imports/${batchId}/confirm`, undefined, { actionLabel: "Importing costs" });
}

export function undoImport(batchId: string) {
  return apiClient.post<ImportUndoResult>(`/api/imports/${batchId}/undo`, undefined, { actionLabel: "Undoing import" });
}

export function getInitiativeImports(initiativeId: string) {
  return apiClient.get<ImportBatchSummary[]>(`/api/initiatives/${initiativeId}/imports`);
}
