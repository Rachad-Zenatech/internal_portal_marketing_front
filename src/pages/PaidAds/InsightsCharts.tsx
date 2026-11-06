// Charts and the cut/fund summary for the Insights tab of the Paid Advertising page. Need CHART_VARS on a wrapper
// (ChartCard has it).
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LegendItem } from "@/components/dashboard/ChartCard";
import { compactMoney, DASH_CARD } from "@/components/dashboard/tones";
import type { AdsCampaignRow, AdsKpis, AdsVerdict } from "@/types/ads";
import { fmtCount, fmtMoney, fmtUnitCost, fmtWholeMoney } from "./adsDisplay";
import { VERDICT_LABELS, VerdictPill } from "./AdsPieces";

const TIP = "min-w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md";
const VERDICT_FILL: Record<AdsVerdict, string> = { CUT: "#dc2626", FUND: "#16a34a", WATCH: "#d97706" };
const NO_VERDICT_FILL = "#94a3b8";
const MAX_BARS = 10;
const ROW_HEIGHT = 34;

const shortName = (name: string) => (name.length > 30 ? `${name.slice(0, 29)}…` : name);
const chartHeight = (rows: number) => Math.max(180, rows * ROW_HEIGHT + 24);

// ─── Spend against budget, per campaign ──────────────────────────────────────

export function CampaignBudgetLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <LegendItem color="var(--chart-budget)" label="Campaign budget" />
      <LegendItem color="var(--chart-spend)" label="Spent to date" />
      <LegendItem color="#dc2626" label="Over budget" />
    </div>
  );
}

