// An initiative's figures from its linked HubSpot campaigns: the list's HubSpot column, the detail snapshot and the
// side panel's figures
import type { InitiativeHubSpotFigures, InitiativeListItem } from "@/types/initiatives";
import FunnelTable from "../HubSpot/FunnelTable";
import { formatMoney } from "./format";

export const ATTRIBUTION_LABELS: Record<InitiativeHubSpotFigures["attribution"], string> = {
  FIRST_TOUCH: "first touch",
  LAST_TOUCH: "last touch",
};

const count = (value: number | null | undefined) => (value === null || value === undefined ? "-" : value.toLocaleString());

/** "$121.01" with " (HubSpot spend)" when the spend came from HubSpot; null without a cost */
function costText(item: InitiativeListItem, value: number | null | undefined, short = false) {
  const hs = item.hubspot;
  if (!hs || value === null || value === undefined) return null;
  const money = formatMoney(value, item.currency);
  if (hs.cost_source !== "HUBSPOT") return money;
  return short ? `${money}*` : `${money} (HubSpot spend)`;
}

/** "$121.01 per new contact (HubSpot spend)" */
export function costPerContactText(item: InitiativeListItem) {
  const cost = costText(item, item.hubspot?.cost_per_new_contact);
  return cost && cost.replace(/( \(HubSpot spend\))?$/, " per new contact$1");
}

/** The list's HubSpot column: new contacts and MQLs, and the cost per MQL (else per new contact) under them */
export function HubSpotCell({ item }: { item: InitiativeListItem }) {
  const hs = item.hubspot;
  if (!hs) return <span className="text-muted-foreground">N/A</span>;
  const perMql = costText(item, hs.cost_per_mql, true);
  const perContact = costText(item, hs.cost_per_new_contact, true);
  return (
    <div className="min-w-0" title={`By ${ATTRIBUTION_LABELS[hs.attribution]}, to date${hs.cost_source === "HUBSPOT" ? ". * From HubSpot's spend; no costs in the portal yet" : ""}`}>
      <div className="whitespace-nowrap tabular-nums text-foreground">
        {count(hs.new_contacts)} new · {count(hs.funnel?.mql)} MQL
      </div>
      <div className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        {perMql ? `${perMql} per MQL` : perContact ? `${perContact} each` : hs.list_contacts ? `${count(hs.list_contacts)} on lists` : `${count(hs.sessions)} sessions`}
      </div>
    </div>
  );
}

/** A few lines for the detail page's HubSpot card */
export function HubSpotSnapshot({ item }: { item: InitiativeListItem }) {
  const hs = item.hubspot;
  if (!hs) return <>Not linked to a HubSpot campaign.</>;
  const cost = costPerContactText(item);
  const perMql = costText(item, hs.cost_per_mql);
  return (
    <>
      <span className="font-medium text-slate-900 dark:text-zinc-100">{count(hs.new_contacts)} new contacts</span> ({ATTRIBUTION_LABELS[hs.attribution]})
      {hs.funnel && <> · {count(hs.funnel.mql)} MQLs · {count(hs.funnel.sql)} SQLs</>}
      {hs.list_contacts !== null && hs.list_contacts !== undefined && <> · {count(hs.list_contacts)} on its lists</>}
      {(perMql || cost) && <span className="mt-1 block">{perMql ? `${perMql} per MQL` : cost}</span>}
    </>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

/** Every figure, for the side panel */
export function HubSpotFigureList({ item }: { item: InitiativeListItem }) {
  const hs = item.hubspot;
  if (!hs) return null;
  const attribution = ATTRIBUTION_LABELS[hs.attribution];
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Figure label={`New contacts, ${attribution}`} value={count(hs.new_contacts)} />
        <Figure label="People on its lists" value={count(hs.list_contacts)} />
        <Figure label="Cost per new contact" value={costText(item, hs.cost_per_new_contact) ?? "-"} />
        <Figure label="Cost per MQL" value={costText(item, hs.cost_per_mql) ?? "-"} />
        <Figure label="Cost per SQL" value={costText(item, hs.cost_per_sql) ?? "-"} />
        <Figure label="Spend in HubSpot" value={hs.spend_in_hubspot === null ? "-" : formatMoney(hs.spend_in_hubspot, item.currency)} />
        <Figure label="Sessions" value={count(hs.sessions)} />
        <Figure label="Influenced contacts" value={count(hs.influenced_contacts)} />
      </dl>
      {(hs.funnel || hs.list_funnel) && (
        <FunnelTable
          columns={[
            { label: `By ${attribution}`, funnel: hs.funnel },
            { label: "On its lists", funnel: hs.list_funnel },
          ]}
        />
      )}
    </div>
  );
}
