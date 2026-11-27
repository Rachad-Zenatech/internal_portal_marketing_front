import type { GoogleAdsCampaign } from "@/types/googleReporting";
import { campaignLabel, campaignMoney, campaignNumber, campaignPercent } from "./googleAdsCampaignDisplay";

function CampaignRow({ campaign: c, currency }: { campaign: GoogleAdsCampaign; currency: string | null }) {
  return (
    <tr className="border-t align-top">
      <th scope="row" className="min-w-64 p-3 text-left font-normal"><span className="font-medium">{c.campaign_name}</span><span className="mt-1 block text-xs text-muted-foreground">ID: {c.campaign_id}</span></th>
      <td className="p-3 text-left">{campaignLabel(c.status)}</td><td className="p-3 text-left">{campaignLabel(c.channel)}</td>
      <td className="p-3">{campaignMoney(c.spend, currency)}</td><td className="p-3">{campaignNumber(c.clicks)}</td>
      <td className="p-3">{campaignNumber(c.impressions)}</td><td className="p-3">{campaignNumber(c.conversions)}</td>
      <td className="p-3">{campaignPercent(c.ctr)}</td><td className="p-3">{campaignMoney(c.cpc, currency)}</td>
      <td className="p-3">{campaignMoney(c.cost_per_conversion, currency)}</td>
    </tr>
  );
}

export default function GoogleAdsCampaignTable({ campaigns, currency }: { campaigns: GoogleAdsCampaign[]; currency: string | null }) {
  const rows = campaigns.map((campaign) => <CampaignRow key={campaign.campaign_id} campaign={campaign} currency={currency} />);
  if (!campaigns.length) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No campaigns match your search.</p>;
  return (
    <div className="max-h-[36rem] overflow-auto rounded-lg border">
      <table className="w-full whitespace-nowrap text-right text-sm tabular-nums">
        <caption className="sr-only">Google Ads campaign performance for the selected brand and dates.</caption>
        <thead className="sticky top-0 bg-muted text-xs"><tr>
          <th scope="col" className="p-3 text-left">Campaign</th><th scope="col" className="p-3 text-left">Status</th><th scope="col" className="p-3 text-left">Channel</th>
          <th scope="col" className="p-3">Spend ({currency ?? "account currency"})</th><th scope="col" className="p-3">Clicks</th><th scope="col" className="p-3">Impressions</th>
          <th scope="col" className="p-3">Conversions</th><th scope="col" className="p-3">CTR</th><th scope="col" className="p-3">Avg. CPC</th><th scope="col" className="p-3">Cost / conversion</th>
        </tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
