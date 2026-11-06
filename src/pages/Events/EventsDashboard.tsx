// The Dashboard tab of the Events Overview: key figures and charts comparing the Navan events
import { useMemo } from "react";
import { CalendarDays, Plane, Receipt, Target, UserPlus, Users } from "lucide-react";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import DonutChart from "@/components/dashboard/DonutChart";
import KpiCard, { KpiGrid } from "@/components/dashboard/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventsOverviewResponse } from "@/types/eventsOverview";
import { fmtCount, fmtMoney, fmtUnitCost } from "../PaidAds/adsDisplay";
import { COST_CATEGORIES, COST_CATEGORY_COLORS, COST_CATEGORY_INFO, COST_CATEGORY_LABELS } from "./eventPerformanceDisplay";
import {
  EventSpendChart,
  EventSpendLegend,
  HubSpotResultsChart,
  hubspotResultsEmpty,
  MonthlyChart,
  MonthlyLegend,
  TravellersChart,
} from "./EventsCharts";

interface EventsDashboardProps {
  data: EventsOverviewResponse | undefined;
  loading: boolean;
  currency: string;
  periodLabel: string;
}

export default function EventsDashboard({ data, loading, currency, periodLabel }: EventsDashboardProps) {
  const events = useMemo(() => (data?.events ?? []).filter((e) => e.currency === currency), [data, currency]);
  const totals = data?.totals.find((t) => t.currency === currency);
  const months = useMemo(() => (data?.monthly ?? []).filter((m) => m.currency === currency), [data, currency]);
  const breakdown = data?.cost_breakdown.find((b) => b.currency === currency);
  const donutItems = breakdown
    ? COST_CATEGORIES.filter((c) => (breakdown[c] ?? 0) > 0).map((c) => ({ key: c, label: COST_CATEGORY_LABELS[c], value: breakdown[c], color: COST_CATEGORY_COLORS[c] }))
    : [];
  const travellers = events.reduce((sum, e) => sum + e.navan.travellers, 0);
  const hubspot = data?.hubspot;
  const money = (n: number | null | undefined) => fmtMoney(n ?? null, currency);
  const overBudget = events.filter((e) => e.approved_budget && e.actual_cost > e.approved_budget).length;

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <section aria-label={`Key figures, ${periodLabel}`}>
        <KpiGrid>
          <KpiCard
            label="Events"
            icon={CalendarDays}
            tone="blue"
            info="The HubSpot events in this period."
            value={fmtCount(totals?.event_count ?? 0)}
            caption={`${events.filter((e) => e.navan_events.length > 0).length} with Navan travel`}
            loading={loading}
          />
          <KpiCard
            label="Actual Cost"
            icon={Receipt}
            tone="violet"
            info="What the events cost so far: invoiced and paid costs, plus the Navan travel booked."
            value={money(totals?.actual_spend)}
            caption={totals?.approved_budget != null ? `Budget ${money(totals.approved_budget)}${overBudget ? `, ${overBudget} over` : ""}` : "No budgets set"}
            loading={loading}
          />
          <KpiCard
            label="Navan Travel"
            icon={Plane}
            tone="sky"
            info="Flights, hotels and other travel booked through Navan for these events."
            value={money(totals?.travel_cost)}
            caption={totals?.actual_spend ? `${Math.round(((totals.travel_cost ?? 0) / totals.actual_spend) * 100)}% of the cost` : undefined}
            loading={loading}
          />
          <KpiCard
            label="People Travelling"
            icon={Users}
            tone="green"
            info="People on the events' active Navan bookings, counted once per event."
            value={fmtCount(travellers)}
            caption={events.length ? `${(travellers / events.length).toFixed(1)} per event` : undefined}
            loading={loading}
          />
          <KpiCard
            label="HubSpot Leads"
            icon={UserPlus}
            tone="orange"
            info="Contacts on the events' HubSpot lists: the matched campaign's lists, else a list named like the event. Without lists, the contacts credited to the campaign."
            value={fmtCount(totals?.leads ?? null)}
            caption={hubspot?.attended != null ? `${fmtCount(hubspot.attended)} attended` : "From HubSpot lists"}
            loading={loading}
          />
          <KpiCard
            label="Cost / Lead"
            icon={Target}
            tone="pink"
            info="Actual cost of the events that have HubSpot leads, divided by those leads."
            value={fmtUnitCost(totals?.cost_per_lead ?? null, currency)}
            loading={loading}
            goodWhen="down"
          />
        </KpiGrid>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
        <ChartCard title="Cost vs Budget by Event" subtitle={`The ${Math.min(10, events.length)} costliest events · ${periodLabel}, ${currency}`} action={<EventSpendLegend />}>
          {loading ? (
            <Skeleton className="h-[260px] w-full rounded-lg" />
          ) : events.every((e) => !e.actual_cost && !e.approved_budget) ? (
            <ChartEmpty text="No costs or budgets for these events yet." />
          ) : (
            <EventSpendChart events={events} currency={currency} />
          )}
        </ChartCard>
        <ChartCard title="By Month" subtitle={`By the month each event starts · ${periodLabel}, ${currency}`} action={<MonthlyLegend />}>
          {loading ? (
            <Skeleton className="h-[240px] w-full rounded-lg" />
          ) : months.length === 0 ? (
            <ChartEmpty text="No events in this period." height={240} />
          ) : (
            <MonthlyChart months={months} currency={currency} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <ChartCard
          title="Cost Breakdown"
          subtitle={`Actual cost · ${periodLabel}, ${currency}`}
          info={COST_CATEGORIES.map((c) => `${COST_CATEGORY_LABELS[c]}: ${COST_CATEGORY_INFO[c]}`).join(" ")}
        >
          {loading ? (
            <Skeleton className="h-[180px] w-full rounded-lg" />
          ) : donutItems.length === 0 ? (
            <ChartEmpty text="No costs in this period." height={180} />
          ) : (
            <DonutChart items={donutItems} currency={currency} totalLabel="Actual cost" />
          )}
        </ChartCard>
        <ChartCard title="People Travelling" subtitle="By event, from Navan bookings">
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : travellers === 0 ? (
            <ChartEmpty text="No travellers yet. The Navan sync fills this in." height={180} />
          ) : (
            <TravellersChart events={events} />
          )}
        </ChartCard>
        <ChartCard
          title="HubSpot Results"
          subtitle={`All matched events · ${periodLabel}`}
          info="Registrations and attendance come from HubSpot marketing events; leads from the event's contact lists; MQLs, SQLs and the rest are among those leads. Steps HubSpot has nothing for are left out."
        >
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : !hubspot || hubspotResultsEmpty(hubspot) ? (
            <ChartEmpty text="No HubSpot results for these events yet." height={180} />
          ) : (
            <HubSpotResultsChart totals={hubspot} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
