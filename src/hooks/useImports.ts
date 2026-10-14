import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmImport, getInitiativeImports, undoImport, uploadCostSheet } from "@/services/importsService";
import { queryKeys } from "@/services/queryKeys";
import { useRefreshCosts } from "./useSpend";

export function useInitiativeImports(initiativeId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.initiativeImports(initiativeId),
    queryFn: () => getInitiativeImports(initiativeId),
    enabled,
  });
}

function useRefreshImports(initiativeId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.initiativeImports(initiativeId) });
}

/** Upload a cost sheet for a preview (the upload appears in the history straight away) */
export function useUploadCostSheet(initiativeId: string) {
  const refreshImports = useRefreshImports(initiativeId);
  return useMutation({
    mutationFn: (file: File) => uploadCostSheet(initiativeId, file),
    onSuccess: refreshImports,
  });
}

// Confirming or undoing changes the costs as well as the upload history
export function useConfirmImport(initiativeId: string) {
  const refreshCosts = useRefreshCosts(initiativeId);
  const refreshImports = useRefreshImports(initiativeId);
  return useMutation({
    mutationFn: (batchId: string) => confirmImport(batchId),
    onSuccess: () => Promise.all([refreshCosts(), refreshImports()]),
  });
}

export function useUndoImport(initiativeId: string) {
  const refreshCosts = useRefreshCosts(initiativeId);
  const refreshImports = useRefreshImports(initiativeId);
  return useMutation({
    mutationFn: (batchId: string) => undoImport(batchId),
    onSuccess: () => Promise.all([refreshCosts(), refreshImports()]),
  });
}
