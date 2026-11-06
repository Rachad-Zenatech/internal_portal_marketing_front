import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { getEventOverviewDetail, getEventsOverview, getHubSpotOptions, getNavanTripOptions, setEventHubSpotLink, setNavanTripLink } from "@/services/eventsOverviewService";
import type { EventsOverviewFilters, HubSpotLinkUpdate, NavanTripLinkUpdate } from "@/types/eventsOverview";

/** The Navan events for the period and filters; the previous data stays on screen while new filters load */
export function useEventsOverview(filters: EventsOverviewFilters) {
  return useQuery({
    queryKey: queryKeys.eventsOverview(filters),
    queryFn: () => getEventsOverview(filters),
    placeholderData: keepPreviousData,
  });
}

/** One event in full */
export function useEventOverviewDetail(initiativeId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventOverviewDetail(initiativeId ?? ""),
    queryFn: () => getEventOverviewDetail(initiativeId as string),
    enabled: Boolean(initiativeId),
  });
}

/** The HubSpot campaigns and marketing events an event can be linked to (loaded when the picker opens) */
export function useHubSpotOptions(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.eventsHubSpotOptions(),
    queryFn: getHubSpotOptions,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Save an event's HubSpot link, then reload the overview and that event */
export function useSetEventHubSpotLink(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (link: HubSpotLinkUpdate) => setEventHubSpotLink(initiativeId, link),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events-overview"] });
    },
  });
}

/** The Navan trips that can still be joined to a HubSpot event */
export function useNavanTripOptions(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.eventsHubSpotOptions(), "navan-trips"],
    queryFn: getNavanTripOptions,
    enabled,
  });
}

/** Join a Navan trip to a HubSpot event, or take it off, then reload the overview */
export function useSetNavanTripLink(hubspotEventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (link: NavanTripLinkUpdate) => setNavanTripLink(hubspotEventId, link),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events-overview"] });
    },
  });
}
