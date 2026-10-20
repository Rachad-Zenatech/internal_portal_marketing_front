import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Landmark, MoreHorizontal, MousePointerClick, PiggyBank, Plus, Receipt, Upload, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import KpiCard from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdsOverview } from "@/hooks/useAds";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import { downloadAdsTemplate } from "@/services/adsService";
import { queryKeys } from "@/services/queryKeys";
import type { AdPlatform, AdResult, AdsHealthFilters, AdsOverviewFilters, CampaignObjective, CampaignStatus } from "@/types/ads";
import InitiativeFormDialog from "../Initiatives/InitiativeFormDialog";
import AdResultDialog from "./AdResultDialog";
import { fmtCount, fmtUnitCost, fmtWholeMoney, PLATFORM_LABELS, PLATFORMS } from "./adsDisplay";
import { PlatformBudgetChart, PlatformBudgetLegend, SpendLeadsChart, SpendLeadsLegend } from "./AdsCharts";
import { DateRangePicker } from "./AdsPieces";
import { AttentionPanel, BrandUtilizationPanel, PlatformPerformancePanel } from "./AdsSidePanels";
import { BudgetTab, DataHealthTab, PlatformsTab } from "./AdsTabs";
import CampaignPanel from "./CampaignPanel";
import CampaignsTable from "./CampaignsTable";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUSES, DEFAULT_RANGE, formatRange, OBJECTIVE_LABELS, OBJECTIVES, resolveRange, type RangeKey } from "./overviewDisplay";
import AdDataStatus from "./AdSyncStatus";
import PaidAdsUpload from "./PaidAdsUpload";

const ANY = "ANY";

