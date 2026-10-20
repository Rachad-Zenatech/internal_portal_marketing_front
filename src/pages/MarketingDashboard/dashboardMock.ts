// SAMPLE DATA for the Dashboard mock-up: nothing here comes from the API yet. The figures are consistent with each
// other (channels add up to actual spend, months add up to the quarter) so the page reads like the real thing.

export const MOCK_CURRENCY = "USD";

export const MOCK_PERIOD = {
  label: "This quarter",
  dates: "Oct 1 – Dec 31, 2026",
  compareLabel: "Q4 2025",
};

export const MOCK_KPIS = {
  approvedBudget: { current: 425000, previous: 400000 },
  actualSpend: { current: 318500, previous: 284000 },
  remaining: { current: 106500, previous: 116000 },
  leads: { current: 1420, previous: 1203 },
  costPerLead: { current: 224, previous: 236 },
  /** (closed-won revenue − spend) ÷ spend, as a percentage */
  roi: { current: 212, previous: 166 },
};

/** Approved budget, actual spend and the same month last year */
export const MOCK_MONTHS = [
  {
    key: "2026-10",
    label: "Oct",
    fullLabel: "October 2026",
    budget: 140000,
    actual: 118200,
    compare: 92000,
  },
  {
    key: "2026-11",
    label: "Nov",
    fullLabel: "November 2026",
    budget: 145000,
    actual: 122600,
    compare: 101000,
  },
  {
    key: "2026-12",
    label: "Dec",
    fullLabel: "December 2026 (to date)",
    budget: 140000,
    actual: 77700,
    compare: 91000,
  },
];

/** Leads and pipeline revenue by month (shown as two small charts: they're on different scales) */
export const MOCK_TREND = [
  { key: "2026-10", label: "Oct", leads: 410, pipeline: 620000 },
  { key: "2026-11", label: "Nov", leads: 520, pipeline: 845000 },
  { key: "2026-12", label: "Dec", leads: 490, pipeline: 1110000 },
];

export const MOCK_CHANNEL_SPEND = [
  { key: "PAID_SEARCH", label: "Paid Search", value: 101900 },
  { key: "EVENTS", label: "Events", value: 76400 },
  { key: "PAID_SOCIAL", label: "Paid Social", value: 57300 },
  { key: "CONTENT_MARKETING", label: "Content Marketing", value: 31800 },
  { key: "SEO", label: "SEO", value: 22100 },
  { key: "PARTNERSHIPS", label: "Partnerships", value: 15900 },
  { key: "OTHER", label: "Other", value: 13100 },
];

export const MOCK_HIGHLIGHTS = {
  topInitiative: { name: "SaaS North Expo", leads: 312, roi: 248 },
  topSpendChannel: { name: "Paid Search", spend: 101900, share: 32 },
  bestRoiChannel: { name: "Events", roi: 312, costPerLead: 54 },
  atRisk: { name: "WorkAware Launch", used: 88, remaining: 5900 },
};

export type AttentionStatus =
  | "AT_RISK"
  | "BEHIND_PLAN"
  | "NEEDS_REVIEW"
  | "UNDERPERFORMING"
  | "OVER_BUDGET";

export const MOCK_ATTENTION: {
  name: string;
  channel: string;
  owner: string;
  status: AttentionStatus;
  nextAction: string;
}[] = [
  {
    name: "WorkAware Launch",
    channel: "Paid Social",
    owner: "Taylor Kim",
    status: "AT_RISK",
    nextAction: "Review spend and optimise",
  },
  {
    name: "EMEA Field Events",
    channel: "Events",
    owner: "Jordan Lee",
    status: "BEHIND_PLAN",
    nextAction: "Confirm Q4 events",
  },
  {
    name: "SEO Content Expansion",
    channel: "SEO",
    owner: "Morgan Chen",
    status: "NEEDS_REVIEW",
    nextAction: "Reassess scope",
  },
  {
    name: "Partner Co-Marketing",
    channel: "Partnerships",
    owner: "Alex Rivera",
    status: "UNDERPERFORMING",
    nextAction: "Evaluate continuation",
  },
  {
    name: "Product Growth Campaign",
    channel: "Paid Search",
    owner: "Casey Park",
    status: "OVER_BUDGET",
    nextAction: "Reduce spend or reallocate",
  },
];

export const MOCK_REVIEWS = [
  {
    date: "2027-01-08",
    name: "Q4 Marketing Review",
    type: "Quarterly review",
    owner: "Taylor Kim",
    purpose: "Review performance and ROI",
  },
  {
    date: "2027-01-15",
    name: "2027 Budget Planning",
    type: "Planning",
    owner: "Alex Rivera",
    purpose: "Set Q1 budgets",
  },
  {
    date: "2027-01-20",
    name: "WorkAware Launch",
    type: "Decision review",
    owner: "Morgan Chen",
    purpose: "Scale or cut decision",
  },
];

export type ActivityKind =
  "SYNC" | "LEADS" | "BUDGET" | "EVENT" | "INSIGHT" | "INITIATIVE";

export const MOCK_ACTIVITY: {
  kind: ActivityKind;
  title: string;
  detail: string;
  when: string;
}[] = [
  {
    kind: "SYNC",
    title: "Travel costs synced from Navan",
    detail: "Q4 travel updated (38 bookings across 6 events)",
    when: "2 hours ago",
  },
  {
    kind: "LEADS",
    title: "HubSpot leads synced",
    detail: "1,420 leads for Q4 matched to their initiatives",
    when: "4 hours ago",
  },
  {
    kind: "BUDGET",
    title: "Budget updated",
    detail: "WorkAware Launch budget increased by $10,000",
    when: "1 day ago",
  },
  {
    kind: "EVENT",
    title: "Event updated",
    detail: "SaaS North Expo marked as Completed",
    when: "1 day ago",
  },
  {
    kind: "INSIGHT",
    title: "Paid Social cost per lead up 28%",
    detail: "Higher CPCs in December are reducing efficiency",
    when: "2 days ago",
  },
  {
    kind: "INITIATIVE",
    title: "New initiative created",
    detail: "2027 Partner Summit added to the roadmap",
    when: "3 days ago",
  },
];
