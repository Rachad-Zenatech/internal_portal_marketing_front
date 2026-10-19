import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./lib/AuthContext";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "./components/ui/button";

import ProtectedRoute from "./components/ProtectedRoute";

const AppShell = lazy(() => import("./components/AppShell/AppShell"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Initiatives = lazy(() => import("./pages/Initiatives/Initiatives"));
const InitiativeDetail = lazy(() => import("./pages/Initiatives/InitiativeDetail"));
const InitiativeCosts = lazy(() => import("./pages/Initiatives/InitiativeCosts"));
const InitiativePerformance = lazy(() => import("./pages/Initiatives/InitiativePerformance"));
const InitiativeDemos = lazy(() => import("./pages/Initiatives/InitiativeDemos"));
const EventsPage = lazy(() => import("./pages/Events/EventsPage"));
const EventWorkspace = lazy(() => import("./pages/Events/EventWorkspace"));
const BudgetsPage = lazy(() => import("./pages/Budgets/BudgetsPage"));
const PaidAdsPage = lazy(() => import("./pages/PaidAds/PaidAdsPage"));
const Users = lazy(() => import("./pages/Configurations/Users"));
const Roles = lazy(() => import("./pages/Configurations/Roles"));
const UserRoleAssignment = lazy(() => import("./pages/Configurations/UserRoleAssignment"));
const RoleGroupPermissions = lazy(() => import("./pages/Configurations/RoleGroupPermissions"));
const RoleApiPermissions = lazy(() => import("./pages/Configurations/RoleApiPermissions"));
const RoleMcpToolPermissions = lazy(() => import("./pages/Configurations/RoleMcpToolPermissions"));
const OAuthIntegrations = lazy(() => import("./pages/Configurations/OAuthIntegrations"));

const AuditLog = lazy(() => import("./pages/Log/AuditLog"));
const SystemLogsPage = lazy(() => import("./pages/Logs/SystemLogsPage"));
const Login = lazy(() => import("./pages/Login"));
const PendingAccess = lazy(() => import("./pages/PendingAccess"));

function NotFoundAlert() {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-card rounded-xl border border-border shadow-xs my-6 max-w-lg mx-auto">
      <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-1.5">Page Not Found or Access Restricted</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        The page you requested does not exist or you do not have permission to view it.
      </p>
      <Button onClick={() => (window.location.href = "/")} variant="outline" className="gap-2 text-xs">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to home</span>
      </Button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/pending-access" element={<PendingAccess />} />

            {/* Main app layout routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Outlet />
                  </AppShell>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/initiatives" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute navigationCode="DASHBOARD">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Marketing */}
              <Route
                path="/initiatives"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <Initiatives />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/initiatives/:id"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <InitiativeDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/initiatives/:id/costs"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <InitiativeCosts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/initiatives/:id/performance"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <InitiativePerformance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/initiatives/:id/demos"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <InitiativeDemos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:id"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <EventWorkspace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/budgets"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <BudgetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/paid-ads"
                element={
                  <ProtectedRoute navigationCode="INITIATIVES">
                    <PaidAdsPage />
                  </ProtectedRoute>
                }
              />

              {/* Configuration Routes */}
              <Route path="/configuration" element={<Navigate to="/configurations/users" replace />} />
              <Route path="/configurations" element={<Navigate to="/configurations/users" replace />} />

              {/* Users */}
              <Route
                path="/configuration/users"
                element={
                  <ProtectedRoute navigationCode="CONFIG_USERS">
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/users"
                element={
                  <ProtectedRoute navigationCode="CONFIG_USERS">
                    <Users />
                  </ProtectedRoute>
                }
              />

              {/* Roles */}
              <Route
                path="/configuration/roles"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLES">
                    <Roles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/roles"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLES">
                    <Roles />
                  </ProtectedRoute>
                }
              />

              {/* Role Assignments */}
              <Route
                path="/configuration/user-role-assignment"
                element={
                  <ProtectedRoute navigationCode="CONFIG_USER_ROLE_ASSIGNMENT">
                    <UserRoleAssignment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/user-role-assignment"
                element={
                  <ProtectedRoute navigationCode="CONFIG_USER_ROLE_ASSIGNMENT">
                    <UserRoleAssignment />
                  </ProtectedRoute>
                }
              />

              {/* Role Group Permissions */}
              <Route
                path="/configuration/role-group-permissions"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLES">
                    <RoleGroupPermissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/role-group-permissions"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLES">
                    <RoleGroupPermissions />
                  </ProtectedRoute>
                }
              />

              {/* Role API Permissions */}
              <Route
                path="/configuration/role-api-permissions"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLE_API_PERMISSIONS">
                    <RoleApiPermissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/role-api-permissions"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLE_API_PERMISSIONS">
                    <RoleApiPermissions />
                  </ProtectedRoute>
                }
              />

              {/* Role MCP Tool Permissions */}
              <Route
                path="/configuration/role-mcp-tool-permissions"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLE_MCP_TOOL_PERMISSIONS">
                    <RoleMcpToolPermissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/role-mcp-tool-permissions"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLE_MCP_TOOL_PERMISSIONS">
                    <RoleMcpToolPermissions />
                  </ProtectedRoute>
                }
              />

              {/* OAuth & Integrations */}
              <Route
                path="/configuration/integrations"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLES">
                    <OAuthIntegrations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/integrations"
                element={
                  <ProtectedRoute navigationCode="CONFIG_ROLES">
                    <OAuthIntegrations />
                  </ProtectedRoute>
                }
              />

              {/* Logs & Audit */}
              <Route path="/log" element={<Navigate to="/log/audit" replace />} />
              <Route
                path="/log/audit"
                element={
                  <ProtectedRoute navigationCode="AUDIT_LOG">
                    <AuditLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/log/audit-log"
                element={
                  <ProtectedRoute navigationCode="AUDIT_LOG">
                    <AuditLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/log/system-logs"
                element={
                  <ProtectedRoute navigationCode="AUDIT_LOG">
                    <SystemLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-All / 404 Route */}
              <Route path="*" element={<NotFoundAlert />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
