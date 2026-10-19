import { apiClient } from "./apiClient";
import type {
  AdCampaign,
  AdImportConfirmResult,
  AdImportPreview,
  AdImportUndoResult,
  AdPlatform,
  AdResult,
  AdResultCreate,
  AdResultFilters,
  AdResultsResponse,
  AdResultUpdate,
  AdsCampaignDetail,
  AdsHealth,
  AdsHealthFilters,
  AdsOverview,
  AdsOverviewFilters,
} from "@/types/ads";

function queryString(filters: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getAdResults(filters: AdResultFilters = {}) {
  return apiClient.get<AdResultsResponse>(`/api/ads/results${queryString(filters)}`);
}

/** Everything the Paid Advertising page shows for a date range and filters, in one currency */
export function getAdsOverview(filters: AdsOverviewFilters) {
  return apiClient.get<AdsOverview>(`/api/ads/overview${queryString(filters)}`);
}

export function getAdsCampaignDetail(initiativeId: string, range: { from: string; to: string }) {
  return apiClient.get<AdsCampaignDetail>(`/api/ads/campaigns/${initiativeId}${queryString(range)}`);
}

export function getAdsDataHealth(filters: AdsHealthFilters = {}) {
  return apiClient.get<AdsHealth>(`/api/ads/data-health${queryString(filters)}`);
}

export function getAdCampaigns(platform?: AdPlatform) {
  return apiClient.get<AdCampaign[]>(`/api/ads/campaigns${platform ? `?platform=${platform}` : ""}`);
}

export function createAdResult(data: AdResultCreate) {
  return apiClient.post<AdResult>("/api/ads/results", data, { actionLabel: "Saving ad result" });
}

export function updateAdResult(id: string, data: AdResultUpdate) {
  return apiClient.patch<AdResult>(`/api/ads/results/${id}`, data, { actionLabel: "Saving ad result" });
}

export function deleteAdResult(id: string) {
  return apiClient.delete<null>(`/api/ads/results/${id}`, { actionLabel: "Deleting ad result" });
}

/** Check a PPC spreadsheet; nothing is saved until the preview is confirmed */
export function uploadAdsSheet(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiClient.post<AdImportPreview>("/api/ads/imports", body, { actionLabel: "Checking spreadsheet" });
}

export function confirmAdsImport(batchId: string) {
  return apiClient.post<AdImportConfirmResult>(`/api/ads/imports/${batchId}/confirm`, undefined, { actionLabel: "Importing ad results" });
}

export function undoAdsImport(batchId: string) {
  return apiClient.post<AdImportUndoResult>(`/api/ads/imports/${batchId}/undo`, undefined, { actionLabel: "Undoing import" });
}

export function downloadAdsTemplate() {
  return apiClient.downloadFile("/api/ads/template", "saas-ppc-campaigns-template.xlsx");
}
