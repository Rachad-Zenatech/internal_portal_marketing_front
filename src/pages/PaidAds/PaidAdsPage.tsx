import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, FileSpreadsheet, Landmark, MousePointerClick, PiggyBank, Plus, Receipt, Trophy, Upload, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import BudgetSpendChart, { BudgetSpendLegend, type BudgetSpendPoint } from "@/components/dashboard/BudgetSpendChart";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DonutChart from "@/components/dashboard/DonutChart";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import InsightCard from "@/components/dashboard/InsightCard";
import KpiCard, { KpiGrid } from "@/components/dashboard/KpiCard";
import PeriodSelect from "@/components/dashboard/PeriodSelect";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdCampaigns, useAdResults } from "@/hooks/useAds";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import { downloadAdsTemplate } from "@/services/adsService";
import type { AdPlatform, AdResult, AdResultFilters, AdResultsResponse, AdResultStatus, AdTotals } from "@/types/ads";
import AdResultDialog from "./AdResultDialog";
import { CampaignTable, groupByCampaign, METRIC_INFO, splitByTiming, sumRows } from "./AdResultsTable";
import { AD_STATUS_LABELS, AD_STATUSES, fmtCount, fmtMoney, fmtUnitCost, PLATFORM_LABELS, PLATFORMS } from "./adsDisplay";
import {
  chartRange,
  DEFAULT_PERIOD,
  monthKeyOf,
  monthLong,
  monthsBetween,
  monthShort,
  parsePeriod,
  PERIOD_OPTIONS,
  periodRanges,
  todayIso,
  type CampaignTiming,
  type PeriodKey,
} from "./adsPeriods";
import PaidAdsUpload from "./PaidAdsUpload";

const ANY = "ANY";

const TABS: { value: CampaignTiming; label: string; empty: string }[] = [
  { value: "running", label: "Running now", empty: "No campaigns are running today." },
  { value: "upcoming", label: "Upcoming", empty: "No campaigns are scheduled to start later." },
  { value: "finished", label: "Finished", empty: "No finished campaigns yet." },
];

const PLATFORM_COLOR: Record<AdPlatform, string> = { GOOGLE_ADS: "var(--platform-google)", BING_ADS: "var(--platform-bing)" };

/** The totals row for the platform picked (or all platforms) in one currency */
function pickTotals(data: AdResultsResponse | undefined, platform: AdPlatform | null, currency: string): AdTotals | undefined {
  const totals = data?.totals ?? [];
  return totals.find((t) => t.platform === (platform ?? "ALL") && t.currency === currency) ?? totals.find((t) => t.platform === "ALL" && t.currency === currency);
}

const remainingOf = (t: AdTotals | undefined) => (!t || (t.budget_amount === null && t.spend === null) ? null : (t.budget_amount ?? 0) - (t.spend ?? 0));

