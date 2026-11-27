import { Link, useSearchParams } from "react-router-dom";
import { ChartColumn, Link2, ListChecks } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/AuthContext";
import PaidSearchBoard from "./PaidSearchBoard";
import GoogleMarketingReports from "./reports/GoogleMarketingReports";

function WorkspaceLinks() {
  return (
    <nav aria-label="Related paid search work" className="flex flex-wrap gap-4 text-sm">
      <Link to="/initiatives?channel=PAID_SEARCH" className="inline-flex items-center gap-1.5 text-primary hover:underline"><ListChecks className="h-4 w-4" aria-hidden />Campaign records</Link>
      <Link to="/paid-ads" className="inline-flex items-center gap-1.5 text-primary hover:underline"><ChartColumn className="h-4 w-4" aria-hidden />All advertising performance</Link>
      <Link to="/hubspot-campaigns" className="inline-flex items-center gap-1.5 text-primary hover:underline"><Link2 className="h-4 w-4" aria-hidden />CRM campaigns and outcomes (HubSpot)</Link>
    </nav>
  );
}

export default function PaidSearchPage() {
  const [params, setParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const view = params.get("view") === "planning" ? "planning" : "reports";
  const setView = (value: string) => {
    const next = new URLSearchParams(params);
    next.set("view", value);
    setParams(next);
  };
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <PageHeader title="Paid Search" description="Plan campaign work, measure advertising results, and review website and CRM context." icon={ChartColumn} actions={<Button variant="outline" asChild><Link to="/connections">Data connections</Link></Button>} />
      <WorkspaceLinks />
      <Tabs value={view} onValueChange={setView}>
        <TabsList><TabsTrigger value="reports">Performance and context</TabsTrigger><TabsTrigger value="planning">Planning board</TabsTrigger></TabsList>
        <TabsContent value="reports" className="mt-4"><GoogleMarketingReports /></TabsContent>
        <TabsContent value="planning" forceMount className="mt-4 space-y-3 data-[state=inactive]:hidden"><p className="text-sm text-muted-foreground">Plan work and import spreadsheets here. Board entries save automatically; Google reports are viewed separately and do not overwrite your entries.</p><PaidSearchBoard canEdit={canEdit} /></TabsContent>
      </Tabs>
    </div>
  );
}
