import { apiClient } from "./apiClient";
import type { ReferenceData } from "@/types/referenceData";

export function getReferenceData() {
  return apiClient.get<ReferenceData>("/api/reference-data");
}
