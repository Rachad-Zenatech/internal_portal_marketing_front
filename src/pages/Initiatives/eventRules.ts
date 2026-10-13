// Mirrors EVENT_REQUIRED_FIELDS in the backend (services/initiative_service.py) — keep the two in sync

export const EVENTS_CHANNEL_CODE = "EVENTS";

export type EventRequiredField = "city" | "country_code";

/** Event fields each sub-channel must have, and the message shown when one is missing */
export const EVENT_REQUIRED_FIELDS: Record<string, { fields: EventRequiredField[]; message: string }> = {
  IN_PERSON_EVENTS: { fields: ["city", "country_code"], message: "In-person events need a city and a country." },
  SPONSORSHIPS: { fields: ["country_code"], message: "Sponsorships need a country." },
};

/** Sub-channels that happen online, so they have no location */
export const ONLINE_EVENT_SUB_CHANNELS = new Set(["VIRTUAL_EVENTS", "WEBINARS"]);

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
