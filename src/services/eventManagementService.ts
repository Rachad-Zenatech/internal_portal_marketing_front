import { apiClient } from "./apiClient";
import type { EventOverviewItem, EventTraveller, StaffAssignment, StaffAssignmentCreate, StaffAssignmentUpdate } from "@/types/eventManagement";
import type { EventPerformanceFilters, EventPerformanceResponse } from "@/types/eventPerformance";

export function getEventOverview(search: string) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiClient.get<EventOverviewItem[]>(`/api/events/overview${query}`);
}

/** What events in a period cost and brought in; filters left out are not sent */
export function getEventPerformance(filters: EventPerformanceFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return apiClient.get<EventPerformanceResponse>(`/api/events/performance${query ? `?${query}` : ""}`);
}

export function getEventStaff(initiativeId: string) {
  return apiClient.get<StaffAssignment[]>(`/api/initiatives/${initiativeId}/staff`);
}

/** The people travelling to an event, from its Navan bookings, by name */
export function getEventTravellers(initiativeId: string) {
  return apiClient.get<EventTraveller[]>(`/api/initiatives/${initiativeId}/travellers`);
}

export function addEventStaff(initiativeId: string, data: StaffAssignmentCreate) {
  return apiClient.post<StaffAssignment>(`/api/initiatives/${initiativeId}/staff`, data, { actionLabel: "Adding to the team" });
}

export function updateEventStaff(assignmentId: string, data: StaffAssignmentUpdate) {
  return apiClient.patch<StaffAssignment>(`/api/event-staff/${assignmentId}`, data, { actionLabel: "Saving team member" });
}

export function removeEventStaff(assignmentId: string) {
  return apiClient.delete<null>(`/api/event-staff/${assignmentId}`, { actionLabel: "Removing from the team" });
}
