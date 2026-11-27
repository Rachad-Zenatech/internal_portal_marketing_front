import { apiClient } from "./apiClient";
import type { GoogleMarketingReport, GoogleReportFilters, GoogleReportingBrand } from "@/types/googleReporting";

export function getGoogleReportingBrands(signal?: AbortSignal) {
  return apiClient.get<GoogleReportingBrand[]>("/api/marketing/google/brands", { signal });
}

export function getGoogleMarketingReport(filters: GoogleReportFilters, signal?: AbortSignal) {
  const params = new URLSearchParams({ ...filters });
  return apiClient.get<GoogleMarketingReport>(`/api/marketing/google/report?${params}`, { signal });
}
