// HubSpot Campaigns: every campaign the HubSpot sync read, with its budget and spend, report figures and assets
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Info, Landmark, Megaphone, Receipt, UserPlus, Users } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import KpiCard, { KpiGrid } from "@/components/dashboard/KpiCard";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { useHubSpotCampaigns, useHubSpotStatus } from "@/hooks/useHubSpot";
import type { HubSpotCampaign } from "@/types/hubspot";
import HubSpotCampaignPanel from "./HubSpotCampaignPanel";
import HubSpotCampaignsTable from "./HubSpotCampaignsTable";
import HubSpotSyncStatus from "./HubSpotSyncStatus";
import { brandCode, fmtCount, fmtMoney, NO_BRAND, overBudget, STATUS_LABELS, STATUS_ORDER, statusKey, sumOf, totalsByCurrency } from "./hubspotDisplay";

const ANY = "all";
const NO_OWNER = "none";

/** The biggest currency's total as the value, the others under it */
function MoneyKpi({ label, icon, tone, info, campaigns, field, loading }: {
  label: string;
  icon: React.ElementType;
  tone: "blue" | "violet";
  info: string;
  campaigns: HubSpotCampaign[];
  field: "budget_total" | "spend_total";
  loading: boolean;
}) {
  const totals = totalsByCurrency(campaigns, field);
  const withAmount = campaigns.filter((c) => c[field] !== null).length;
  const [main, ...rest] = totals;
  const over = field === "spend_total" ? campaigns.filter(overBudget).length : 0;
  return (
    <KpiCard
      label={label}
      icon={icon}
      tone={tone}
      info={info}
      loading={loading}
      value={main ? fmtMoney(main.amount, main.currency) : "-"}
      caption={
        withAmount === 0
          ? "None recorded in HubSpot"
          : `${withAmount} of ${campaigns.length} campaigns${rest.length ? `, plus ${rest.map((t) => fmtMoney(t.amount, t.currency)).join(", ")}` : ""}${over ? `; ${over} over budget` : ""}`
      }
    />
  );
}

