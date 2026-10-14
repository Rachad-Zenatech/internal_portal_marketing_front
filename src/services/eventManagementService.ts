import { apiClient } from "./apiClient";
import type { EventOverviewItem, StaffAssignment, StaffAssignmentCreate, StaffAssignmentUpdate } from "@/types/eventManagement";

export function getEventOverview(search: string) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiClient.get<EventOverviewItem[]>(`/api/events/overview${query}`);
}

export function getEventStaff(initiativeId: string) {
  return apiClient.get<StaffAssignment[]>(`/api/initiatives/${initiativeId}/staff`);
}

export function addEventStaff(initiativeId: string, data: StaffAssignmentCreate) {
  return apiClient.post<StaffAssignment>(`/api/initiatives/${initiativeId}/staff`, data, { actionLabel: "Adding to the team" });
}

export function updateEventStaff(assignmentId: string, data: StaffAssignmentUpdate) {
  return apiClient.patch<StaffAssignment>(`/api/event-staff/${assignmentId}`, data, { actionLabel: "Saving travel details" });
}

export function removeEventStaff(assignmentId: string) {
  return apiClient.delete<null>(`/api/event-staff/${assignmentId}`, { actionLabel: "Removing from the team" });
}