export default function PaidAdsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reference } = useReferenceData();

  // Everything picked is kept in the URL, so a view can be shared or bookmarked
  const period = parsePeriod(searchParams.get("period"));
  const platformParam = searchParams.get("platform");
  const platform: AdPlatform | null = PLATFORMS.includes(platformParam as AdPlatform) ? (platformParam as AdPlatform) : null;
  const brand = searchParams.get("brand") ?? "";
  const market = searchParams.get("market") ?? "";
  const statusParam = searchParams.get("status");
  const status: AdResultStatus | null = AD_STATUSES.includes(statusParam as AdResultStatus) ? (statusParam as AdResultStatus) : null;
  const campaignId = searchParams.get("campaign") ?? "";
  const currencyParam = searchParams.get("currency") ?? "";
  const tabParam = searchParams.get("tab");
  const tab: CampaignTiming = TABS.some((t) => t.value === tabParam) ? (tabParam as CampaignTiming) : "running";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ["brand", "market", "platform", "status", "campaign", "currency"].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };

  // Brand, market, platform, status (and a campaign picked from elsewhere) apply everywhere; the period only to the figures and charts
  const baseFilters = useMemo<AdResultFilters>(() => {
    const f: AdResultFilters = {};
    if (platform) f.platform = platform;
    if (brand) f.brand_id = Number(brand);
    if (market) f.market_id = Number(market);
    if (status) f.status = status;
    if (campaignId) f.initiative_id = campaignId;
    return f;
  }, [platform, brand, market, status, campaignId]);
  const ranges = useMemo(() => periodRanges(period), [period]);
  const chartDates = ranges.current ? chartRange(ranges.current) : null;

  const allTime = useAdResults(baseFilters);
  const current = useAdResults({ ...baseFilters, ...(ranges.current ?? {}) }, Boolean(ranges.current));
  const previous = useAdResults({ ...baseFilters, ...(ranges.previous ?? {}) }, Boolean(ranges.previous));
  const chart = useAdResults({ ...baseFilters, ...(chartDates ?? {}) }, Boolean(chartDates));
  const campaigns = useAdCampaigns(undefined, Boolean(campaignId));

  const periodData = ranges.current ? current.data : allTime.data;
  const chartData = chartDates ? chart.data : allTime.data;
  const periodLoading = ranges.current ? current.isLoading : allTime.isLoading;

  // Money is never added across currencies: the figures show one currency at a time
  const currencies = useMemo(() => {
    const spend = new Map<string, number>();
    for (const r of allTime.data?.results ?? []) spend.set(r.currency, (spend.get(r.currency) ?? 0) + (r.spend ?? 0));
    return [...spend.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [allTime.data]);
  const currency = currencies.includes(currencyParam) ? currencyParam : (currencies[0] ?? "USD");

  const [dialog, setDialog] = useState<{ open: boolean; result?: AdResult; campaignId?: string }>({ open: false });
  const [uploadOpen, setUploadOpen] = useState(false);

  const template = async () => {
    try {
      await downloadAdsTemplate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the template.");
    }
  };

  // ─── Figures for the period ───
  const totals = pickTotals(periodData, platform, currency);
  const prevTotals = ranges.previous ? pickTotals(previous.data, platform, currency) : undefined;
  const compare = Boolean(ranges.previous) && !previous.isLoading;
  const remaining = remainingOf(totals);

  const periodRows = useMemo(() => (periodData?.results ?? []).filter((r) => r.currency === currency), [periodData, currency]);

  // ─── Budget vs spend by month ───
  const monthly = useMemo<BudgetSpendPoint[]>(() => {
    const rows = (chartData?.results ?? []).filter((r) => r.currency === currency);
    let keys: string[];
    if (chartDates) keys = monthsBetween(monthKeyOf(chartDates.from), monthKeyOf(chartDates.to));
    else {
      const starts = rows.map((r) => monthKeyOf(r.period_start)).sort();
      keys = starts.length ? monthsBetween(starts[0], starts[starts.length - 1]).slice(-24) : [];
    }
    const byMonth = new Map(keys.map((k) => [k, { budget: 0, spend: 0 }]));
    for (const r of rows) {
      const m = byMonth.get(monthKeyOf(r.period_start));
      if (!m) continue;
      m.budget += r.budget_amount ?? 0;
      m.spend += r.spend ?? 0;
    }
    const years = new Set(keys.map((k) => k.slice(0, 4)));
    return keys.map((k) => ({ key: k, label: monthShort(k, years.size > 1), fullLabel: monthLong(k), ...byMonth.get(k)! }));
  }, [chartData, chartDates, currency]);
  const monthlyEmpty = monthly.every((m) => m.budget === 0 && m.spend === 0);

  // ─── Spend by platform ───
  const byPlatform = useMemo(
    () =>
      PLATFORMS.map((p) => ({ platform: p, totals: sumRows(periodRows.filter((r) => r.platform === p)) })).filter((p) => p.totals.spend !== null || p.totals.hubspot_contacts !== null),
    [periodRows],
  );
  const donutItems = byPlatform
    .filter((p) => (p.totals.spend ?? 0) > 0)
    .map((p) => ({ key: p.platform, label: PLATFORM_LABELS[p.platform], value: p.totals.spend ?? 0, color: PLATFORM_COLOR[p.platform] }));

  // ─── Insights ───
  const bestPlatform = byPlatform.filter((p) => (p.totals.hubspot_contacts ?? 0) > 0 && p.totals.cpl !== null).sort((a, b) => (a.totals.cpl ?? 0) - (b.totals.cpl ?? 0))[0];
  const periodGroups = useMemo(() => groupByCampaign(periodRows), [periodRows]);
  const priciest = periodGroups.filter((g) => g.totals.cpl !== null).sort((a, b) => (b.totals.cpl ?? 0) - (a.totals.cpl ?? 0))[0];
  const mostLeads = periodGroups.filter((g) => (g.totals.hubspot_contacts ?? 0) > 0).sort((a, b) => (b.totals.hubspot_contacts ?? 0) - (a.totals.hubspot_contacts ?? 0))[0];

  // ─── Campaigns: all time, split by today ───
  const today = todayIso();
  const allGroups = useMemo(() => groupByCampaign(allTime.data?.results ?? []), [allTime.data]);
  const timing = useMemo(() => splitByTiming(allGroups, today), [allGroups, today]);

  const campaignName = campaignId ? (campaigns.data?.find((c) => c.initiative_id === campaignId)?.name ?? allTime.data?.results[0]?.campaign_name) : null;
  const filtered = Boolean(platform || brand || market || status || campaignId || currencyParam);
  const nothingAtAll = !allTime.isLoading && !allTime.error && (allTime.data?.results.length ?? 0) === 0;
  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";
  const money = (n: number | null | undefined) => fmtMoney(n ?? null, currency);
  const unit = (n: number | null | undefined) => fmtUnitCost(n ?? null, currency);

  const onEdit = canEdit ? (r: AdResult) => setDialog({ open: true, result: r }) : undefined;
  const onAdd = canEdit ? (id: string) => setDialog({ open: true, campaignId: id }) : undefined;

  const importButton = (
    <Button onClick={() => setUploadOpen(true)} className="h-9 gap-2">
      <Upload className="h-4 w-4" />
      Import campaign data
    </Button>
  );
  const addButton = (
    <Button variant="outline" onClick={() => setDialog({ open: true, campaignId: campaignId || undefined })} className="h-9 gap-2 bg-card">
      <Plus className="h-4 w-4" />
      Add result
    </Button>
  );

  const brandOptions = [{ value: ANY, label: "All brands" }, ...(reference?.brands ?? []).map((b) => ({ value: String(b.id), label: b.name }))];
  const marketOptions = [{ value: ANY, label: "All markets" }, ...(reference?.markets ?? []).map((m) => ({ value: String(m.id), label: m.name }))];
  const platformOptions = [{ value: ANY, label: "All" }, ...PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }))];
  const statusOptions = [{ value: ANY, label: "All" }, ...AD_STATUSES.map((s) => ({ value: s, label: AD_STATUS_LABELS[s] }))];

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <DashboardHeader
        title="Paid Advertising"
        subtitle="Budgets, spend and leads for Google Ads and Bing Ads campaigns."
        actions={
          <>
            <PeriodSelect<PeriodKey> value={period} onChange={(p) => setParam("period", p === DEFAULT_PERIOD ? null : p)} options={PERIOD_OPTIONS} />
            {canEdit && importButton}
            {canEdit && addButton}
          </>
        }
      />

      <FilterBar onClear={filtered ? clearFilters : undefined}>
        <FilterSelect label="Brand" value={brand || ANY} onChange={(v) => setParam("brand", v === ANY ? null : v)} options={brandOptions} />
        <FilterSelect label="Market" value={market || ANY} onChange={(v) => setParam("market", v === ANY ? null : v)} options={marketOptions} />
        <FilterSelect label="Platform" value={platform ?? ANY} onChange={(v) => setParam("platform", v === ANY ? null : v)} options={platformOptions} />
        <FilterSelect label="Status" value={status ?? ANY} onChange={(v) => setParam("status", v === ANY ? null : v)} options={statusOptions} />
        {currencies.length > 1 && (
          <FilterSelect label="Currency" value={currency} onChange={(v) => setParam("currency", v === currencies[0] ? null : v)} options={currencies.map((c) => ({ value: c, label: c }))} />
        )}
        {campaignId && (
          <span className="inline-flex min-w-0 items-center gap-1.5 self-end rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1 text-sm text-foreground md:self-auto">
            <span className="truncate">Campaign: {campaignName ?? "Loading…"}</span>
            <Button variant="ghost" size="icon-xs" onClick={() => setParam("campaign", null)} aria-label="Show all campaigns">
              <X />
            </Button>
          </span>
        )}
      </FilterBar>

      {allTime.error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">{allTime.error.message || "Could not load the ad results."}</p>
          <Button variant="outline" size="sm" onClick={() => allTime.refetch()}>
            Try again
          </Button>
        </div>
      ) : nothingAtAll ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">{filtered ? "No ad results match these filters" : "No ad results yet"}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Add a result for each campaign and period, or import your SaaS PPC Campaigns spreadsheet to bring them all in at once. Spend counts toward the campaign's costs
            and monthly budget.
            {filtered && " You can also clear the filters above."}
          </p>
          {canEdit ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              {importButton}
              {addButton}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Ask someone who can edit initiatives to add them.</p>
          )}
        </div>
      ) : (
        <>
          <section aria-label={`Key figures, ${periodLabel}`} className={`transition-opacity ${current.isPlaceholderData ? "opacity-60" : ""}`}>
            <KpiGrid>
              <KpiCard
                label="Total Budget"
                icon={Landmark}
                tone="blue"
                info="The budget entered for the campaigns' periods in this date range."
                value={money(totals?.budget_amount)}
                loading={periodLoading}
                change={compare ? { current: totals?.budget_amount, previous: prevTotals?.budget_amount } : undefined}
                changeLabel={ranges.changeLabel}
                hint={`${totals?.campaign_count ?? 0} ${totals?.campaign_count === 1 ? "campaign" : "campaigns"}`}
              />
              <KpiCard
                label="Total Spend"
                icon={Receipt}
                tone="violet"
                info="What the campaigns spent in this date range."
                value={money(totals?.spend)}
                loading={periodLoading}
                change={compare ? { current: totals?.spend, previous: prevTotals?.spend } : undefined}
                changeLabel={ranges.changeLabel}
                hint={totals?.budget_used_percent != null ? `${Math.round(totals.budget_used_percent)}% of budget` : undefined}
              />
              <KpiCard
                label="Remaining Budget"
                icon={PiggyBank}
                tone="green"
                info="Total budget minus total spend. Red means more was spent than budgeted."
                value={money(remaining)}
                valueClassName={remaining !== null && remaining < 0 ? "text-red-600 dark:text-red-400" : undefined}
                loading={periodLoading}
                change={compare ? { current: remaining, previous: remainingOf(prevTotals) } : undefined}
                changeLabel={ranges.changeLabel}
              />
              <KpiCard
                label="Leads"
                icon={UserPlus}
                tone="orange"
                info={METRIC_INFO.leads}
                value={fmtCount(totals?.hubspot_contacts ?? null)}
                loading={periodLoading}
                change={compare ? { current: totals?.hubspot_contacts, previous: prevTotals?.hubspot_contacts } : undefined}
                changeLabel={ranges.changeLabel}
              />
              <KpiCard
                label="CPL"
                icon={Users}
                tone="sky"
                info={METRIC_INFO.cpl}
                value={unit(totals?.cpl)}
                loading={periodLoading}
                goodWhen="down"
                change={compare ? { current: totals?.cpl, previous: prevTotals?.cpl } : undefined}
                changeLabel={ranges.changeLabel}
              />
              <KpiCard
                label="CPC"
                icon={MousePointerClick}
                tone="pink"
                info={METRIC_INFO.cpc}
                value={unit(totals?.cpc)}
                loading={periodLoading}
                goodWhen="down"
                change={compare ? { current: totals?.cpc, previous: prevTotals?.cpc } : undefined}
                changeLabel={ranges.changeLabel}
              />
            </KpiGrid>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-5">
            <ChartCard
              className="xl:col-span-3"
              title="Budget vs spend"
              subtitle={`By month, ${currency}`}
              info="Budget and spend of the results that start in each month."
              action={<BudgetSpendLegend />}
            >
              {(chartDates ? chart.isLoading : allTime.isLoading) ? (
                <Skeleton className="h-[260px] w-full rounded-lg" />
              ) : monthlyEmpty ? (
                <ChartEmpty text="No budget or spend in these months." />
              ) : (
                <BudgetSpendChart data={monthly} currency={currency} />
              )}
            </ChartCard>
            <ChartCard className="xl:col-span-2" title="Spend by platform" subtitle={`${periodLabel}, ${currency}`}>
              {periodLoading ? (
                <Skeleton className="h-[180px] w-full rounded-lg" />
              ) : donutItems.length === 0 ? (
                <ChartEmpty text="No spend in this period." height={180} />
              ) : (
                <DonutChart items={donutItems} currency={currency} totalLabel="Total spend" />
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <InsightCard
              icon={Trophy}
              tone="green"
              label="Best platform (lowest CPL)"
              title={bestPlatform ? PLATFORM_LABELS[bestPlatform.platform] : undefined}
              stats={
                bestPlatform
                  ? [
                      { label: "CPL", value: unit(bestPlatform.totals.cpl) },
                      { label: "Leads", value: fmtCount(bestPlatform.totals.hubspot_contacts) },
                      { label: "Spend", value: money(bestPlatform.totals.spend) },
                    ]
                  : []
              }
              onClick={bestPlatform && !platform ? () => setParam("platform", bestPlatform.platform) : undefined}
            />
            <InsightCard
              icon={AlertTriangle}
              tone="amber"
              warning
              label="Highest CPL"
              title={priciest?.name}
              stats={
                priciest
                  ? [
                      { label: "CPL", value: unit(priciest.totals.cpl) },
                      { label: "Leads", value: fmtCount(priciest.totals.hubspot_contacts) },
                      { label: "Spend", value: money(priciest.totals.spend) },
                    ]
                  : []
              }
              to={priciest ? `/initiatives/${priciest.initiativeId}` : undefined}
            />
            <InsightCard
              icon={UserPlus}
              tone="blue"
              label="Most leads"
              title={mostLeads?.name}
              stats={
                mostLeads
                  ? [
                      { label: "Leads", value: fmtCount(mostLeads.totals.hubspot_contacts) },
                      { label: "CPL", value: unit(mostLeads.totals.cpl) },
                      { label: "Spend", value: money(mostLeads.totals.spend) },
                    ]
                  : []
              }
              to={mostLeads ? `/initiatives/${mostLeads.initiativeId}` : undefined}
            />
          </div>

          <section className="flex min-w-0 flex-col gap-3" aria-labelledby="ads-campaigns-title">
            <div>
              <h2 id="ads-campaigns-title" className="text-lg font-semibold text-foreground">
                Campaigns
              </h2>
              <p className="text-sm text-muted-foreground">Every period of each campaign, whatever the date range above. Click a campaign to see its periods and ad groups.</p>
            </div>
            {allTime.isLoading ? (
              <Skeleton className="h-80 rounded-xl" />
            ) : (
              <Tabs value={tab} onValueChange={(v) => setParam("tab", v === "running" ? null : v)} className="min-w-0 gap-3">
                <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
                  <TabsList className="h-9">
                    {TABS.map((t) => (
                      <TabsTrigger key={t.value} value={t.value} className="gap-1.5 px-3">
                        {t.label}
                        <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{timing[t.value].length}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {TABS.map((t) => (
                  <TabsContent key={t.value} value={t.value} className="min-w-0">
                    <CampaignTable groups={timing[t.value]} emptyText={t.empty} exportName={t.value} onEdit={onEdit} onAdd={onAdd} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </section>
        </>
      )}

      {canEdit && (
        <>
          <AdResultDialog
            open={dialog.open}
            onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
            result={dialog.result}
            defaultCampaignId={dialog.campaignId}
          />
          <PaidAdsUpload open={uploadOpen} onOpenChange={setUploadOpen} onDownloadTemplate={template} />
        </>
      )}
    </div>
  );
}
