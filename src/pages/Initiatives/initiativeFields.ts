// Shared labels and rules for the initiatives page, side panel and the create/edit wizard
import type { AttentionReason, DataSource, KpiUnit, LinkSystem } from "@/types/initiatives";
import type { ChoiceItem, ReferenceData } from "@/types/referenceData";
import { formatMoney } from "./format";

const choice = (code: string, name: string): ChoiceItem => ({ code, name });

/**
 * Allowed values when reference data has no `choices` for a field yet (the API is catching up).
 * The API's lists win whenever they're there.
 */
const FALLBACK_CHOICES: Record<string, ChoiceItem[]> = {
  campaign_objective: [
    choice("AWARENESS", "Awareness"),
    choice("TRAFFIC", "Traffic"),
    choice("LEADS", "Leads"),
    choice("CONVERSIONS", "Conversions"),
    choice("ENGAGEMENT", "Engagement"),
    choice("VIDEO_VIEWS", "Video views"),
  ],
  focus_area: [
    choice("TECHNICAL", "Technical"),
    choice("CONTENT", "Content"),
    choice("LINK_BUILDING", "Link building"),
    choice("LOCAL", "Local"),
    choice("OTHER", "Other"),
  ],
  content_type: [
    choice("BLOG_POST", "Blog post"),
    choice("CASE_STUDY", "Case study"),
    choice("WHITEPAPER", "Whitepaper"),
    choice("EBOOK", "eBook"),
    choice("VIDEO", "Video"),
    choice("WEBINAR", "Webinar"),
    choice("INFOGRAPHIC", "Infographic"),
    choice("OTHER", "Other"),
  ],
  email_platform: [choice("HUBSPOT", "HubSpot"), choice("MAILCHIMP", "Mailchimp"), choice("OTHER", "Other")],
  partnership_type: [
    choice("REFERRAL", "Referral"),
    choice("RESELLER", "Reseller"),
    choice("CO_MARKETING", "Co-marketing"),
    choice("SPONSORSHIP", "Sponsorship"),
    choice("TECHNOLOGY", "Technology"),
    choice("OTHER", "Other"),
  ],
  link_system: [
    choice("HUBSPOT", "HubSpot"),
    choice("GOOGLE_ADS", "Google Ads"),
    choice("MICROSOFT_ADS", "Microsoft Ads"),
    choice("LINKEDIN_ADS", "LinkedIn Ads"),
    choice("META_ADS", "Meta Ads"),
  ],
};

/** The values a picklist field allows: the API's list, or the fallback above */
export function choicesFor(reference: ReferenceData | undefined, field: string): ChoiceItem[] {
  const fromApi = reference?.choices?.[field];
  return fromApi && fromApi.length ? fromApi : (FALLBACK_CHOICES[field] ?? []);
}

/** "Leads" for LEADS, or the code itself when it isn't known */
export function choiceName(reference: ReferenceData | undefined, field: string, code: string | null | undefined) {
  if (!code) return null;
  return choicesFor(reference, field).find((c) => c.code === code)?.name ?? code;
}

export interface ChannelField {
  key: string;
  label: string;
  /** "choice" fields pick from choicesFor(key) */
  kind: "text" | "choice";
  maxLength?: number;
  placeholder?: string;
  hint?: string;
}

const AD_FIELDS: ChannelField[] = [
  { key: "ad_account_id", label: "Ad account ID", kind: "text", maxLength: 100, placeholder: "e.g. 123-456-7890" },
  { key: "campaign_objective", label: "Campaign objective", kind: "choice" },
];
const EMAIL_FIELDS: ChannelField[] = [
  { key: "email_platform", label: "Email platform", kind: "choice" },
  { key: "campaign_or_workflow", label: "Campaign or workflow", kind: "text", maxLength: 200, placeholder: "e.g. Spring nurture sequence" },
];
const PARTNER_FIELDS: ChannelField[] = [
  { key: "partner_name", label: "Partner name", kind: "text", maxLength: 200, placeholder: "e.g. Acme Resellers" },
  { key: "partnership_type", label: "Partnership type", kind: "choice" },
];

/** Extra details per channel code; every one optional. Events keep their own event fields instead. */
export const CHANNEL_FIELDS: Record<string, ChannelField[]> = {
  PAID_SEARCH: AD_FIELDS,
  PAID_SOCIAL: AD_FIELDS,
  SEO: [
    { key: "website", label: "Website", kind: "text", maxLength: 255, placeholder: "e.g. example.com", hint: "A domain or an https:// link." },
    { key: "focus_area", label: "Focus area", kind: "choice" },
  ],
  CONTENT_MARKETING: [
    { key: "content_type", label: "Content type", kind: "choice" },
    { key: "distribution_channel", label: "Distribution channel", kind: "text", maxLength: 120, placeholder: "e.g. Blog and newsletter" },
  ],
  EMAIL_MARKETING: EMAIL_FIELDS,
  MARKETING_AUTOMATION: EMAIL_FIELDS,
  PARTNERSHIPS: PARTNER_FIELDS,
  AFFILIATES: PARTNER_FIELDS,
  ORGANIC_SOCIAL: [
    { key: "profile_account", label: "Profile or account", kind: "text", maxLength: 200, placeholder: "e.g. @yourbrand" },
    { key: "content_group", label: "Content group", kind: "text", maxLength: 200, placeholder: "e.g. Product tips series" },
  ],
};

export const channelFields = (channelCode: string | undefined) => (channelCode && CHANNEL_FIELDS[channelCode]) || [];

const WEBSITE = /^(https:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

/** A message when a channel field's value isn't allowed, or null */
export function channelFieldProblem(field: ChannelField, value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (field.maxLength && text.length > field.maxLength) return `${field.label} can be up to ${field.maxLength} characters.`;
  if (field.key === "website" && (!WEBSITE.test(text) || /^http:\/\//i.test(text))) {
    return "Enter the website as a domain (example.com) or an https:// link.";
  }
  return null;
}

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  LINKED: "Linked external campaign",
  MANUAL: "Results entered manually",
  LATER: "Data source to connect later",
};

export const linkSystemName = (reference: ReferenceData | undefined, system: LinkSystem | string) =>
  choiceName(reference, "link_system", system) ?? system;

export const ATTENTION_LABELS: Record<AttentionReason, string> = {
  OVER_BUDGET: "Over budget",
  NO_BUDGET: "No budget set",
  NO_TRACKING: "No costs, results or linked campaigns yet",
  NO_RESULTS: "Ended with no results recorded",
  NO_DATES: "No start date",
};

/** A KPI value in its unit: "$45", "12%", "1,200" */
export function formatKpiValue(value: number, unit: KpiUnit | null | undefined, currency: string) {
  if (unit === "MONEY") return formatMoney(value, currency);
  if (unit === "PERCENT") return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export const MAX_DESCRIPTION = 1000;
