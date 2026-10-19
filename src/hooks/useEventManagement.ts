import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import {
  addEventStaff,
  getEventOverview,
  getEventPerformance,
  getEventStaff,
  getEventTravellers,
  removeEventStaff,
  updateEventStaff,
} from "@/services/eventManagementService";
import type { StaffAssignmentCreate, StaffAssignmentUpdate } from "@/types/eventManagement";
import type { EventPerformanceFilters } from "@/types/eventPerformance";

export function useEventOverview(search: string) {
  return useQuery({
    queryKey: queryKeys.eventOverview(search),
    queryFn: () => getEventOverview(search),
    placeholderData: keepPreviousData,
  });
}

export function useEventPerformance(filters: EventPerformanceFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.eventPerformance(filters),
    queryFn: () => getEventPerformance(filters),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useEventStaff(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.eventStaff(initiativeId ?? ""),
    queryFn: () => getEventStaff(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

/** The people travelling to an event, from its Navan bookings (the Navan sync keeps them up to date) */
export function useEventTravellers(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.eventTravellers(initiativeId ?? ""),
    queryFn: () => getEventTravellers(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

// A team change shows on the event's staff list and on its card
function useRefreshStaff(initiativeId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.eventStaff(initiativeId) }),
      queryClient.invalidateQueries({ queryKey: ["event-overview"] }),
    ]);
}

export function useAddEventStaff(initiativeId: string) {
  const refresh = useRefreshStaff(initiativeId);
  return useMutation({ mutationFn: (data: StaffAssignmentCreate) => addEventStaff(initiativeId, data), onSuccess: refresh });
}

export function useUpdateEventStaff(initiativeId: string) {
  const refresh = useRefreshStaff(initiativeId);
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: StaffAssignmentUpdate }) => updateEventStaff(assignmentId, data),
    onSuccess: refresh,
  });
}

export function useRemoveEventStaff(initiativeId: string) {
  const refresh = useRefreshStaff(initiativeId);
  return useMutation({ mutationFn: (assignmentId: string) => removeEventStaff(assignmentId), onSuccess: refresh });
}
