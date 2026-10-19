import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  CircleCheck,
  Footprints,
  Handshake,
  Plus,
  Presentation,
  Receipt,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DonutChart from "@/components/dashboard/DonutChart";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import InfoTip from "@/components/dashboard/InfoTip";
import InsightCard from "@/components/dashboard/InsightCard";
import KpiCard, { KpiGrid } from "@/components/dashboard/KpiCard";
import PeriodSelect from "@/components/dashboard/PeriodSelect";
import { DASH_CARD, TONE_TILE, type Tone } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventPerformance } from "@/hooks/useEventManagement";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { EventPerformance, EventPerformanceFilters, EventPerformanceResponse, EventPerformanceTiming } from "@/types/eventPerformance";
import InitiativeFormDialog from "../Initiatives/InitiativeFormDialog";
import { fmtCount, fmtMoney, fmtUnitCost } from "../PaidAds/adsDisplay";
import EventFunnel from "./EventFunnel";
import EventPerformanceTable from "./EventPerformanceTable";
import {
  COST_GROUP_COLORS,
  COST_GROUP_LABELS,
  COST_GROUPS,
  DEFAULT_EVENT_PERIOD,
  EVENT_METRIC_INFO,
  EVENT_PERIOD_OPTIONS,
  eventPeriodRanges,
  fmtRoi,
  parseEventPeriod,
  TIMING_FILTER_LABELS,
  TIMINGS,
  type EventPeriodKey,
} from "./eventPerformanceDisplay";

const ANY = "ANY";

const TABS: { value: EventPerformanceTiming; param: string; empty: string }[] = [
  { value: "NOW", param: "now", empty: "No events are on today." },
  { value: "UPCOMING", param: "upcoming", empty: "No upcoming events in this period." },
  { value: "PAST", param: "past", empty: "No past events in this period." },
];

/** The totals row for one currency */
const pickTotals = (data: EventPerformanceResponse | undefined, currency: string) => data?.totals.find((t) => t.currency === currency);

