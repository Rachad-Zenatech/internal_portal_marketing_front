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
  initiative: (id: string) => ["initiative", id] as const,
  initiativeOwnerOptions: (search: string) => ["initiative-owner-options", search] as const,
  spendLines: (initiativeId: string) => ["spend-lines", initiativeId] as const,
  spendSummary: (initiativeId: string) => ["spend-summary", initiativeId] as const,
};
