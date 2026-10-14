import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { addEventStaff, getEventOverview, getEventStaff, removeEventStaff, updateEventStaff } from "@/services/eventManagementService";
import type { StaffAssignmentCreate, StaffAssignmentUpdate } from "@/types/eventManagement";

export function useEventOverview(search: string) {
  return useQuery({
    queryKey: queryKeys.eventOverview(search),
    queryFn: () => getEventOverview(search),
    placeholderData: keepPreviousData,
  });
}

export function useEventStaff(initiativeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.eventStaff(initiativeId ?? ""),
    queryFn: () => getEventStaff(initiativeId as string),
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
