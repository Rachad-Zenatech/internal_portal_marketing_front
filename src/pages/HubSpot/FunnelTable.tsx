// A small table of funnel counts: one row per stage, one column per way of counting (first touch, last touch, lists)
import type { HubSpotFunnel } from "@/types/hubspot";

export const FUNNEL_STAGES: { key: keyof HubSpotFunnel; label: string }[] = [
  { key: "lead", label: "Leads" },
  { key: "mql", label: "MQLs" },
  { key: "sql", label: "SQLs" },
  { key: "opportunity", label: "Opportunities" },
  { key: "customer", label: "Customers" },
];

export interface FunnelColumn {
  label: string;
  /** A short note under the label, e.g. "default" */
  note?: string;
  funnel: HubSpotFunnel | null | undefined;
}

export default function FunnelTable({ columns }: { columns: FunnelColumn[] }) {
  const shown = columns.filter((c) => c.funnel);
  if (shown.length === 0) return <p className="text-sm text-muted-foreground">No contacts are attributed to this campaign in HubSpot yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Reached</th>
            {shown.map((c) => (
              <th key={c.label} className="px-3 py-2 text-right font-medium">
                {c.label}
                {c.note && <span className="block font-normal">{c.note}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FUNNEL_STAGES.map((stage) => (
            <tr key={stage.key} className="border-b border-border last:border-b-0">
              <td className="px-3 py-1.5 text-muted-foreground">{stage.label}</td>
              {shown.map((c) => (
                <td key={c.label} className="px-3 py-1.5 text-right tabular-nums text-foreground">
                  {c.funnel![stage.key].toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