/** Each campaign's budget and what it has spent since it started; the spend bar turns red once it's over */
export function CampaignBudgetChart({ campaigns }: { campaigns: AdsCampaignRow[] }) {
  const data = [...campaigns]
    .filter((c) => c.spend_to_date || c.budget_amount)
    .sort((a, b) => (b.spend_to_date ?? 0) - (a.spend_to_date ?? 0))
    .slice(0, MAX_BARS)
    .map((c) => ({ c, name: shortName(c.name), budget: c.budget_amount ?? 0, spend: c.spend_to_date ?? 0 }));
  return (
    <div style={{ height: chartHeight(data.length) }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v: number) => compactMoney(v, data[0]?.c.currency ?? "USD")} />
          <YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !point) return null;
              const used = point.c.budget_used_percent;
              return (
                <div className={TIP}>
                  <p className="mb-1 font-semibold">{point.c.name}</p>
                  <p className="flex justify-between gap-4">
                    <span>Budget</span>
                    <span className="font-medium tabular-nums">{point.c.budget_amount ? fmtMoney(point.c.budget_amount, point.c.currency) : "Not set"}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Spent</span>
                    <span className="font-medium tabular-nums">{fmtMoney(point.c.spend_to_date, point.c.currency)}</span>
                  </p>
                  {used !== null && <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{Math.round(used)}% of budget used</p>}
                </div>
              );
            }}
          />
          <Bar dataKey="budget" name="Campaign budget" fill="var(--chart-budget)" radius={[0, 4, 4, 0]} maxBarSize={14} />
          <Bar dataKey="spend" name="Spent to date" radius={[0, 4, 4, 0]} maxBarSize={14}>
            {data.map((d) => (
              <Cell key={d.c.initiative_id} fill={d.c.budget_used_percent !== null && d.c.budget_used_percent > 100 ? "#dc2626" : "var(--chart-spend)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Cost per lead, per campaign ─────────────────────────────────────────────

export function CostPerLeadLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {(Object.keys(VERDICT_FILL) as AdsVerdict[]).map((v) => (
        <LegendItem key={v} color={VERDICT_FILL[v]} label={VERDICT_LABELS[v]} />
      ))}
    </div>
  );
}

/** Cost per lead for each campaign that has leads, coloured by cut / fund / watch, against the median */
export function CostPerLeadChart({ campaigns, currency }: { campaigns: AdsCampaignRow[]; currency: string }) {
  const withLeads = campaigns.filter((c) => c.cpl !== null && c.cpl > 0);
  const data = [...withLeads]
    .sort((a, b) => (a.cpl ?? 0) - (b.cpl ?? 0))
    .slice(0, MAX_BARS)
    .map((c) => ({ c, name: shortName(c.name), cpl: c.cpl ?? 0 }));
  const sorted = withLeads.map((c) => c.cpl ?? 0).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length === 0 ? null : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return (
    <div style={{ height: chartHeight(data.length) }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !point) return null;
              return (
                <div className={TIP}>
                  <p className="mb-1 font-semibold">{point.c.name}</p>
                  <p className="flex justify-between gap-4">
                    <span>Cost per lead</span>
                    <span className="font-medium tabular-nums">{fmtUnitCost(point.c.cpl, point.c.currency)}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Leads</span>
                    <span className="font-medium tabular-nums">{fmtCount(point.c.verified_leads)}</span>
                  </p>
                  {point.c.verdict_reason && <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{point.c.verdict_reason}</p>}
                </div>
              );
            }}
          />
          {median !== null && <ReferenceLine x={median} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "median", position: "top", fontSize: 11, fill: "currentColor" }} />}
          <Bar dataKey="cpl" name="Cost per lead" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((d) => (
              <Cell key={d.c.initiative_id} fill={d.c.verdict ? VERDICT_FILL[d.c.verdict] : NO_VERDICT_FILL} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── HubSpot funnel ──────────────────────────────────────────────────────────

/** New contacts, MQLs and SQLs from HubSpot, added up over the campaigns shown */
export function FunnelChart({ kpis }: { kpis: AdsKpis | undefined }) {
  const data = [
    { stage: "New contacts", value: kpis?.verified_leads ?? 0, fill: "var(--series-3)" },
    { stage: "MQLs", value: kpis?.mqls ?? 0, fill: "var(--chart-spend)" },
    { stage: "SQLs", value: kpis?.sqls ?? 0, fill: "var(--chart-budget)" },
  ];
  return (
    <div style={{ height: 180 }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} />
          <YAxis type="category" dataKey="stage" width={90} tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} formatter={(v) => fmtCount(Number(v))} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((d) => (
              <Cell key={d.stage} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Cut / fund summary ──────────────────────────────────────────────────────

const VERDICT_TILE: Record<AdsVerdict, { tone: string; hint: string }> = {
  CUT: { tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300", hint: "Spending without results, or far above the typical cost per lead" },
  FUND: { tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300", hint: "Cheaper leads than most, and within budget" },
  WATCH: { tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300", hint: "Close to typical, or too early to tell" },
};

/** How many campaigns to cut, fund or watch and the spend behind each, with the ones to cut listed */
export function VerdictSummary({ campaigns, currency, onOpen }: { campaigns: AdsCampaignRow[]; currency: string; onOpen: (id: string) => void }) {
  const groups = (Object.keys(VERDICT_TILE) as AdsVerdict[]).map((v) => {
    const rows = campaigns.filter((c) => c.verdict === v);
    return { v, rows, spend: rows.reduce((sum, c) => sum + (c.spend_to_date ?? 0), 0) };
  });
  const flagged = groups.filter((g) => g.v !== "WATCH").flatMap((g) => g.rows);
  return (
    <section className={`${DASH_CARD} flex min-w-0 flex-col gap-4 p-4`} aria-label="Cut or fund">
      <div>
        <h2 className="text-base font-semibold text-foreground">Cut or Fund</h2>
        <p className="text-xs text-muted-foreground">Cost per lead against the other campaigns, and how much of the budget is used. Spend is since each campaign started.</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {groups.map(({ v, rows, spend }) => (
          <div key={v} className={`rounded-lg border p-3 ${VERDICT_TILE[v].tone}`} title={VERDICT_TILE[v].hint}>
            <p className="text-xs font-medium">{VERDICT_LABELS[v]}</p>
            <p className="text-2xl font-semibold tabular-nums">{rows.length}</p>
            <p className="text-xs opacity-80">{fmtWholeMoney(spend, currency)} spent</p>
          </div>
        ))}
      </div>
      {flagged.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {flagged.map((c) => (
            <li key={c.initiative_id}>
              <button type="button" onClick={() => onOpen(c.initiative_id)} className="flex w-full items-start gap-3 py-2 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <VerdictPill verdict={c.verdict} reason={c.verdict_reason} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.verdict_reason}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