/** A smaller key figure for the second row: no comparison, a short hint instead */
function SmallKpi({ label, value, icon: Icon, tone, info, hint, valueClassName, loading }: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone: Tone;
  info?: string;
  hint?: React.ReactNode;
  valueClassName?: string;
  loading?: boolean;
}) {
  return (
    <div className={`${DASH_CARD} flex min-w-0 items-center gap-3 px-4 py-3`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_TILE[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <span className="truncate">{label}</span>
          {info && <InfoTip text={info} label={label} />}
        </p>
        {loading ? (
          <Skeleton className="mt-1 h-6 w-20" />
        ) : (
          <p className={`truncate text-lg font-semibold tabular-nums ${valueClassName ?? "text-foreground"}`}>{value}</p>
        )}
        {hint && !loading && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("INITIATIVES_CREATE");
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reference } = useReferenceData();
  const [createOpen, setCreateOpen] = useState(false);

  // Everything picked is kept in the URL, so a view can be shared or bookmarked
  const period = parseEventPeriod(searchParams.get("period"));
  const brand = searchParams.get("brand") ?? "";
  const market = searchParams.get("market") ?? "";
  const type = searchParams.get("type") ?? "";
  const timingParam = searchParams.get("timing");
  const timing: EventPerformanceTiming | null = TIMINGS.includes(timingParam as EventPerformanceTiming) ? (timingParam as EventPerformanceTiming) : null;
  const currencyParam = searchParams.get("currency") ?? "";
  const tabParam = searchParams.get("tab");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ["brand", "market", "type", "timing", "currency"].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };

  const baseFilters = useMemo<EventPerformanceFilters>(() => {
    const f: EventPerformanceFilters = {};
    if (brand) f.brand_id = Number(brand);
    if (market) f.market_id = Number(market);
    if (type) f.sub_channel_id = Number(type);
    if (timing) f.timing = timing;
    return f;
  }, [brand, market, type, timing]);
  const ranges = useMemo(() => eventPeriodRanges(period), [period]);

  const current = useEventPerformance({ ...baseFilters, ...(ranges.current ?? {}) });
  const previous = useEventPerformance({ ...baseFilters, ...(ranges.previous ?? {}) }, Boolean(ranges.previous));
  const data = current.data;
  const loading = current.isLoading;

  // Money is never added across currencies: the figures show one currency at a time (the one with the most cost first)
  const currencies = useMemo(() => [...(data?.totals ?? [])].sort((a, b) => b.cost - a.cost || b.event_count - a.event_count).map((t) => t.currency), [data]);
  const currency = currencies.includes(currencyParam) ? currencyParam : (currencies[0] ?? "USD");

  const totals = pickTotals(data, currency);
  const prevTotals = ranges.previous ? pickTotals(previous.data, currency) : undefined;
  const compare = Boolean(ranges.previous) && !previous.isLoading && !previous.error;
  const change = (key: "cost" | "cost_per_visitor" | "cost_per_lead" | "cost_per_demo" | "cost_per_follow_up" | "cost_per_customer") =>
    compare ? { current: totals?.[key] ?? null, previous: prevTotals?.[key] ?? null } : undefined;

  const events = useMemo(() => data?.events ?? [], [data]);
  const currencyEvents = useMemo(() => events.filter((e) => e.currency === currency), [events, currency]);

  // ─── Charts ───
  const donutItems = totals
    ? COST_GROUPS.filter((g) => (totals.cost_breakdown[g] ?? 0) > 0).map((g) => ({ key: g, label: COST_GROUP_LABELS[g], value: totals.cost_breakdown[g], color: COST_GROUP_COLORS[g] }))
    : [];
  const funnelEmpty = !totals || [totals.visitors, totals.leads, totals.demos, totals.follow_ups, totals.customers].every((n) => !n);

  // ─── Insights (events in the currency shown) ───
  const byRoi = currencyEvents.filter((e) => e.roi_percent !== null).sort((a, b) => (b.roi_percent ?? 0) - (a.roi_percent ?? 0));
  const byCac = currencyEvents.filter((e) => e.cost_per_customer !== null).sort((a, b) => (a.cost_per_customer ?? 0) - (b.cost_per_customer ?? 0));
  const best: EventPerformance | undefined = byRoi[0] ?? byCac[0];
  const bestByRoi = Boolean(byRoi[0]);
  const priciest = currencyEvents.filter((e) => e.cost_per_lead !== null).sort((a, b) => (b.cost_per_lead ?? 0) - (a.cost_per_lead ?? 0))[0];
  const notSuccessful = currencyEvents.filter((e) => e.result === "NOT_SUCCESSFUL");
  const lossOf = (e: EventPerformance) => e.cost - (e.revenue ?? 0);
  const biggestLoss = [...notSuccessful].sort((a, b) => lossOf(b) - lossOf(a))[0];

  // ─── Events table: split by timing ───
  const byTiming = useMemo(() => {
    const out: Record<EventPerformanceTiming, EventPerformance[]> = { NOW: [], UPCOMING: [], PAST: [] };
    for (const e of events) out[e.timing]?.push(e);
    return out;
  }, [events]);
  const tabFromParam = TABS.find((t) => t.param === tabParam)?.value;
  const defaultTab: EventPerformanceTiming = byTiming.NOW.length ? "NOW" : byTiming.PAST.length ? "PAST" : byTiming.UPCOMING.length ? "UPCOMING" : "NOW";
  const tab = tabFromParam ?? defaultTab;

  const filtered = Boolean(brand || market || type || timing || currencyParam);
  const nothing = !loading && !current.error && events.length === 0;
  const periodLabel = EVENT_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";
  const money = (n: number | null | undefined) => fmtMoney(n ?? null, currency);
  const unit = (n: number | null | undefined) => fmtUnitCost(n ?? null, currency);
  const started = totals ? totals.successful_count + totals.unsuccessful_count + totals.awaiting_count : 0;

  const eventsChannel = reference?.channels.find((c) => c.code === "EVENTS");
  const typeOptions = [
    { value: ANY, label: "All types" },
    ...(reference?.sub_channels ?? []).filter((s) => eventsChannel?.sub_channel_ids.includes(s.id)).map((s) => ({ value: String(s.id), label: s.name })),
  ];
  const brandOptions = [{ value: ANY, label: "All brands" }, ...(reference?.brands ?? []).map((b) => ({ value: String(b.id), label: b.name }))];
  const marketOptions = [{ value: ANY, label: "All markets" }, ...(reference?.markets ?? []).map((m) => ({ value: String(m.id), label: m.name }))];
  const timingOptions = [{ value: ANY, label: "All" }, ...TIMINGS.map((t) => ({ value: t, label: TIMING_FILTER_LABELS[t] }))];

  const newEventButton = (
    <Button onClick={() => setCreateOpen(true)} className="h-9 gap-2">
      <Plus className="h-4 w-4" />
      New event
    </Button>
  );

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <DashboardHeader
        title="Events Overview"
        subtitle="How events are performing: what they cost and what they brought in."
        actions={
          <>
            <PeriodSelect<EventPeriodKey> value={period} onChange={(p) => setParam("period", p === DEFAULT_EVENT_PERIOD ? null : p)} options={EVENT_PERIOD_OPTIONS} />
            {canCreate && newEventButton}
          </>
        }
      />

      <FilterBar onClear={filtered ? clearFilters : undefined}>
        <FilterSelect label="Brand" value={brand || ANY} onChange={(v) => setParam("brand", v === ANY ? null : v)} options={brandOptions} />
        <FilterSelect label="Market" value={market || ANY} onChange={(v) => setParam("market", v === ANY ? null : v)} options={marketOptions} />
        <FilterSelect label="Event type" value={type || ANY} onChange={(v) => setParam("type", v === ANY ? null : v)} options={typeOptions} />
        <FilterSelect label="Timing" value={timing ?? ANY} onChange={(v) => setParam("timing", v === ANY ? null : v)} options={timingOptions} />
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
          {canCreate && <div className="mt-2">{newEventButton}</div>}
        </div>
      ) : (
        <>
          <section aria-label={`Key figures, ${periodLabel}`} className={`flex flex-col gap-3 transition-opacity sm:gap-4 ${current.isPlaceholderData ? "opacity-60" : ""}`}>
            <KpiGrid>
              <KpiCard
                label="Total event cost"
                icon={Receipt}
                tone="violet"
                info={EVENT_METRIC_INFO.cost}
                value={money(totals?.cost)}
                loading={loading}
                goodWhen="down"
                change={change("cost")}
                changeLabel={ranges.changeLabel}
                hint={`${totals?.event_count ?? 0} ${totals?.event_count === 1 ? "event" : "events"}`}
              />
              <KpiCard
                label="Cost per visitor"
                icon={Footprints}
                tone="sky"
                info={EVENT_METRIC_INFO.costPerVisitor}
                value={unit(totals?.cost_per_visitor)}
                loading={loading}
                goodWhen="down"
                change={change("cost_per_visitor")}
                changeLabel={ranges.changeLabel}
              />
              <KpiCard
                label="Cost per lead (CPL)"
                icon={UserPlus}
                tone="orange"
                info={EVENT_METRIC_INFO.cpl}
                value={unit(totals?.cost_per_lead)}
                loading={loading}
                goodWhen="down"
                change={change("cost_per_lead")}
                changeLabel={ranges.changeLabel}
              />
              <KpiCard
                label="Cost per demo"
                icon={Presentation}
                tone="blue"
                info={EVENT_METRIC_INFO.costPerDemo}
                value={unit(totals?.cost_per_demo)}
                loading={loading}
                goodWhen="down"
                change={change("cost_per_demo")}
                changeLabel={ranges.changeLabel}
              />
              <KpiCard
                label="Cost per follow-up"
                icon={Handshake}
                tone="pink"
                info={EVENT_METRIC_INFO.costPerFollowUp}
                value={unit(totals?.cost_per_follow_up)}
                loading={loading}
                goodWhen="down"
                change={change("cost_per_follow_up")}
                changeLabel={ranges.changeLabel}
              />
              <KpiCard
                label="Cost per customer (CAC)"
                icon={Users}
                tone="green"
                info={EVENT_METRIC_INFO.cac}
                value={unit(totals?.cost_per_customer)}
                loading={loading}
                goodWhen="down"
                change={change("cost_per_customer")}
                changeLabel={ranges.changeLabel}
              />
            </KpiGrid>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
              <SmallKpi label="Revenue" icon={BadgeDollarSign} tone="green" info={EVENT_METRIC_INFO.revenue} value={money(totals?.revenue)} loading={loading} />
              <SmallKpi
                label="ROI"
                icon={TrendingUp}
                tone="blue"
                info={EVENT_METRIC_INFO.roi}
                value={fmtRoi(totals?.roi_percent)}
                valueClassName={
                  totals?.roi_percent == null ? undefined : totals.roi_percent > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }
                hint={totals?.revenue == null ? "No revenue recorded yet" : undefined}
                loading={loading}
              />
              <SmallKpi
                label="Successful events"
                icon={CircleCheck}
                tone="green"
                info={EVENT_METRIC_INFO.successful}
                value={`${totals?.successful_count ?? 0} of ${started}`}
                hint={totals ? `${totals.unsuccessful_count} not successful · ${totals.awaiting_count} too early or awaiting revenue` : undefined}
                loading={loading}
              />
              <SmallKpi label="Pipeline" icon={Wallet} tone="amber" info={EVENT_METRIC_INFO.pipeline} value={money(totals?.pipeline)} loading={loading} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
            <ChartCard title="Total event cost" subtitle={`Travel + Booth + Materials + Staff = Total event cost · ${periodLabel}, ${currency}`} info={EVENT_METRIC_INFO.cost}>
              {loading ? (
                <Skeleton className="h-[180px] w-full rounded-lg" />
              ) : donutItems.length === 0 ? (
                <ChartEmpty text="No costs in this period." height={180} />
              ) : (
                <DonutChart items={donutItems} currency={currency} totalLabel="Total event cost" />
              )}
            </ChartCard>
            <ChartCard
              title="Event funnel"
              subtitle={`Cost per step and how many moved on from the step before · ${periodLabel}, ${currency}`}
              info="Each step's cost = total event cost ÷ that step's count. The % is this step ÷ the step before."
            >
              {loading ? (
                <Skeleton className="h-[200px] w-full rounded-lg" />
              ) : funnelEmpty || !totals ? (
                <ChartEmpty text="No visitors, leads or demos recorded yet." height={200} />
              ) : (
                <EventFunnel totals={totals} currency={currency} />
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <InsightCard
              icon={Trophy}
              tone="green"
              label={bestByRoi ? "Best event (highest ROI)" : "Best event (lowest CAC)"}
              title={best?.name}
              stats={
                best
                  ? [
                      bestByRoi ? { label: "ROI", value: fmtRoi(best.roi_percent) } : { label: "CAC", value: unit(best.cost_per_customer) },
                      { label: "Revenue", value: money(best.revenue) },
                      { label: "Cost", value: money(best.cost) },
                    ]
                  : []
              }
              emptyText="No revenue or customers recorded yet"
              to={best ? `/events/${best.id}` : undefined}
            />
            <InsightCard
              icon={AlertTriangle}
              tone="amber"
              warning
              label="Highest cost per lead"
              title={priciest?.name}
              stats={
                priciest
                  ? [
                      { label: "CPL", value: unit(priciest.cost_per_lead) },
                      { label: "Leads", value: fmtCount(priciest.leads) },
                      { label: "Cost", value: money(priciest.cost) },
                    ]
                  : []
              }
              emptyText="No leads recorded yet"
              to={priciest ? `/events/${priciest.id}` : undefined}
            />
            <InsightCard
              icon={XCircle}
              tone="red"
              warning
              label="Not successful (broke even or lost money)"
              title={biggestLoss ? `${notSuccessful.length} ${notSuccessful.length === 1 ? "event" : "events"}` : undefined}
              stats={
                biggestLoss
                  ? [
                      { label: "Biggest loss", value: biggestLoss.name },
                      { label: "Lost", value: money(Math.max(lossOf(biggestLoss), 0)) },
                      { label: "ROI", value: fmtRoi(biggestLoss.roi_percent) },
                    ]
                  : []
              }
              emptyText="None so far. Breaking even counts as not successful: an event needs a profit."
              to={biggestLoss ? `/events/${biggestLoss.id}` : undefined}
            />
          </div>

          <section className="flex min-w-0 flex-col gap-3" aria-labelledby="events-table-title">
            <div>
              <h2 id="events-table-title" className="text-lg font-semibold text-foreground">
                Events
              </h2>
              <p className="text-sm text-muted-foreground">Events in this period, in their own currency. Click an event to manage its team, costs, demos and results.</p>
            </div>
            {loading ? (
              <Skeleton className="h-80 rounded-xl" />
            ) : (
              <Tabs value={tab} onValueChange={(v) => setParam("tab", TABS.find((t) => t.value === v)?.param ?? null)} className="min-w-0 gap-3">
                <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
                  <TabsList className="h-9">
                    {TABS.map((t) => (
                      <TabsTrigger key={t.value} value={t.value} className="gap-1.5 px-3">
                        {TIMING_FILTER_LABELS[t.value]}
                        <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{byTiming[t.value].length}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {TABS.map((t) => (
                  <TabsContent key={t.value} value={t.value} className="min-w-0">
                    <EventPerformanceTable events={byTiming[t.value]} emptyText={t.empty} exportName={t.param} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </section>
        </>
      )}

      {canCreate && <InitiativeFormDialog open={createOpen} onOpenChange={setCreateOpen} defaultChannelCode="EVENTS" />}
    </div>
  );
}
