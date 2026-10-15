import { apiClient } from "./apiClient";
import type {
  BudgetComment,
  BudgetCommentCreate,
  BudgetCopyResult,
  BudgetCreate,
  BudgetDetail,
  BudgetMonth,
  BudgetRow,
  BudgetTransferCreated,
  BudgetTransferCreate,
  BudgetUpdate,
  BudgetWeek,
} from "@/types/budgets";

/** month is YYYY-MM-01 */
export function getBudgetMonth(month: string) {
  return apiClient.get<BudgetMonth>(`/api/budgets?month=${encodeURIComponent(month)}`);
}

/** start is the week's Monday, YYYY-MM-DD */
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
