// Charts for the Events Overview dashboard. Need CHART_VARS on a wrapper (ChartCard has it).
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LegendItem } from "@/components/dashboard/ChartCard";
import { compactMoney } from "@/components/dashboard/tones";
import type { EventOverviewRow, EventTurnout, OverviewMonth } from "@/types/eventsOverview";
import { fmtCount, fmtMoney } from "../PaidAds/adsDisplay";

const TIP = "min-w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md";
const OVER = "#dc2626";
const MAX_BARS = 10;
const ROW_HEIGHT = 34;

const shortName = (name: string) => (name.length > 28 ? `${name.slice(0, 27)}…` : name);
const chartHeight = (rows: number) => Math.max(180, rows * ROW_HEIGHT + 24);
const AXIS = { fill: "currentColor", fontSize: 12 };

// ─── Budget and actual cost, per event ───────────────────────────────────────

export function EventSpendLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <LegendItem color="var(--chart-budget)" label="Approved budget" />
      <LegendItem color="var(--chart-spend)" label="Actual cost" />
      <LegendItem color={OVER} label="Over budget" />
    </div>
  );
}

/** Each event's approved budget and actual cost, the biggest first; the cost bar turns red when over budget */
export function EventSpendChart({ events, currency }: { events: EventOverviewRow[]; currency: string }) {
  const data = [...events]
    .filter((e) => e.actual_cost > 0 || e.approved_budget)
    .sort((a, b) => b.actual_cost - a.actual_cost)
    .slice(0, MAX_BARS)
    .map((e) => ({ e, name: shortName(e.name), budget: e.approved_budget ?? 0, cost: e.actual_cost }));
  return (
    <div style={{ height: chartHeight(data.length) }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={AXIS} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false} tick={AXIS} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !point) return null;
              const { e } = point;
              return (
                <div className={TIP}>
                  <p className="mb-1 font-semibold">{e.name}</p>
                  <p className="flex justify-between gap-4">
                    <span>Budget</span>
                    <span className="font-medium tabular-nums">{e.approved_budget ? fmtMoney(e.approved_budget, currency) : "Not set"}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Actual cost</span>
                    <span className="font-medium tabular-nums">{fmtMoney(e.actual_cost, currency)}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>of which Navan travel</span>
                    <span className="font-medium tabular-nums">{fmtMoney(e.navan.travel_cost, currency)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="budget" name="Approved budget" fill="var(--chart-budget)" radius={[0, 4, 4, 0]} maxBarSize={14} />
          <Bar dataKey="cost" name="Actual cost" radius={[0, 4, 4, 0]} maxBarSize={14}>
            {data.map((d) => (
              <Cell key={d.e.id} fill={d.e.approved_budget && d.e.actual_cost > d.e.approved_budget ? OVER : "var(--chart-spend)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── By month ────────────────────────────────────────────────────────────────

export function MonthlyLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <LegendItem color="var(--chart-budget)" label="Approved budget" />
      <LegendItem color="var(--chart-spend)" label="Actual cost" />
      <LegendItem color="var(--series-3)" label="Navan travel" />
    </div>
  );
}

/** Budget, actual cost and Navan travel of the events starting each month */
export function MonthlyChart({ months, currency }: { months: OverviewMonth[]; currency: string }) {
  const data = months.map((m) => {
    const d = new Date(Number(m.month.slice(0, 4)), Number(m.month.slice(5, 7)) - 1, 1);
    return {
      ...m,
      label: d.toLocaleDateString(undefined, { month: "short", ...(months.length > 12 ? { year: "2-digit" } : {}) }),
      full: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    };
  });
  return (
    <div style={{ height: 240 }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis tickLine={false} axisLine={false} width={56} tick={AXIS} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !point) return null;
              return (
                <div className={TIP}>
                  <p className="mb-1 font-semibold">{point.full}</p>
                  <p className="flex justify-between gap-4">
                    <span>Approved budget</span>
                    <span className="font-medium tabular-nums">{fmtMoney(point.approved_budget, currency)}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Actual cost</span>
                    <span className="font-medium tabular-nums">{fmtMoney(point.actual_spend, currency)}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Navan travel</span>
                    <span className="font-medium tabular-nums">{fmtMoney(point.travel_cost, currency)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="approved_budget" name="Approved budget" fill="var(--chart-budget)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="actual_spend" name="Actual cost" fill="var(--chart-spend)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="travel_cost" name="Navan travel" fill="var(--series-3)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Who travelled ───────────────────────────────────────────────────────────

/** Travellers per event (the people on its Navan bookings) */
export function TravellersChart({ events }: { events: EventOverviewRow[] }) {
  const data = [...events]
    .filter((e) => e.navan.travellers > 0)
    .sort((a, b) => b.navan.travellers - a.navan.travellers)
    .slice(0, MAX_BARS)
    .map((e) => ({ e, name: shortName(e.name), travellers: e.navan.travellers }));
  return (
    <div style={{ height: chartHeight(data.length) }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false} tick={AXIS} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !point) return null;
              return (
                <div className={TIP}>
                  <p className="mb-1 font-semibold">{point.e.name}</p>
                  <p className="flex justify-between gap-4">
                    <span>People travelling</span>
                    <span className="font-medium tabular-nums">{fmtCount(point.e.navan.travellers)}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Bookings</span>
                    <span className="font-medium tabular-nums">{fmtCount(point.e.navan.bookings)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="travellers" name="People travelling" fill="var(--series-3)" radius={[0, 4, 4, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── HubSpot results ─────────────────────────────────────────────────────────

const RESULT_STEPS: Array<{ key: keyof EventTurnout; label: string }> = [
  { key: "registrants", label: "Registered" },
  { key: "attended", label: "Attended" },
  { key: "leads", label: "Leads" },
  { key: "new_contacts", label: "First-touch contacts" },
  { key: "influenced_contacts", label: "Influenced contacts" },
  { key: "mqls", label: "MQLs" },
  { key: "sqls", label: "SQLs" },
  { key: "opportunities", label: "Opportunities" },
  { key: "customers", label: "Customers" },
];

/** Whether there is any HubSpot result to chart */
export function hubspotResultsEmpty(totals: Partial<Record<keyof EventTurnout, number | null>>) {
  return RESULT_STEPS.every((s) => !totals[s.key]);
}

/** The HubSpot results of all matched events added up, from sign-up to customer; steps HubSpot knows nothing about are left out */
export function HubSpotResultsChart({ totals }: { totals: Partial<Record<keyof EventTurnout, number | null>> }) {
  const data = RESULT_STEPS.filter((s) => totals[s.key] !== null && totals[s.key] !== undefined).map((s) => ({ label: s.label, value: totals[s.key] ?? 0 }));
  return (
    <div style={{ height: chartHeight(data.length) }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barCategoryGap="26%">
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis type="category" dataKey="label" width={120} tickLine={false} axisLine={false} tick={AXIS} interval={0} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} formatter={(v) => fmtCount(Number(v))} />
          <Bar dataKey="value" name="HubSpot" fill="var(--chart-spend)" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
