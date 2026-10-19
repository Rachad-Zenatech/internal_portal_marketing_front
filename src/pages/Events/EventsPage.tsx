import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Coins, History, Landmark, Receipt, Scale, Target, Trophy, Upload, UserPlus } from "lucide-react";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DonutChart from "@/components/dashboard/DonutChart";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import InsightCard from "@/components/dashboard/InsightCard";
import KpiCard, { KpiGrid, type KpiChange } from "@/components/dashboard/KpiCard";
import PeriodSelect from "@/components/dashboard/PeriodSelect";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventPerformance } from "@/hooks/useEventManagement";
import { useInitiatives } from "@/hooks/useInitiatives";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { EventKeyFigures, EventMonthlyRow, EventPerformance, EventPerformanceFilters, EventPeriod } from "@/types/eventPerformance";
import type { InitiativeListItem, InitiativeStatus } from "@/types/initiatives";
import CostSheetUpload from "../Initiatives/CostSheetUpload";
import NavanSyncStatus from "./NavanSyncStatus";
import { STATUS_LABELS } from "../Initiatives/status";
import { fmtCount, fmtMoney, fmtUnitCost } from "../PaidAds/adsDisplay";
import EventBudgetChart, { EventBudgetLegend, type EventBudgetPoint } from "./EventBudgetChart";
import EventFlags from "./EventFlags";
import EventFunnel, { funnelIsEmpty } from "./EventFunnel";
import EventPerformanceTable, { TABLE_VIEWS, type EventTableView } from "./EventPerformanceTable";
import ImportEventDataDialog from "./ImportEventDataDialog";
import {
  COST_CATEGORIES,
  COST_CATEGORY_COLORS,
  COST_CATEGORY_INFO,
  COST_CATEGORY_LABELS,
  DEFAULT_EVENT_PERIOD,
  EVENT_METRIC_INFO,
  EVENT_PERIOD_OPTIONS,
  eventPeriodRange,
  fmtRoi,
  monthsBetween,
  parseEventPeriod,
  type EventPeriodKey,
} from "./eventPerformanceDisplay";

const ANY = "ANY";
const STATUSES: InitiativeStatus[] = ["PLANNED", "ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"];
// Kept in the URL; "region" is the market, "type" the event type
const FILTER_PARAMS = ["brand", "region", "type", "owner", "status", "currency"];
const CHANGE_LABEL = "vs. previous period";

type UploadTarget = Pick<InitiativeListItem, "id" | "name" | "currency">;

/** Each month in the period (by the month events start) for one currency; months without events show as empty */
function monthlyPoints(rows: EventMonthlyRow[], currency: string, period: EventPeriod | null): EventBudgetPoint[] {
  const byMonth = new Map(rows.filter((r) => r.currency === currency).map((r) => [r.month.slice(0, 7), r]));
  const keys = period ? monthsBetween(period.from, period.to) : [...byMonth.keys()].sort().slice(-24);
  return keys.map((key) => {
    const date = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);
    const row = byMonth.get(key);
    return {
      key,
      label: date.toLocaleDateString(undefined, { month: "short", ...(keys.length > 12 ? { year: "2-digit" } : {}) }),
      fullLabel: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      budget: row?.approved_budget ?? 0,
      actual: row?.actual_spend ?? 0,
      priorYear: row?.prior_year_spend ?? 0,
    };
  });
}

