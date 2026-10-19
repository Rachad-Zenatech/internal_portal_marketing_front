import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  confirmBudgetImport,
  copyBudgets,
  createBudget,
  createBudgetComment,
  createBudgetTransfer,
  deleteBudget,
  deleteBudgetComment,
  deleteBudgetTransfer,
  getBudget,
  getBudgetExpenses,
  getBudgetMonth,
  getBudgetPeriod,
  getBudgetWeek,
  undoBudgetImport,
  updateBudget,
  uploadBudgetSheet,
} from "@/services/budgetService";
import type { BudgetCommentCreate, BudgetCreate, BudgetImportUpload, BudgetTransferCreate, BudgetUpdate } from "@/types/budgets";

/** month is YYYY-MM-01 */
export function useBudgetMonth(month: string) {
  return useQuery({
    queryKey: queryKeys.budgetMonth(month),
    queryFn: () => getBudgetMonth(month),
    placeholderData: keepPreviousData,
  });
}

/** Several months at once (YYYY-MM-01 each), e.g. for a chart; shares the cache with useBudgetMonth */
export function useBudgetMonths(months: string[], enabled = true) {
  return useQueries({
    queries: months.map((month) => ({
      queryKey: queryKeys.budgetMonth(month),
      queryFn: () => getBudgetMonth(month),
      placeholderData: keepPreviousData,
      enabled,
    })),
  });
}

/** A period of months (YYYY-MM-01 each); refreshed with everything else under the months */
export function useBudgetPeriod(from: string | null, to: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.budgetPeriod(from ?? "", to ?? ""),
    queryFn: () => getBudgetPeriod(from as string, to as string),
    placeholderData: keepPreviousData,
    enabled: enabled && Boolean(from && to),
  });
}

/** Every cost from one day to another (YYYY-MM-DD) */
export function useBudgetExpenses(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.budgetExpenses(from, to),
    queryFn: () => getBudgetExpenses(from, to),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** start is the week's Monday, YYYY-MM-DD */
export function useBudgetWeek(start: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.budgetWeek(start),
    queryFn: () => getBudgetWeek(start),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useBudget(budgetId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.budget(budgetId ?? ""),
    queryFn: () => getBudget(budgetId as string),
    enabled: Boolean(budgetId),
  });
}

// Any budget change can move figures on several months (money moves cross months) and on any open budget,
// so every month list and every budget detail is refreshed
function useRefreshBudgets() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.budgetMonths() }), queryClient.invalidateQueries({ queryKey: queryKeys.budgets() })]);
}

export function useCreateBudget() {
  const refresh = useRefreshBudgets();
  return useMutation({ mutationFn: (data: BudgetCreate) => createBudget(data), onSuccess: refresh });
}

export function useUpdateBudget() {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: ({ budgetId, data }: { budgetId: string; data: BudgetUpdate }) => updateBudget(budgetId, data),
    onSuccess: refresh,
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: (budgetId: string) => deleteBudget(budgetId),
    onSuccess: (_data, budgetId) => {
      queryClient.removeQueries({ queryKey: queryKeys.budget(budgetId) });
      return refresh();
    },
  });
}

export function useCopyBudgets() {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: ({ fromMonth, toMonth }: { fromMonth: string; toMonth: string }) => copyBudgets(fromMonth, toMonth),
    onSuccess: refresh,
  });
}

export function useCreateBudgetTransfer() {
  const refresh = useRefreshBudgets();
  return useMutation({ mutationFn: (data: BudgetTransferCreate) => createBudgetTransfer(data), onSuccess: refresh });
}

export function useDeleteBudgetTransfer() {
  const refresh = useRefreshBudgets();
  return useMutation({ mutationFn: (transferId: string) => deleteBudgetTransfer(transferId), onSuccess: refresh });
}

// Notes change the comment count, latest note and last update on the month list too
export function useCreateBudgetComment() {
  const refresh = useRefreshBudgets();
  return useMutation({ mutationFn: (data: BudgetCommentCreate) => createBudgetComment(data), onSuccess: refresh });
}

export function useDeleteBudgetComment() {
  const refresh = useRefreshBudgets();
  return useMutation({ mutationFn: (commentId: string) => deleteBudgetComment(commentId), onSuccess: refresh });
}

/** Upload a budget tracker for a preview; nothing changes until it's confirmed */
export function useUploadBudgetSheet() {
  return useMutation({ mutationFn: (upload: BudgetImportUpload) => uploadBudgetSheet(upload) });
}

export function useConfirmBudgetImport() {
  const refresh = useRefreshBudgets();
  return useMutation({ mutationFn: (batchId: string) => confirmBudgetImport(batchId), onSuccess: refresh });
}

export function useUndoBudgetImport() {
  const refresh = useRefreshBudgets();
  return useMutation({ mutationFn: (batchId: string) => undoBudgetImport(batchId), onSuccess: refresh });
}
