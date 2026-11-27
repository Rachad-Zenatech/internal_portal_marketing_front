import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLinkedInAds } from "@/hooks/useLinkedInAds";
import { useAuth } from "@/lib/AuthContext";
import { appStorage } from "@/lib/storage";
import { LinkedInConnectionList } from "./LinkedInConnectionList";

export default function LinkedInAdsConnections() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("CONFIG_ROLES_VIEW");
  const canManage = hasPermission("CONFIG_ROLES_UPDATE");
  const state = useLinkedInAds(canView);
  const signIn = () => state.authorize.mutate(`${window.location.origin}/oauth/callback`, {
    onSuccess: (response) => {
      appStorage.setItem("marketing.linkedinAds.state", response.state);
      window.location.assign(response.authorization_url);
    },
    onError: (error) => toast.error(error.message),
  });
  const disconnect = (id: string) => state.disconnect.mutate(id, {
    onSuccess: () => toast.success("LinkedIn Ads disconnected"), onError: (error) => toast.error(error.message),
  });
  const error = state.organizations.error ?? state.companies.error ?? state.connections.error;
  const orgOptions = state.organizations.data?.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>);
  const companyOptions = state.companies.data?.filter((company) => company.is_active).map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>);
  if (!canView) return <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">An integrations administrator can connect LinkedIn Ads here.</p>;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />LinkedIn Ads</CardTitle>
        <CardDescription>Authorize read access to your LinkedIn advertising accounts. Your client secret stays on the backend.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">Organization
            <Select value={state.organizationId} onValueChange={state.selectOrganization} disabled={state.organizations.isPending || state.authorize.isPending}><SelectTrigger className="w-64"><SelectValue placeholder="Choose an organization" /></SelectTrigger><SelectContent>{orgOptions}</SelectContent></Select>
          </label>
          <label className="grid gap-1 text-sm">Company
            <Select value={state.companyId || "organization"} onValueChange={(value) => state.setCompanyId(value === "organization" ? "" : value)} disabled={!state.organizationId || state.companies.isPending || state.authorize.isPending}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="organization">Entire organization</SelectItem>{companyOptions}</SelectContent></Select>
          </label>
          {canManage && <Button onClick={signIn} disabled={!state.organizationId || state.authorize.isPending || state.companies.isError}>{state.authorize.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Connect LinkedIn Ads</Button>}
          <Button variant="outline" onClick={() => state.connections.refetch()} disabled={!state.organizationId || state.connections.isFetching}>Refresh connections</Button>
        </div>
        {!state.organizations.isPending && !state.organizations.isError && !state.organizationId && <p className="text-sm text-muted-foreground">Create an organization in Entities before connecting an advertising account.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
        {state.connections.isFetching && <p role="status" className="text-sm text-muted-foreground">Loading LinkedIn connections...</p>}
        <LinkedInConnectionList connections={state.connections.data ?? []} canManage={canManage} busy={state.disconnect.isPending} onDisconnect={disconnect} />
        <p className="text-xs text-muted-foreground">Connect with a LinkedIn user who can access your Campaign Manager accounts. LinkedIn may ask you to sign in again when access expires.</p>
        <a href="https://www.linkedin.com/campaignmanager/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Open Campaign Manager<ExternalLink className="h-3.5 w-3.5" /></a>
      </CardContent>
    </Card>
  );
}