export default function HubSpotCampaignsPage() {
  const [params, setParams] = useSearchParams();
  const { data: campaigns = [], isLoading, error, refetch } = useHubSpotCampaigns();
  const { data: status } = useHubSpotStatus();
  const openId = params.get("campaign");
  const brand = params.get("brand") ?? ANY;
  const statusFilter = params.get("status") ?? ANY;
  const owner = params.get("owner") ?? ANY;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const brandOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of campaigns) counts.set(brandCode(c.name) ?? NO_BRAND, (counts.get(brandCode(c.name) ?? NO_BRAND) ?? 0) + 1);
    const codes = [...counts.keys()].filter((k) => k !== NO_BRAND).sort();
    return [
      { value: ANY, label: "All brands" },
      ...codes.map((code) => ({ value: code, label: `${code} (${counts.get(code)})` })),
      ...(counts.has(NO_BRAND) ? [{ value: NO_BRAND, label: `No brand code (${counts.get(NO_BRAND)})` }] : []),
    ];
  }, [campaigns]);

  const statusOptions = useMemo(() => {
    const present = new Set(campaigns.map(statusKey));
    return [{ value: ANY, label: "All statuses" }, ...STATUS_ORDER.filter((s) => present.has(s)).map((s) => ({ value: s, label: STATUS_LABELS[s] }))];
  }, [campaigns]);

  const ownerOptions = useMemo(() => {
    const names = [...new Set(campaigns.map((c) => c.owner_name).filter((n): n is string => Boolean(n)))].sort();
    return [
      { value: ANY, label: "All owners" },
      ...names.map((n) => ({ value: n, label: n })),
      ...(campaigns.some((c) => !c.owner_name) ? [{ value: NO_OWNER, label: "No owner" }] : []),
    ];
  }, [campaigns]);

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          (brand === ANY || (brandCode(c.name) ?? NO_BRAND) === brand) &&
          (statusFilter === ANY || statusKey(c) === statusFilter) &&
          (owner === ANY || (owner === NO_OWNER ? !c.owner_name : c.owner_name === owner)),
      ),
    [campaigns, brand, statusFilter, owner],
  );

  const filtersOn = brand !== ANY || statusFilter !== ANY || owner !== ANY;
  const running = filtered.filter((c) => c.status === "active" || c.status === "in_progress").length;
  const open = campaigns.find((c) => c.id === openId) ?? null;
  const neverSynced = !isLoading && campaigns.length === 0 && status && !status.last_success_at;

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <DashboardHeader
        title="HubSpot Campaigns"
        subtitle="Every campaign in HubSpot with its budget, spend, website sessions, new contacts and attached assets."
        actions={<HubSpotSyncStatus />}
      />

      {error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">{error.message || "Could not load the HubSpot campaigns."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : neverSynced ? (
        <div className={`${DASH_CARD} flex flex-col items-center gap-2 px-6 py-14 text-center`}>
          <Megaphone className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">No campaigns yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {status?.configured
              ? "Use Sync with HubSpot to read every campaign. The first sync takes a few minutes."
              : "HubSpot isn't set up. Add a private app token as HUBSPOT_API_KEY in the backend settings."}
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Key figures">
            <KpiGrid>
              <KpiCard
                label="Campaigns"
                icon={Megaphone}
                tone="orange"
                info="Campaigns in HubSpot that match the filters."
                value={fmtCount(filtered.length)}
                caption={`${running} active or in progress`}
                loading={isLoading}
              />
              <MoneyKpi
                label="Budget in HubSpot"
                icon={Landmark}
                tone="blue"
                info="Totals of the campaigns' budget items in HubSpot, by currency. Most campaigns have none recorded there."
                campaigns={filtered}
                field="budget_total"
                loading={isLoading}
              />
              <MoneyKpi
                label="Spend in HubSpot"
                icon={Receipt}
                tone="violet"
                info="Totals of the campaigns' spend items in HubSpot, by currency. HubSpot fills these in for attached Google and Bing ads."
                campaigns={filtered}
                field="spend_total"
                loading={isLoading}
              />
              <KpiCard
                label="New Contacts"
                icon={UserPlus}
                tone="green"
                info="New contacts whose first interaction was one of these campaigns (first touch). Last touch is in each campaign's details."
                value={fmtCount(sumOf(filtered, "new_contacts_first_touch"))}
                caption={`First touch; ${fmtCount(sumOf(filtered, "sessions"))} sessions`}
                loading={isLoading}
              />
              <KpiCard
                label="MQLs"
                icon={Eye}
                tone="sky"
                info="Contacts first brought in by these campaigns who have become marketing qualified leads (or gone further)."
                value={fmtCount(sumOf(filtered, "mql"))}
                caption={`First touch; ${fmtCount(sumOf(filtered, "sql"))} SQLs`}
                loading={isLoading}
              />
              <KpiCard
                label="People on Lists"
                icon={Users}
                tone="pink"
                info="People on the campaigns' contact lists, counted once per campaign. For events these are usually the lead lists; some lists are audiences, like newsletters."
                value={fmtCount(sumOf(filtered, "list_contacts"))}
                caption={`${fmtCount(sumOf(filtered, "influenced_contacts"))} influenced contacts`}
                loading={isLoading}
              />
            </KpiGrid>
          </section>

          <FilterBar onClear={filtersOn ? () => update({ brand: null, status: null, owner: null }) : undefined}>
            <FilterSelect label="Brand" value={brand} onChange={(v) => update({ brand: v === ANY ? null : v })} options={brandOptions} />
            <FilterSelect label="Status" value={statusFilter} onChange={(v) => update({ status: v === ANY ? null : v })} options={statusOptions} />
            <FilterSelect label="Owner" value={owner} onChange={(v) => update({ owner: v === ANY ? null : v })} options={ownerOptions} />
          </FilterBar>

          <HubSpotCampaignsTable campaigns={filtered} loading={isLoading} onOpen={(id) => update({ campaign: id })} />

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Not shown because HubSpot doesn't give them to this connection: social posts (the private app needs the "social" scope), ad results
              (no campaign has ads attached in HubSpot), and revenue attribution (blocked by HubSpot field permissions).
            </span>
          </p>
        </>
      )}

      <HubSpotCampaignPanel campaign={open} onClose={() => update({ campaign: null })} />
    </div>
  );
}
