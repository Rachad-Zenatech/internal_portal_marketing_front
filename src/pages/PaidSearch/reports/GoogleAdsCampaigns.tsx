import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/components/dashboard/csv";
import { useGoogleAdsCampaigns, type CampaignSort } from "@/hooks/useGoogleAdsCampaigns";
import type { GoogleReportSection } from "@/types/googleReporting";
import GoogleAdsCampaignTable from "./GoogleAdsCampaignTable";
import GoogleAdsCampaignChart from "./GoogleAdsCampaignChart";

export default function GoogleAdsCampaigns({ section }: { section: GoogleReportSection }) {
  const campaigns = section.campaigns ?? [];
  const state = useGoogleAdsCampaigns(campaigns);
  const exportCsv = () => downloadCsv("google-ads-campaigns.csv",
    ["Campaign ID", "Campaign", "Status", "Channel", "Currency", "Spend", "Clicks", "Impressions", "Conversions", "CTR (%)", "Avg CPC", "Cost per conversion"],
    state.filtered.map((c) => [c.campaign_id, c.campaign_name, c.status, c.channel, section.currency, c.spend, c.clicks, c.impressions, c.conversions, c.ctr, c.cpc, c.cost_per_conversion]),
  );
  if (section.status !== "ok" || !campaigns.length) return null;
  return (
    <section aria-label="Google Ads campaign performance" className="min-w-0 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold">Google Ads campaigns</h3><p className="text-xs text-muted-foreground">Metrics cover the selected dates. Campaign names and statuses are current. Campaigns with no reported activity show zero metrics.</p></div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!state.filtered.length}>Export campaigns CSV</Button>
      </div>
      <GoogleAdsCampaignChart campaigns={state.chartRows} currency={section.currency} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid flex-1 gap-1 text-sm">Search campaigns<Input value={state.search} onChange={(event) => state.updateSearch(event.target.value)} placeholder="Name, ID, status or channel" /></label>
        <label className="grid gap-1 text-sm">Sort by<select className="h-9 rounded-md border bg-background px-3" value={state.sort} onChange={(event) => state.updateSort(event.target.value as CampaignSort)}><option value="spend">Spend, highest first</option><option value="clicks">Clicks, highest first</option><option value="conversions">Conversions, highest first</option><option value="name">Campaign name</option></select></label>
      </div>
      <GoogleAdsCampaignTable campaigns={state.rows} currency={section.currency} />
      <div className="flex flex-wrap items-center justify-end gap-3 text-sm"><span>{state.filtered.length} of {campaigns.length} campaigns · Page {state.page + 1} of {state.pages}</span><Button variant="outline" size="sm" disabled={!state.page} onClick={() => state.setPage(state.page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={state.page + 1 >= state.pages} onClick={() => state.setPage(state.page + 1)}>Next</Button></div>
    </section>
  );
}
