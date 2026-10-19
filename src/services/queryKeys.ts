// ─── Query key factory ────────────────────────────────────────────────────────
// Centralized React Query keys for consistent invalidation and caching.

export const queryKeys = {
  // Auth & RBAC
  users: () => ["users"] as const,
  user: (id: string) => ["users", id] as const,
  roles: () => ["roles"] as const,
  role: (id: string) => ["roles", id] as const,
  rolePermissions: (roleId: string) => ["role-permissions", roleId] as const,
  permissionModules: () => ["permission-modules"] as const,
  rolePermissionGroups: (roleId: string) => ["role-permission-groups", roleId] as const,
  roleApiPermissions: (roleId: string) => ["role-api-permissions", roleId] as const,
  mcpToolPermissions: (roleId: string) => ["role-mcp-tool-permissions", roleId] as const,

  // Logs & Observability
  auditLogs: () => ["auditLogs"] as const,
  loginActivities: () => ["loginActivities"] as const,
  systemLogs: () => ["systemLogs"] as const,

  // Notifications
  notifications: () => ["notifications"] as const,
  unreadNotificationCount: () => ["notifications", "unread-count"] as const,

  // Marketing reference data
  referenceData: () => ["reference-data"] as const,
  initiatives: (filters: object = {}) => ["initiatives", filters] as const,
  // Under "initiatives" so anything that refreshes the list refreshes the cards too
  initiativeSummary: (filters: object = {}) => ["initiatives", "summary", filters] as const,
  initiative: (id: string) => ["initiative", id] as const,
  // Under "initiative" so saving an initiative refreshes its activity
  initiativeActivity: (id: string, limit: number) => ["initiative", id, "activity", limit] as const,
  initiativeOwnerOptions: (search: string) => ["initiative-owner-options", search] as const,
  spendLines: (initiativeId: string) => ["spend-lines", initiativeId] as const,
  navanStatus: () => ["navan-status"] as const,
  spendSummary: (initiativeId: string) => ["spend-summary", initiativeId] as const,
  demos: (initiativeId: string) => ["demos", initiativeId] as const,
  demoSummary: (initiativeId: string) => ["demo-summary", initiativeId] as const,
  performance: (initiativeId: string) => ["performance", initiativeId] as const,
  eventOverview: (search: string) => ["event-overview", search] as const,
  eventPerformance: (filters: object = {}) => ["event-performance", filters] as const,
  eventStaff: (initiativeId: string) => ["event-staff", initiativeId] as const,
  outcomes: (initiativeId: string) => ["outcomes", initiativeId] as const,
  evaluation: (initiativeId: string) => ["evaluation", initiativeId] as const,
  decisions: (initiativeId: string) => ["decisions", initiativeId] as const,
  initiativeImports: (initiativeId: string) => ["initiative-imports", initiativeId] as const,

  // Monthly budgets
  budgetMonths: () => ["budget-month"] as const,
  budgetMonth: (month: string) => ["budget-month", month] as const,
  // Under "budget-month" so anything that refreshes the months refreshes the weeks too
  budgetWeek: (start: string) => ["budget-month", "week", start] as const,
  budgets: () => ["budget"] as const,
  budget: (id: string) => ["budget", id] as const,

  // Paid ads (Google Ads + Bing Ads); everything under "ads" so one invalidation refreshes them all
  ads: () => ["ads"] as const,
  adResults: (filters: object = {}) => ["ads", "results", filters] as const,
  adCampaigns: (platform: string = "") => ["ads", "campaigns", platform] as const,
};
