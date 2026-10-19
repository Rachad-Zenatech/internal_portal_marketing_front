import {
  CalendarDays,
  ChartColumn,
  Megaphone,
  ShieldCheck,
  FileClock,
  Wallet,
  Share2,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationSubItem {
  label: string;
  path: string;
  navigationCode?: string;
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon: LucideIcon;
  section?: string;
  navigationCode?: string;
  subItems?: NavigationSubItem[];
}

/**
 * Event a page dispatches to highlight a sidebar link other than its own URL,
 * e.g. an initiative's page highlighting its channel. detail: { path: the page's pathname, navPath: the link to highlight }
 */
export const SET_ACTIVE_NAV_EVENT = "set-active-nav";

/** The channels with their own sidebar link; every other channel is under "Other channels" */
export const MAIN_CHANNEL_CODES = [
  "PAID_SEARCH",
  "PAID_SOCIAL",
  "ORGANIC_SOCIAL",
  "SEO",
  "CONTENT_MARKETING",
  "EMAIL_MARKETING",
  "EVENTS",
  "PARTNERSHIPS",
];
/** ?channel= value for every channel not in MAIN_CHANNEL_CODES */
export const OTHER_CHANNELS = "others";

const initiativesLink = (label: string, channel?: string): NavigationSubItem => ({
  label,
  path: channel ? `/initiatives?channel=${channel}` : "/initiatives",
  navigationCode: "INITIATIVES",
});

export const navigation: NavigationItem[] = [
  {
    label: "Marketing Initiatives",
    path: "/initiatives",
    icon: Megaphone,
    section: "MARKETING",
    navigationCode: "INITIATIVES",
    subItems: [
      initiativesLink("All Initiatives"),
      initiativesLink("Paid Search", "PAID_SEARCH"),
      initiativesLink("Paid Social", "PAID_SOCIAL"),
      initiativesLink("Organic Social", "ORGANIC_SOCIAL"),
      initiativesLink("SEO", "SEO"),
      initiativesLink("Content Marketing", "CONTENT_MARKETING"),
      initiativesLink("Email Marketing", "EMAIL_MARKETING"),
      initiativesLink("Events", "EVENTS"),
      initiativesLink("Partnerships", "PARTNERSHIPS"),
      initiativesLink("Other channels", OTHER_CHANNELS),
    ],
  },
  {
    label: "Events Overview",
    path: "/events",
    icon: CalendarDays,
    section: "MARKETING",
    navigationCode: "INITIATIVES",
  },
  {
    label: "Budgets & Expenses",
    path: "/budgets",
    icon: Wallet,
  Share2,
  Globe,
    section: "MARKETING",
    navigationCode: "INITIATIVES",
  },
  {
    label: "Paid Advertising",
    path: "/paid-ads",
    icon: ChartColumn,
    section: "MARKETING",
    navigationCode: "INITIATIVES",
  },
  {
    label: "Social Media",
    path: "/socials",
    icon: Share2,
  Globe,
    section: "MARKETING",
    navigationCode: "INITIATIVES",
    subItems: [
      { label: "All Socials", path: "/socials", navigationCode: "INITIATIVES" },
      { label: "LinkedIn", path: "/socials?platform=LINKEDIN_PAGE", navigationCode: "INITIATIVES" },
      { label: "X (Twitter)", path: "/socials?platform=X_TWITTER", navigationCode: "INITIATIVES" },
      { label: "Instagram", path: "/socials?platform=INSTAGRAM", navigationCode: "INITIATIVES" },
      { label: "Facebook", path: "/socials?platform=FACEBOOK_PAGE", navigationCode: "INITIATIVES" },
      { label: "YouTube", path: "/socials?platform=YOUTUBE", navigationCode: "INITIATIVES" },
      { label: "TikTok", path: "/socials?platform=TIKTOK", navigationCode: "INITIATIVES" },
    ],
  },
  {
    label: "System & Security",
    icon: ShieldCheck,
    section: "ADMINISTRATION",
    subItems: [
      { label: "Users", path: "/configurations/users", navigationCode: "CONFIG_USERS" },
      { label: "Roles", path: "/configurations/roles", navigationCode: "CONFIG_ROLES" },
      { label: "Role Assignments", path: "/configurations/user-role-assignment", navigationCode: "CONFIG_USER_ROLE_ASSIGNMENT" },
      { label: "Role Permissions", path: "/configurations/role-group-permissions", navigationCode: "CONFIG_ROLES" },
      { label: "API Permissions", path: "/configurations/role-api-permissions", navigationCode: "CONFIG_ROLE_API_PERMISSIONS" },
      { label: "MCP Tool Permissions", path: "/configurations/role-mcp-tool-permissions", navigationCode: "CONFIG_ROLE_MCP_TOOL_PERMISSIONS" },
    ],
  },
  {
    label: "OAuth Integrations",
    path: "/configurations/integrations?category=PAID_ADS",
    icon: Globe,
    section: "ADMINISTRATION",
    navigationCode: "CONFIG_ROLES",
    subItems: [
      {
        label: "Paid Advertising",
        path: "/configurations/integrations?category=PAID_ADS",
        navigationCode: "CONFIG_ROLES",
      },
      {
        label: "Organic Social Media",
        path: "/configurations/integrations?category=SOCIAL_MEDIA",
        navigationCode: "CONFIG_ROLES",
      },
    ],
  },
  {
    label: "Logs & Audit",
    icon: FileClock,
    section: "ADMINISTRATION",
    subItems: [
      { label: "Audit Log", path: "/log/audit", navigationCode: "AUDIT_LOG" },
      { label: "System Logs", path: "/log/system-logs", navigationCode: "AUDIT_LOG" },
    ],
  },
];
