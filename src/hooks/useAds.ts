import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmAdsImport,
  createAdResult,
  deleteAdResult,
  getAdCampaigns,
  getAdResults,
  undoAdsImport,
  updateAdResult,
  uploadAdsSheet,
} from "@/services/adsService";
import { queryKeys } from "@/services/queryKeys";
import type { AdPlatform, AdResultCreate, AdResultFilters, AdResultUpdate } from "@/types/ads";

export function useAdResults(filters: AdResultFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.adResults(filters),
    queryFn: () => getAdResults(filters),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAdCampaigns(platform?: AdPlatform, enabled = true) {
  return useQuery({
    queryKey: queryKeys.adCampaigns(platform),
    queryFn: () => getAdCampaigns(platform),
    enabled,
  });
}

// Ad results feed the campaign's costs (spend lines), its results (outcomes) and so the
// cost sheet, performance, initiative totals and monthly budgets. An upload can touch any campaign.
export function useRefreshAds() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [
        queryKeys.ads(),
        ["spend-lines"],
        ["spend-summary"],
        ["performance"],
        ["outcomes"],
        ["initiative"],
        ["initiatives"],
        ["initiative-imports"],
        queryKeys.budgetMonths(),
        queryKeys.budgets(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function useCreateAdResult() {
  const refresh = useRefreshAds();
  return useMutation({
    mutationFn: (data: AdResultCreate) => createAdResult(data),
    onSuccess: refresh,
  });
}

export function useUpdateAdResult() {
  const refresh = useRefreshAds();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdResultUpdate }) => updateAdResult(id, data),
    onSuccess: refresh,
  });
}

export function useDeleteAdResult() {
  const refresh = useRefreshAds();
  return useMutation({
    mutationFn: (id: string) => deleteAdResult(id),
    onSuccess: refresh,
  });
}

/** Upload a PPC spreadsheet for a preview; nothing changes until it's confirmed */
export function useUploadAdsSheet() {
  return useMutation({ mutationFn: (file: File) => uploadAdsSheet(file) });
}

export function useConfirmAdsImport() {
  const refresh = useRefreshAds();
  return useMutation({
    mutationFn: (batchId: string) => confirmAdsImport(batchId),
    onSuccess: refresh,
  });
}

export function useUndoAdsImport() {
  const refresh = useRefreshAds();
  return useMutation({
    mutationFn: (batchId: string) => undoAdsImport(batchId),
    onSuccess: refresh,
  });
}
