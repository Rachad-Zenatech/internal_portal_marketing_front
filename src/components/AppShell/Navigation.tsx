import {
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  FileClock,
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
  /** Sub-items built at runtime from reference data (see withChannelSubItems) */
  subItemsFrom?: "channels";
}

/**
 * Event a page dispatches to highlight a sidebar link other than its own URL,
 * e.g. an initiative's page highlighting its channel. detail: { path: the page's pathname, navPath: the link to highlight }
 */
export const SET_ACTIVE_NAV_EVENT = "set-active-nav";

/** Fill in sub-items that come from reference data, e.g. one link per marketing channel. */
export function withChannelSubItems(items: NavigationItem[], channels: { code: string; name: string }[]): NavigationItem[] {
  return items.map((item) => {
    if (item.subItemsFrom !== "channels" || !item.path) return item;
    return {
      ...item,
      subItems: [
        { label: `All ${item.label.toLowerCase()}`, path: item.path, navigationCode: item.navigationCode },
        ...channels.map((channel) => ({
          label: channel.name,
          path: `${item.path}?channel=${channel.code}`,
          navigationCode: item.navigationCode,
        })),
      ],
    };
  });
}

export const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    section: "MAIN",
    navigationCode: "DASHBOARD",
  },
  {
    label: "Event Management",
    path: "/events",
    icon: CalendarDays,
    section: "MARKETING",
    navigationCode: "INITIATIVES",
  },
  {
    label: "Initiatives",
    path: "/initiatives",
    icon: Megaphone,
    section: "MARKETING",
    navigationCode: "INITIATIVES",
    subItemsFrom: "channels",
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
    label: "Logs & Audit",
    icon: FileClock,
    section: "ADMINISTRATION",
    subItems: [
      { label: "Audit Log", path: "/log/audit", navigationCode: "AUDIT_LOG" },
      { label: "System Logs", path: "/log/system-logs", navigationCode: "AUDIT_LOG" },
    ],
  },
];
