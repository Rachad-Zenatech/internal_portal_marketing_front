import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  copyBudgets,
  createBudget,
  createBudgetComment,
  createBudgetTransfer,
  deleteBudget,
  deleteBudgetComment,
  deleteBudgetTransfer,
  getBudget,
  getBudgetMonth,
  getBudgetWeek,
  updateBudget,
} from "@/services/budgetService";
import type { BudgetCommentCreate, BudgetCreate, BudgetTransferCreate, BudgetUpdate } from "@/types/budgets";

/** month is YYYY-MM-01 */
export function useBudgetMonth(month: string) {
  return useQuery({
    queryKey: queryKeys.budgetMonth(month),
    queryFn: () => getBudgetMonth(month),
    placeholderData: keepPreviousData,
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