const TABS = [
  { value: "campaigns", label: "Campaigns" },
  { value: "platforms", label: "Platforms" },
  { value: "budget", label: "Budget & Spend" },
  { value: "health", label: "Data Health" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const FILTER_KEYS = ["brand", "market", "platform", "objective", "status", "currency"];

export default function PaidAdsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const canCreate = hasPermission("INITIATIVES_CREATE");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: reference } = useReferenceData();

  // Everything picked is kept in the URL, so a view can be shared or bookmarked
  const range = resolveRange(searchParams.get("range"), searchParams.get("from"), searchParams.get("to"));
  const tabParam = searchParams.get("tab");
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : "campaigns";
  const brand = searchParams.get("brand") ?? "";
  const market = searchParams.get("market") ?? "";
  const platformParam = searchParams.get("platform");
  const platform = PLATFORMS.includes(platformParam as AdPlatform) ? (platformParam as AdPlatform) : null;
  const objectiveParam = searchParams.get("objective");
  const objective = OBJECTIVES.includes(objectiveParam ?? "") ? (objectiveParam as CampaignObjective) : null;
  const statusParam = searchParams.get("status");
  const status = CAMPAIGN_STATUSES.includes(statusParam as CampaignStatus) ? (statusParam as CampaignStatus) : null;
  const currencyParam = searchParams.get("currency") ?? "";
  const openCampaign = searchParams.get("campaign");

  const update = (changes: Record<string, string | null>, push = false) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setSearchParams(next, { replace: !push });
  };
  const clearFilters = () => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));
  const setPreset = (key: RangeKey) => update({ range: key === DEFAULT_RANGE ? null : key, from: null, to: null });
  const setCustom = (from: string, to: string) => update({ range: "custom", from, to });

  // Opening a campaign adds a history step, so the browser's back button closes it
  const openPanel = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("campaign", id);
    setSearchParams(next, { state: { campaignOpened: true }, replace: Boolean(openCampaign) });
  };
  const closePanel = () => {
    if ((location.state as { campaignOpened?: boolean } | null)?.campaignOpened) {
      navigate(-1);
      return;
    }
    update({ campaign: null });
  };

  const healthFilters = useMemo<AdsHealthFilters>(() => {
    const f: AdsHealthFilters = {};
    if (brand) f.brand_id = Number(brand);
    if (market) f.market_id = Number(market);
    if (platform) f.platform = platform;
    if (objective) f.objective = objective;
    if (status) f.status = status;
    return f;
  }, [brand, market, platform, objective, status]);
  const filters = useMemo<AdsOverviewFilters>(
    () => ({ from: range.from, to: range.to, ...healthFilters, ...(currencyParam ? { currency: currencyParam } : {}) }),
    [range.from, range.to, healthFilters, currencyParam],
  );
  const overview = useAdsOverview(filters);
  const data = overview.data;
  const loading = overview.isLoading;
  const currency = data?.currency ?? "USD";
  const k = data?.kpis;
  const p = data?.previous;
  const money = (n: number | null | undefined) => fmtWholeMoney(n, currency);

  const [resultDialog, setResultDialog] = useState<{ open: boolean; result?: AdResult; campaignId?: string }>({ open: false });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const template = async () => {
    try {
      await downloadAdsTemplate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the template.");
    }
  };

  const filtered = Boolean(brand || market || platform || objective || status || currencyParam);
  const changeLabel = "vs. previous period";
  const compare = Boolean(data) && !overview.isPlaceholderData;

  const brandOptions = [{ value: ANY, label: "All brands" }, ...(reference?.brands ?? []).map((b) => ({ value: String(b.id), label: b.name }))];
  const marketOptions = [{ value: ANY, label: "All regions" }, ...(reference?.markets ?? []).map((m) => ({ value: String(m.id), label: m.name }))];
  const platformOptions = [{ value: ANY, label: "All platforms" }, ...PLATFORMS.map((x) => ({ value: x, label: PLATFORM_LABELS[x] }))];
  const objectiveOptions = [{ value: ANY, label: "All objectives" }, ...OBJECTIVES.map((o) => ({ value: o, label: OBJECTIVE_LABELS[o] }))];
  const statusOptions = [{ value: ANY, label: "All statuses" }, ...CAMPAIGN_STATUSES.map((s) => ({ value: s, label: CAMPAIGN_STATUS_LABELS[s] }))];
  const currencies = data?.currencies ?? [];

  const pageMenu = (canEdit || canCreate) && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-card" aria-label="More actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canCreate && (
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus />
            New campaign
          </DropdownMenuItem>
        )}
        {canEdit && (
          <>
            <DropdownMenuItem onClick={() => setResultDialog({ open: true })}>
              <Plus />
              Add ad result
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setUploadOpen(true)}>
              <Upload />
              Import spreadsheet (Google Ads, Microsoft Ads)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={template}>
              <Download />
              Download spreadsheet template
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const fading = overview.isPlaceholderData ? "opacity-60" : "";

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <DashboardHeader
        title="Paid Advertising"
        subtitle="Monitor campaign performance, spending, and results across all advertising platforms."
        actions={
          <>
            <AdDataStatus />
            <div className="flex min-w-0 items-center gap-2 [&>*:first-child]:max-sm:flex-1">
              <DateRangePicker rangeKey={range.key} from={range.from} to={range.to} onPreset={setPreset} onCustom={setCustom} />
              {pageMenu}
            </div>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => update({ tab: v === "campaigns" ? null : v })} className="min-w-0 gap-0">
        <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
          <TabsList className="h-9">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="px-3">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <FilterBar onClear={filtered ? clearFilters : undefined}>
        <FilterSelect label="Brand" value={brand || ANY} onChange={(v) => update({ brand: v === ANY ? null : v })} options={brandOptions} />
        <FilterSelect label="Region" value={market || ANY} onChange={(v) => update({ market: v === ANY ? null : v })} options={marketOptions} />
        <FilterSelect label="Platform" value={platform ?? ANY} onChange={(v) => update({ platform: v === ANY ? null : v })} options={platformOptions} />
        <FilterSelect label="Objective" value={objective ?? ANY} onChange={(v) => update({ objective: v === ANY ? null : v })} options={objectiveOptions} />
        <FilterSelect label="Status" value={status ?? ANY} onChange={(v) => update({ status: v === ANY ? null : v })} options={statusOptions} />
        {currencies.length > 1 && (
          <FilterSelect label="Currency" value={currency} onChange={(v) => update({ currency: v === currencies[0] ? null : v })} options={currencies.map((c) => ({ value: c, label: c }))} />
        )}
      </FilterBar>

      {overview.error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">{overview.error.message || "Could not load paid advertising."}</p>
          <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <section aria-label={`Key figures, ${formatRange(range.from, range.to)}`} className={`transition-opacity ${fading}`}>
            {/* Six across only on very wide screens, so the labels fit beside the right column */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 min-[1800px]:grid-cols-6">
              <KpiCard
                label="Allocated Ad Budget"
                icon={Landmark}
                tone="blue"
                info="The campaigns' approved budgets, spread evenly over their dates: the part that falls in this date range."
                value={money(k?.allocated_budget)}
                caption="Approved advertising allocation"
                loading={loading}
                change={compare ? { current: k?.allocated_budget, previous: p?.allocated_budget } : undefined}
                changeLabel={changeLabel}
              />
              <KpiCard
                label="Actual Ad Spend"
                icon={Receipt}
                tone="violet"
                info="What the campaigns spent in this date range, from the ad platforms' results."
                value={money(k?.actual_spend)}
                caption="Imported from ad platforms"
                loading={loading}
                goodWhen="down"
                change={compare ? { current: k?.actual_spend, previous: p?.actual_spend } : undefined}
                changeLabel={changeLabel}
              />
              <KpiCard
                label="Budget Remaining"
                icon={PiggyBank}
                tone="green"
                info="Allocated budget minus actual spend in this date range. Red means more was spent than allocated."
                value={money(k?.budget_remaining)}
                valueClassName={k?.budget_remaining != null && k.budget_remaining < 0 ? "text-red-600 dark:text-red-400" : undefined}
                caption={k?.remaining_percent != null ? `${Math.round(k.remaining_percent)}% remaining` : undefined}
                loading={loading}
                change={compare ? { current: k?.budget_remaining, previous: p?.budget_remaining } : undefined}
                changeLabel={changeLabel}
              />
              <KpiCard
                label="Verified Leads"
                icon={UserCheck}
                tone="orange"
                info="New HubSpot contacts from the campaigns. Counted apart from the platforms' own conversions."
                value={fmtCount(k?.verified_leads ?? null)}
                caption="From HubSpot"
                loading={loading}
                change={compare ? { current: k?.verified_leads, previous: p?.verified_leads } : undefined}
                changeLabel={changeLabel}
              />
              <KpiCard
                label="Cost per Lead"
                icon={Users}
                tone="sky"
                info="Ad spend divided by verified leads."
                value={fmtUnitCost(k?.cost_per_lead ?? null, currency)}
                caption="Ad spend / verified leads"
                loading={loading}
                goodWhen="down"
                change={compare ? { current: k?.cost_per_lead, previous: p?.cost_per_lead } : undefined}
                changeLabel={changeLabel}
              />
              <KpiCard
                label="Tracked Conversions"
                icon={MousePointerClick}
                tone="pink"
                info="Actions the ad platforms report, such as form fills or sign ups. Never added to verified leads."
                value={fmtCount(k?.conversions ?? null)}
                caption="Platform-reported actions"
                loading={loading}
                change={compare ? { current: k?.conversions, previous: p?.conversions } : undefined}
                changeLabel={changeLabel}
              />
            </div>
          </section>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className={`flex min-w-0 flex-col gap-4 transition-opacity sm:gap-5 ${fading}`}>
              {tab === "campaigns" && (
                <>
                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
                    <ChartCard title="Ad Spend vs. Allocated Budget by Platform" subtitle={`${formatRange(range.from, range.to)}, ${currency}`} action={<PlatformBudgetLegend />}>
                      {loading ? (
                        <Skeleton className="h-[260px] w-full rounded-lg" />
                      ) : (data?.by_platform.length ?? 0) === 0 ? (
                        <ChartEmpty text="No budget or spend in this date range." />
                      ) : (
                        <PlatformBudgetChart rows={data!.by_platform} currency={currency} />
                      )}
                    </ChartCard>
                    <ChartCard
                      title="Spend and Verified Leads Over Time"
                      subtitle={`${data?.bucket === "day" ? "Daily" : data?.bucket === "month" ? "Monthly" : "Weekly"}, ${currency}`}
                      action={<SpendLeadsLegend />}
                    >
                      {loading ? (
                        <Skeleton className="h-[260px] w-full rounded-lg" />
                      ) : !data || data.timeseries.every((x) => x.spend === 0 && x.verified_leads === 0) ? (
                        <ChartEmpty text="No spend or leads in this date range." />
                      ) : (
                        <SpendLeadsChart points={data.timeseries} bucket={data.bucket} currency={currency} />
                      )}
                    </ChartCard>
                  </div>
                  <CampaignsTable
                    campaigns={data?.campaigns ?? []}
                    loading={loading}
                    exportName={`${range.from}-to-${range.to}`}
                    onOpen={openPanel}
                    onNew={canCreate ? () => setCreateOpen(true) : undefined}
                  />
                </>
              )}
              {tab === "platforms" && <PlatformsTab data={data} loading={loading} />}
              {tab === "budget" && <BudgetTab data={data} loading={loading} onOpen={openPanel} />}
              {tab === "health" && <DataHealthTab filters={healthFilters} onOpen={openPanel} />}
            </div>

            <aside className="flex min-w-0 flex-col gap-4 sm:gap-5" aria-label="Highlights">
              <AttentionPanel items={data?.attention ?? []} campaigns={data?.campaigns ?? []} currency={currency} loading={loading} onOpen={openPanel} />
              <PlatformPerformancePanel rows={data?.by_platform ?? []} currency={currency} loading={loading} />
              <BrandUtilizationPanel rows={data?.by_brand ?? []} currency={currency} loading={loading} />
            </aside>
          </div>
        </>
      )}

      <CampaignPanel
        initiativeId={openCampaign}
        range={{ from: range.from, to: range.to }}
        onClose={closePanel}
        onEditResult={canEdit ? (r) => setResultDialog({ open: true, result: r }) : undefined}
        onAddResult={canEdit ? (id) => setResultDialog({ open: true, campaignId: id }) : undefined}
      />

      {canEdit && (
        <>
          <AdResultDialog
            open={resultDialog.open}
            onOpenChange={(open) => setResultDialog((prev) => ({ ...prev, open }))}
            result={resultDialog.result}
            defaultCampaignId={resultDialog.campaignId}
          />
          <PaidAdsUpload open={uploadOpen} onOpenChange={setUploadOpen} onDownloadTemplate={template} />
        </>
      )}
      {canCreate && (
        <InitiativeFormDialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            // A new campaign shows on this page
            if (!open) queryClient.invalidateQueries({ queryKey: queryKeys.ads() });
          }}
          defaultChannelCode="PAID_SEARCH"
        />
      )}
    </div>
  );
}
