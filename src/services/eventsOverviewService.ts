import { apiClient } from "./apiClient";
import type {
  EventOverviewDetail,
  EventsOverviewFilters,
  EventsOverviewResponse,
  HubSpotLinkUpdate,
  HubSpotOptions,
  NavanTripLinkUpdate,
  NavanTripOption,
} from "@/types/eventsOverview";

/** The Navan events for the period and filters, with the HubSpot results matched to each */
export function getEventsOverview(filters: EventsOverviewFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return apiClient.get<EventsOverviewResponse>(`/api/events/navan-events${query ? `?${query}` : ""}`);
}

/** One event in full: money, travellers, HubSpot results, who attended, the campaign's assets */
export function getEventOverviewDetail(initiativeId: string) {
  return apiClient.get<EventOverviewDetail>(`/api/events/navan-events/${initiativeId}`);
}

/** Every HubSpot campaign and marketing event, for picking an event's match */
export function getHubSpotOptions() {
  return apiClient.get<HubSpotOptions>("/api/events/navan-events/hubspot-options");
}

/** Pick an event's HubSpot campaign / marketing event, mark it as having none, or (neither) use the name match */
export function setEventHubSpotLink(initiativeId: string, link: HubSpotLinkUpdate) {
  return apiClient.put<void>(`/api/events/navan-events/${initiativeId}/hubspot-link`, link, { actionLabel: "Saving the HubSpot link" });
}

/** The Navan trips that aren't joined to a HubSpot event */
export function getNavanTripOptions() {
  return apiClient.get<NavanTripOption[]>("/api/events/navan-events/navan-options");
}

/** Join a Navan trip to a HubSpot event (its travel then counts for the event), or take it off again */
export function setNavanTripLink(hubspotEventId: string, link: NavanTripLinkUpdate) {
  return apiClient.put<void>(`/api/events/navan-events/${hubspotEventId}/navan-link`, link, { actionLabel: "Saving the Navan link" });
}
