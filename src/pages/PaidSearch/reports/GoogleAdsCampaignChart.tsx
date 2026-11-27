import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/dashboard/ChartCard";
import type { GoogleAdsCampaign } from "@/types/googleReporting";
import { campaignMoney } from "./googleAdsCampaignDisplay";

export default function GoogleAdsCampaignChart({ campaigns, currency }: { campaigns: GoogleAdsCampaign[]; currency: string | null }) {
  const height = Math.max(160, campaigns.length * 38);
  const subtitle = `Top ${campaigns.length} matching campaigns by spend${currency ? `, ${currency}` : ""}`;
  const shorten = (name: string) => name.length > 28 ? `${name.slice(0, 27)}…` : name;
  if (!campaigns.length) return <p className="text-sm text-muted-foreground">No campaign spend reported for these dates. Campaign names and zero-activity rows are still listed below.</p>;
  return (
    <ChartCard title="Spend by campaign" subtitle={subtitle}>
      <div style={{ height }} role="img" aria-label={subtitle}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={campaigns} layout="vertical" margin={{ left: 0, right: 20 }} accessibilityLayer>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="campaign_name" width={190} tickFormatter={shorten} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => campaignMoney(Number(value), currency)} contentStyle={{ backgroundColor: "var(--popover)", color: "var(--popover-foreground)", borderColor: "var(--border)" }} />
            <Bar dataKey="spend" name="Spend" fill="var(--chart-spend)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
