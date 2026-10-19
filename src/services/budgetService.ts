import { apiClient } from "./apiClient";
import type {
  BudgetComment,
  BudgetCommentCreate,
  BudgetCopyResult,
  BudgetCreate,
  BudgetDetail,
  BudgetImportConfirmResult,
  BudgetImportPreview,
  BudgetImportUndoResult,
  BudgetImportUpload,
  BudgetMonth,
  BudgetRow,
  BudgetTransferCreated,
  BudgetTransferCreate,
  BudgetUpdate,
  BudgetExpenses,
  BudgetPeriod,
  BudgetWeek,
} from "@/types/budgets";

/** month is YYYY-MM-01 */
export function getBudgetMonth(month: string) {
  return apiClient.get<BudgetMonth>(`/api/budgets?month=${encodeURIComponent(month)}`);
}

/** start is the week's Monday, YYYY-MM-DD */
/** Budgets from one month to another (YYYY-MM-01 each), with spent, committed and remaining */
export function getBudgetPeriod(from: string, to: string) {
  return apiClient.get<BudgetPeriod>(`/api/budgets/period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

/** Every cost dated from one day to another (YYYY-MM-DD) */
export function getBudgetExpenses(from: string, to: string) {
  return apiClient.get<BudgetExpenses>(`/api/budgets/expenses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export function getBudgetWeek(start: string) {
  return apiClient.get<BudgetWeek>(`/api/budgets/week?start=${encodeURIComponent(start)}`);
}

export function getBudget(budgetId: string) {
  return apiClient.get<BudgetDetail>(`/api/budgets/${budgetId}`);
}

export function createBudget(data: BudgetCreate) {
  return apiClient.post<BudgetRow>("/api/budgets", data, { actionLabel: "Adding budget" });
}

export function updateBudget(budgetId: string, data: BudgetUpdate) {
  return apiClient.patch<BudgetRow>(`/api/budgets/${budgetId}`, data, { actionLabel: "Saving budget" });
}

export function deleteBudget(budgetId: string) {
  return apiClient.delete<null>(`/api/budgets/${budgetId}`, { actionLabel: "Deleting budget" });
}

export function copyBudgets(fromMonth: string, toMonth: string) {
  return apiClient.post<BudgetCopyResult>("/api/budgets/copy", { from_month: fromMonth, to_month: toMonth }, { actionLabel: "Copying budgets" });
}

export function createBudgetTransfer(data: BudgetTransferCreate) {
  return apiClient.post<BudgetTransferCreated>("/api/budget-transfers", data, { actionLabel: "Moving money" });
}

export function deleteBudgetTransfer(transferId: string) {
  return apiClient.delete<null>(`/api/budget-transfers/${transferId}`, { actionLabel: "Removing money move" });
}

export function createBudgetComment(data: BudgetCommentCreate) {
  return apiClient.post<BudgetComment>("/api/budget-comments", data, { actionLabel: "Adding note" });
}

export function deleteBudgetComment(commentId: string) {
  return apiClient.delete<null>(`/api/budget-comments/${commentId}`, { actionLabel: "Deleting note" });
}

/** Check a budget tracker sheet; nothing is saved until the preview is confirmed */
export function uploadBudgetSheet({ file, year, currency }: BudgetImportUpload) {
  const body = new FormData();
  body.append("file", file);
  body.append("year", String(year));
  body.append("currency", currency);
  return apiClient.post<BudgetImportPreview>("/api/budget-imports", body, { actionLabel: "Checking spreadsheet" });
}

export function confirmBudgetImport(batchId: string) {
  return apiClient.post<BudgetImportConfirmResult>(`/api/budget-imports/${batchId}/confirm`, undefined, { actionLabel: "Importing budgets" });
}

export function undoBudgetImport(batchId: string) {
  return apiClient.post<BudgetImportUndoResult>(`/api/budget-imports/${batchId}/undo`, undefined, { actionLabel: "Undoing import" });
}

export function downloadBudgetTemplate() {
  return apiClient.downloadFile("/api/budget-imports/template", "budget-tracker-template.xlsx");
}
