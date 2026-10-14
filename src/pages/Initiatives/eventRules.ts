// Mirrors EVENT_REQUIRED_FIELDS in the backend (services/initiative_service.py) — keep the two in sync

export const EVENTS_CHANNEL_CODE = "EVENTS";

export type EventRequiredField = "city" | "country_code";

/** Event fields each sub-channel must have, and the message shown when one is missing */
export const EVENT_REQUIRED_FIELDS: Record<string, { fields: EventRequiredField[]; message: string }> = {
  IN_PERSON_EVENTS: { fields: ["city", "country_code"], message: "In-person events need a city and a country." },
  SPONSORSHIPS: { fields: ["country_code"], message: "Sponsorships need a country." },
};

/** Sub-channels that happen online: they get a platform and event link, and a location is optional */
export const ONLINE_EVENT_SUB_CHANNELS = new Set(["VIRTUAL_EVENTS", "WEBINARS"]);

/** Sub-channels where the API rejects a platform or event link (mirrors IN_PERSON_SUB_CHANNELS in the backend) */
export const IN_PERSON_EVENT_SUB_CHANNELS = new Set(["IN_PERSON_EVENTS", "SPONSORSHIPS"]);

export const EVENT_PLATFORM_SUGGESTIONS = ["Zoom", "Teams", "Google Meet", "ON24", "Hopin", "Other"];

/** Same check as the API: an event link must be a web address */
export function eventUrlProblem(url: string): string | null {
  const value = url.trim();
  return value && !/^https?:\/\//i.test(value) ? "Event link must start with http:// or https://" : null;
}

export function requiredEventFields(subChannelCode: string | null | undefined): EventRequiredField[] {
  return (subChannelCode && EVENT_REQUIRED_FIELDS[subChannelCode]?.fields) || [];
}

/** The API's message if a required event field is empty, otherwise null */
export function missingEventFields(
  subChannelCode: string | null | undefined,
  values: Record<EventRequiredField, string | null | undefined>,
): string | null {
  const rule = subChannelCode ? EVENT_REQUIRED_FIELDS[subChannelCode] : undefined;
  if (!rule) return null;
  return rule.fields.some((field) => !values[field]?.trim()) ? rule.message : null;
}