export default function EventsPage() {
  const { hasPermission } = useAuth();
  const canImport = hasPermission("INITIATIVES_UPDATE");
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reference } = useReferenceData();
  const [importOpen, setImportOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState<UploadTarget | null>(null);

  // Everything picked is kept in the URL, so a view can be shared or bookmarked
  const period = parseEventPeriod(searchParams.get("period"));
  const brand = searchParams.get("brand") ?? "";
  const region = searchParams.get("region") ?? "";
  const eventType = searchParams.get("type") ?? "";
  const owner = searchParams.get("owner") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const status = STATUSES.includes(statusParam as InitiativeStatus) ? statusParam : "";
  const currencyParam = searchParams.get("currency") ?? "";
  const viewParam = searchParams.get("view");
  const view: EventTableView = TABLE_VIEWS.some((v) => v.value === viewParam) ? (viewParam as EventTableView) : "overview";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    FILTER_PARAMS.forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };

  const filters = useMemo<EventPerformanceFilters>(() => {
    const f: EventPerformanceFilters = { ...(eventPeriodRange(period) ?? {}) };
    if (brand) f.brand_id = Number(brand);
    if (region) f.market_id = Number(region);
    if (eventType) f.event_type_id = Number(eventType);
    if (owner) f.owner_user_id = owner;
    if (status) f.status = status;
    return f;
  }, [period, brand, region, eventType, owner, status]);
  const current = useEventPerformance(filters);
  const data = current.data;
  const loading = current.isLoading;

  // Every event, for the owner filter and the event to import data for
  const eventsChannel = reference?.channels.find((c) => c.code === "EVENTS");
  const allEvents = useInitiatives({ channel_id: eventsChannel?.id, limit: 200 }, Boolean(eventsChannel));

  // Money is never added across currencies: the figures show one currency at a time (the one with the most spend first)
  const currencies = useMemo(
    () => [...(data?.totals ?? [])].sort((a, b) => (b.actual_spend ?? 0) - (a.actual_spend ?? 0) || b.event_count - a.event_count).map((t) => t.currency),
    [data],
  );
  const currency = currencies.includes(currencyParam) ? currencyParam : (currencies[0] ?? "USD");
  const totals = data?.totals.find((t) => t.currency === currency);
  const compare = Boolean(data?.previous_period);
  const change = (key: keyof EventKeyFigures): KpiChange | undefined =>
    compare ? { current: totals?.[key] ?? null, previous: totals?.previous?.[key] ?? null } : undefined;
  const money = (n: number | null | undefined) => fmtMoney(n ?? null, currency);
  const unit = (n: number | null | undefined) => fmtUnitCost(n ?? null, currency);

  const events = useMemo(() => data?.events ?? [], [data]);
  const currencyEvents = useMemo(() => events.filter((e) => e.currency === currency), [events, currency]);

  // ─── Charts ───
  const monthly = useMemo(() => monthlyPoints(data?.monthly ?? [], currency, data?.period ?? null), [data, currency]);
  const breakdown = data?.cost_breakdown.find((b) => b.currency === currency);
  const donutItems = breakdown
    ? COST_CATEGORIES.filter((c) => (breakdown[c] ?? 0) > 0).map((c) => ({ key: c, label: COST_CATEGORY_LABELS[c], value: breakdown[c], color: COST_CATEGORY_COLORS[c] }))
    : [];

  // ─── Highlights (events in the currency shown) ───
  const best = currencyEvents.filter((e) => e.roi_percent !== null).sort((a, b) => (b.roi_percent ?? 0) - (a.roi_percent ?? 0))[0];
  const priciest = currencyEvents.filter((e) => e.actual_cost > 0).sort((a, b) => b.actual_cost - a.actual_cost)[0];
  const efficient = currencyEvents.filter((e) => e.cost_per_lead !== null).sort((a, b) => (a.cost_per_lead ?? 0) - (b.cost_per_lead ?? 0))[0];

  // ─── Filters ───
  const filtered = FILTER_PARAMS.some((k) => searchParams.get(k));
  const nothing = !loading && !current.error && events.length === 0;
  const periodLabel = EVENT_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";

  const brandOptions = [{ value: ANY, label: "All brands" }, ...(reference?.brands ?? []).map((b) => ({ value: String(b.id), label: b.name }))];
  const regionOptions = [{ value: ANY, label: "All regions" }, ...(reference?.markets ?? []).map((m) => ({ value: String(m.id), label: m.name }))];
  const typeOptions = [{ value: ANY, label: "All types" }, ...(reference?.event_types ?? []).map((t) => ({ value: String(t.id), label: t.name }))];
  const owners = new Map<string, string>();
  for (const e of allEvents.data?.items ?? []) if (e.owner_user_id) owners.set(e.owner_user_id, e.owner_name ?? "Unknown");
  if (owner && !owners.has(owner)) owners.set(owner, "Selected owner");
  const ownerOptions = [{ value: ANY, label: "All owners" }, ...[...owners].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => ({ value: id, label: name }))];
  const statusOptions = [{ value: ANY, label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))];

  const importButton = canImport && (
    <Button onClick={() => setImportOpen(true)} className="h-9 gap-2">
      <Upload className="h-4 w-4" />
      Import Event Data
    </Button>
  );
  const importFor = (e: EventPerformance) => setUploadFor({ id: e.id, name: e.name, currency: e.currency });

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <DashboardHeader
        title="Events Overview"
        subtitle="Track event budgets, actual costs, outcomes, and ROI across conferences, trade shows, and field events."
        actions={
          <>
            <NavanSyncStatus />
            <PeriodSelect<EventPeriodKey> value={period} onChange={(p) => setParam("period", p === DEFAULT_EVENT_PERIOD ? null : p)} options={EVENT_PERIOD_OPTIONS} />
            {importButton}
          </>
        }
      />

      <FilterBar onClear={filtered ? clearFilters : undefined}>
        <FilterSelect label="Brand" value={brand || ANY} onChange={(v) => setParam("brand", v === ANY ? null : v)} options={brandOptions} />
        <FilterSelect label="Region" value={region || ANY} onChange={(v) => setParam("region", v === ANY ? null : v)} options={regionOptions} />
        <FilterSelect label="Event Type" value={eventType || ANY} onChange={(v) => setParam("type", v === ANY ? null : v)} options={typeOptions} />
        <FilterSelect label="Owner" value={owner || ANY} onChange={(v) => setParam("owner", v === ANY ? null : v)} options={ownerOptions} />
        <FilterSelect label="Event Status" value={status || ANY} onChange={(v) => setParam("status", v === ANY ? null : v)} options={statusOptions} />
        {currencies.length > 1 && (
          <FilterSelect label="Currency" value={currency} onChange={(v) => setParam("currency", v === currencies[0] ? null : v)} options={currencies.map((c) => ({ value: c, label: c }))} />
        )}
      </FilterBar>

      {current.error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">{current.error.message || "Could not load the events."}</p>
          <Button variant="outline" size="sm" onClick={() => current.refetch()}>
            Try again
          </Button>
        </div>
      ) : nothing ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">No events in this period.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Try a longer period{filtered ? " or clear the filters above" : ""}. Events without dates and drafts aren't shown here.
          </p>
        </div>
      ) : (
        <>
          {/* 1. Key figures, compared with the previous period */}
          <section aria-label={`Key figures, ${periodLabel}`} className={`transition-opacity ${current.isPlaceholderData ? "opacity-60" : ""}`}>
            <KpiGrid>
              <KpiCard
                label="Approved Event Budget"
                icon={Landmark}
                tone="blue"
                info={EVENT_METRIC_INFO.budget}
                value={money(totals?.approved_budget)}
                loading={loading}
                change={change("approved_budget")}
                changeLabel={CHANGE_LABEL}
              />
              <KpiCard
                label="Actual Event Spend"
                icon={Receipt}
                tone="violet"
                info={EVENT_METRIC_INFO.actual}
                value={money(totals?.actual_spend)}
                loading={loading}
                goodWhen="down"
                change={change("actual_spend")}
                changeLabel={CHANGE_LABEL}
              />
              <KpiCard
                label="Budget Variance"
                icon={Scale}
                tone="green"
                info={EVENT_METRIC_INFO.variance}
                value={totals?.budget_variance != null && totals.budget_variance > 0 ? `+${money(totals.budget_variance)}` : money(totals?.budget_variance)}
                valueClassName={totals?.budget_variance != null && totals.budget_variance > 0 ? "text-red-600 dark:text-red-400" : undefined}
                loading={loading}
                goodWhen="down"
                change={
                  compare
                    ? { current: totals?.budget_variance ?? null, previous: totals?.previous?.budget_variance ?? null, mode: "absolute", formatDiff: (d) => money(d) }
                    : undefined
                }
                changeLabel={CHANGE_LABEL}
              />
              <KpiCard
                label="Prior Year Spend"
                icon={History}
                tone="amber"
                info={EVENT_METRIC_INFO.priorYear}
                value={money(totals?.prior_year_spend)}
                loading={loading}
                goodWhen="down"
                change={change("prior_year_spend")}
                changeLabel={CHANGE_LABEL}
              />
              <KpiCard
                label="Leads Captured"
                icon={UserPlus}
                tone="orange"
                info={EVENT_METRIC_INFO.leads}
                value={fmtCount(totals?.leads ?? null)}
                loading={loading}
                change={change("leads")}
                changeLabel={CHANGE_LABEL}
              />
              <KpiCard
                label="Cost / Lead"
                icon={Target}
                tone="pink"
                info={EVENT_METRIC_INFO.cpl}
                value={unit(totals?.cost_per_lead)}
                loading={loading}
                goodWhen="down"
                change={change("cost_per_lead")}
                changeLabel={CHANGE_LABEL}
              />
            </KpiGrid>
          </section>

          {/* 2. Budget against actual over time, the funnel, and where the money went */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
            <ChartCard
              title="Budget vs Actual vs Prior Year"
              subtitle={`By the month each event starts · ${periodLabel}, ${currency}`}
              info="Approved budgets and actual spend (invoiced and paid) of the events starting each month, next to the actual spend of the same month a year earlier."
              action={<EventBudgetLegend />}
              className="xl:col-span-2 2xl:col-span-1"
            >
              {loading ? (
                <Skeleton className="h-[240px] w-full rounded-lg" />
              ) : monthly.every((p) => !p.budget && !p.actual && !p.priorYear) ? (
                <ChartEmpty text="No budgets or spend in this period." height={240} />
              ) : (
                <EventBudgetChart data={monthly} currency={currency} />
              )}
            </ChartCard>
            <ChartCard title="Event Funnel" subtitle={`All events · ${periodLabel}`} info="Qualified leads are MQLs. The % is each step's share of the attendees.">
              {loading ? (
                <Skeleton className="h-[240px] w-full rounded-lg" />
              ) : !data || funnelIsEmpty(data.funnel) ? (
                <ChartEmpty text="No attendees, leads or demos recorded yet." height={240} />
              ) : (
                <EventFunnel funnel={data.funnel} />
              )}
            </ChartCard>
            <ChartCard
              title="Cost Breakdown"
              subtitle={`Actual spend · ${periodLabel}, ${currency}`}
              info={COST_CATEGORIES.map((c) => `${COST_CATEGORY_LABELS[c]}: ${COST_CATEGORY_INFO[c]}`).join(" ")}
            >
              {loading ? (
                <Skeleton className="h-[180px] w-full rounded-lg" />
              ) : donutItems.length === 0 ? (
                <ChartEmpty text="No costs in this period." height={180} />
              ) : (
                <DonutChart items={donutItems} currency={currency} totalLabel="Actual spend" />
              )}
            </ChartCard>
          </div>

          {/* 3. The events that stand out */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <InsightCard
              icon={Trophy}
              tone="green"
              label="Best Performing Event"
              title={best?.name}
              stats={best ? [{ label: "ROI", value: fmtRoi(best.roi_percent) }, { label: "Leads", value: fmtCount(best.leads) }, { label: "Customers", value: fmtCount(best.customers) }] : []}
              emptyText="Needs revenue recorded on an event"
              to={best ? `/events/${best.id}` : undefined}
            />
            <InsightCard
              icon={Coins}
              tone="red"
              label="Highest Cost Event"
              title={priciest?.name}
              stats={
                priciest
                  ? [{ label: "Spend", value: money(priciest.actual_cost) }, { label: "Demos", value: fmtCount(priciest.demos) }, { label: "Cost / Lead", value: unit(priciest.cost_per_lead) }]
                  : []
              }
              emptyText="No costs recorded yet"
              to={priciest ? `/events/${priciest.id}` : undefined}
            />
            <InsightCard
              icon={Target}
              tone="amber"
              label="Most Efficient Event"
              title={efficient?.name}
              stats={
                efficient
                  ? [{ label: "CPL", value: unit(efficient.cost_per_lead) }, { label: "Leads", value: fmtCount(efficient.leads) }, { label: "ROI", value: fmtRoi(efficient.roi_percent) }]
                  : []
              }
              emptyText="No leads recorded yet"
              to={efficient ? `/events/${efficient.id}` : undefined}
            />
          </div>

          {/* 4. Every event, in the view that answers the question at hand */}
          <section className="flex min-w-0 flex-col gap-3" aria-label="Events">
            {loading ? (
              <Skeleton className="h-80 rounded-xl" />
            ) : (
              <EventPerformanceTable
                events={events}
                view={view}
                onViewChange={(v) => setParam("view", v === "overview" ? null : v)}
                emptyText="No events in this period."
                onImport={canImport ? importFor : undefined}
              />
            )}
          </section>

          {!loading && <EventFlags events={events} />}
        </>
      )}

      {canImport && (
        <>
          <ImportEventDataDialog open={importOpen} onOpenChange={setImportOpen} events={allEvents.data?.items ?? []} loading={allEvents.isLoading} onPick={setUploadFor} />
          {uploadFor && <CostSheetUpload open onOpenChange={(open) => !open && setUploadFor(null)} initiative={uploadFor} />}
        </>
      )}
    </div>
  );
}
