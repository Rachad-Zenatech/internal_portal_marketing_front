import { Link } from "react-router-dom";
import { ArrowRight, Cable, Settings2 } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useHubSpotStatus } from "@/hooks/useHubSpot";
import { useNavanStatus } from "@/hooks/useNavan";
import { useAuth } from "@/lib/AuthContext";

type SourceStatus = { configured: boolean; last_success_at: string | null; last_error: string | null; mode?: string };
type SourceQuery = { data?: SourceStatus; isPending: boolean; isError: boolean };
type ConnectionCardProps = { name: string; description: string; usage: string; path: string; action: string; status: string; lastSync?: string | null };

function syncLabel(query: SourceQuery) {
  if (query.isPending) return "Checking status";
  if (query.isError) return "Status unavailable";
  if (!query.data?.configured) return "Setup required";
  if (query.data.mode === "demo") return "Demo data";
  if (query.data.last_error) return "Check latest sync";
  return query.data.last_success_at ? "Data synced" : "Configured; awaiting first sync";
}

function ConnectionCard({ name, description, usage, path, action, status, lastSync }: ConnectionCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-semibold">{name}</h2><span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{status}</span></div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-sm"><span className="font-medium">Used in: </span>{usage}</p>
      {lastSync && <p className="text-xs text-muted-foreground">Last successful sync: {new Date(lastSync).toLocaleString()}</p>}
      <Button variant="outline" asChild className="mt-auto self-start"><Link to={path}>{action}<ArrowRight className="h-4 w-4" aria-hidden /></Link></Button>
    </article>
  );
}

function SourceCards() {
  const hubspot = useHubSpotStatus();
  const navan = useNavanStatus();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ConnectionCard name="Google" status="Access checked in reports" description="Google Ads supplies paid campaign metrics. GA4 supplies website activity, and Search Console supplies organic search performance." usage="Paid Search reports and website/search context" path="/paid-search?view=reports" action="Open Google reports" />
      <ConnectionCard name="HubSpot" status={syncLabel(hubspot)} lastSync={hubspot.data?.last_success_at} description="CRM campaign activity, contacts, leads and funnel outcomes. These outcomes are distinct from Google key events and ad conversions." usage="CRM campaigns, initiative links and planning boards" path="/hubspot-campaigns" action="Open CRM campaigns" />
      <ConnectionCard name="Navan" status={syncLabel(navan)} lastSync={navan.data?.last_success_at} description="Travel bookings and actual travel costs associated with events." usage="Events and travel costs" path="/events" action="Open events and travel" />
    </div>
  );
}

function AccountSettingsLink() {
  const { canAccessNavigationItem } = useAuth();
  if (!canAccessNavigationItem("CONFIG_ROLES")) return null;
  return <Button variant="outline" asChild><Link to="/configurations/integrations?category=PAID_ADS"><Settings2 className="h-4 w-4" aria-hidden />Manage account authorization</Link></Button>;
}

export default function DataConnectionsPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <PageHeader title="Data connections" icon={Cable} description="See where your data comes from and open the workspace that uses it. Campaign work and reporting stay in their channel pages." actions={<AccountSettingsLink />} />
      <SourceCards />
      <section className="rounded-xl border border-border bg-muted/30 p-5"><h2 className="font-semibold">Follow the campaign, then check the source</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Use Campaigns & initiatives to plan and track work. Use channel pages for performance, HubSpot for CRM outcomes, and Events & travel for event costs. Dashboard is the cross-channel summary. Account authorization controls access; it does not create or merge campaigns.</p></section>
    </div>
  );
}
