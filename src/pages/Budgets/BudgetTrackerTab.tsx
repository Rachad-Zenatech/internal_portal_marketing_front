import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, CircleDashed, Download, Gauge, History, Landmark, PiggyBank, Plane, Plus, Receipt, Search, Wallet } from "lucide-react";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import DonutChart, { foldIntoOther } from "@/components/dashboard/DonutChart";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import KpiCard from "@/components/dashboard/KpiCard";
import { downloadCsv } from "@/components/dashboard/csv";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReferenceData } from "@/hooks/useReferenceData";
import type { BudgetPeriod, PeriodBudgetRow, UnbudgetedSpend } from "@/types/budgets";
import { formatMoney } from "../Initiatives/format";
import { BudgetActualChart, BudgetChartLegend, CumulativeSpendChart, type BudgetChartPoint } from "./BudgetCharts";
import { addMonths, ALL_CHANNELS, monthName, TBD_ALL } from "./budgetDisplay";
import { monthsBetween, periodMonths, periodName, type Period } from "./budgetPeriods";

const ANY = "ANY";
/** Filter value for TBD/All brand or All channels (null on the budget) */
const NONE = "none";
const PAGE_SIZE = 15;

// ─── Financial status ────────────────────────────────────────────────────────

export type FinancialStatus = "OVER_BUDGET" | "NEEDS_REVIEW" | "ON_TRACK" | "PENDING" | "CANCELLED";

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  OVER_BUDGET: "Over budget",
  NEEDS_REVIEW: "Needs review",
  ON_TRACK: "On track",
  PENDING: "Pending approval",
  CANCELLED: "Cancelled",
};

const FINANCIAL_STATUS_PILL: Record<FinancialStatus, string> = {
  OVER_BUDGET: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
  NEEDS_REVIEW: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  ON_TRACK: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  PENDING: "border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

const FINANCIAL_STATUS_HINT: Record<FinancialStatus, string> = {
  OVER_BUDGET: "More was spent than the budget has available.",
  NEEDS_REVIEW: "Spent plus committed costs are above what's available, or 90% or more is used.",
  ON_TRACK: "Within budget, including the costs committed so far.",
  PENDING: "Not committed yet: waiting for approval.",
  CANCELLED: "Cancelled: costs no longer count against it.",
};

export function financialStatus(b: PeriodBudgetRow): FinancialStatus {
  if (b.status === "CANCELLED") return "CANCELLED";
  if (b.status === "NOT_COMMITTED") return "PENDING";
  if (b.over_budget) return "OVER_BUDGET";
  if (b.spent + b.committed > b.available || (b.percent_used ?? 0) >= 90) return "NEEDS_REVIEW";
  return "ON_TRACK";
}

export function FinancialStatusPill({ b }: { b: PeriodBudgetRow }) {
  const s = financialStatus(b);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={`inline-flex cursor-default whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${FINANCIAL_STATUS_PILL[s]}`}>
          {FINANCIAL_STATUS_LABELS[s]}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">{FINANCIAL_STATUS_HINT[s]}</TooltipContent>
    </Tooltip>
  );
}

// ─── Small pieces ────────────────────────────────────────────────────────────

const INFO = {
  approved: "Approved budgets in the period (not the ones waiting for approval). Money moved between budgets is in Remaining.",
  actual: "Invoiced and paid costs that count against these budgets. Travel is kept outside marketing budgets.",
  committed: "Costs ordered or agreed but not invoiced yet. They'll become actual spend.",
  remaining: "Available (approved plus money moved in, minus money moved out) minus actual spend.",
  utilization: "Actual spend ÷ available budget.",
  prior: "Actual spend against the comparison period's budgets, with the same filters.",
};

/** Spent of available as a thin bar: amber from 90%, red when over */
function UtilizationBar({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-muted-foreground">-</span>;
  const tone = percent > 100 ? "bg-red-500" : percent >= 90 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <span className="flex items-center gap-2">
      <span className="w-9 text-right text-xs tabular-nums text-foreground">{Math.round(percent)}%</span>
      <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.min(Math.max(percent, 2), 100)}%` }} />
      </span>
    </span>
  );
}

function Change({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1 text-xs tabular-nums ${up ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`} title="Spend compared with the comparison period">
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(Math.round(pct))}%
    </span>
  );
}

const monthShort = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
const keyOf = (month: string, b: { brand_id: number | null; market_id: number; channel_id: number | null }) =>
  `${month}|${b.brand_id ?? "-"}|${b.market_id}|${b.channel_id ?? "-"}`;

type GroupBy = "month" | "brand" | "market" | "channel";
const GROUP_BY: { value: GroupBy; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "brand", label: "Brand" },
  { value: "market", label: "Region" },
  { value: "channel", label: "Channel" },
];
const groupName = (b: PeriodBudgetRow, by: GroupBy) =>
  by === "brand" ? (b.brand_name ?? TBD_ALL) : by === "market" ? b.market_name : by === "channel" ? (b.channel_name ?? ALL_CHANNELS) : monthName(b.month.slice(0, 7));

// ─── Tab ─────────────────────────────────────────────────────────────────────

interface BudgetTrackerTabProps {
  period: Period;
  compare: Period | null;
  data: BudgetPeriod | undefined;
  compareData: BudgetPeriod | undefined;
  loading: boolean;
  canEdit: boolean;
  onOpenBudget: (id: string) => void;
  onAddFor: (u: UnbudgetedSpend) => void;
}

/**
 * The main view: what was approved, spent and committed in the period, how it compares, where it went, and every
 * budget allocation with its status. Filters (in the URL) apply to the figures, the charts and the table.
 */
export default function BudgetTrackerTab({ period, compare, data, compareData, loading, canEdit, onOpenBudget, onAddFor }: BudgetTrackerTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reference } = useReferenceData();
  const [page, setPage] = useState(0);
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setPage(0);
  };
  const filterKeys = ["brand", "market", "channel", "fstatus", "q", "currency"];
  const filtered = filterKeys.some((k) => searchParams.get(k));
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    filterKeys.forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };
  const brand = searchParams.get("brand") ?? "";
  const market = searchParams.get("market") ?? "";
  const channel = searchParams.get("channel") ?? "";
  const fstatus = (searchParams.get("fstatus") ?? "") as FinancialStatus | "";
  const query = searchParams.get("q") ?? "";
  const groupBy = (GROUP_BY.some((g) => g.value === searchParams.get("by")) ? searchParams.get("by") : "month") as GroupBy;

  // Money is never added across currencies: one currency at a time, the biggest first
  const currencies = useMemo(() => [...(data?.totals ?? [])].sort((a, b) => b.available - a.available).map((t) => t.currency), [data]);
  const currencyParam = searchParams.get("currency") ?? "";
  const currency = currencies.includes(currencyParam) ? currencyParam : (currencies[0] ?? "USD");
  const money = (n: number) => formatMoney(n, currency);

  const matchId = (filter: string, id: number | null) => !filter || (filter === NONE ? id === null : String(id) === filter);
  const matches = (b: PeriodBudgetRow) => b.currency === currency && matchId(brand, b.brand_id) && matchId(market, b.market_id) && matchId(channel, b.channel_id);
  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      (data?.budgets ?? [])
        .filter(matches)
        .filter((b) => !fstatus || financialStatus(b) === fstatus)
        .filter((b) => !q || [b.brand_name ?? TBD_ALL, b.market_name, b.channel_name ?? ALL_CHANNELS].some((s) => s.toLowerCase().includes(q))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, currency, brand, market, channel, fstatus, q],
  );
  const compareRows = useMemo(() => (compareData?.budgets ?? []).filter(matches), [compareData, currency, brand, market, channel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each budget's counterpart in the comparison period: same brand, market and channel, the same distance into the period
  const shift = compare ? monthsBetween(compare, period) : 0;
  const compareSpent = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of compareRows) {
      if (b.status === "CANCELLED") continue;
      const key = keyOf(addMonths(b.month.slice(0, 7), shift), b);
      map.set(key, (map.get(key) ?? 0) + b.spent);
    }
    return map;
  }, [compareRows, shift]);
  const priorFor = (b: PeriodBudgetRow) => (compare ? (compareSpent.get(keyOf(b.month.slice(0, 7), b)) ?? null) : null);

  // ─── Key figures, from the approved budgets that match the filters ───
  const approved = rows.filter((b) => b.status === "APPROVED");
  const pending = rows.filter((b) => b.status === "NOT_COMMITTED");
  const sum = (list: PeriodBudgetRow[], pick: (b: PeriodBudgetRow) => number) => list.reduce((s, b) => s + pick(b), 0);
  const totals = {
    amount: sum(approved, (b) => b.amount),
    available: sum(approved, (b) => b.available),
    spent: sum(approved, (b) => b.spent),
    committed: sum(approved, (b) => b.committed),
  };
  const remaining = totals.available - totals.spent;
  const utilization = totals.available > 0 ? (totals.spent / totals.available) * 100 : null;
  const compareApproved = compareRows.filter((b) => b.status === "APPROVED");
  const prior = compare ? sum(compareApproved, (b) => b.spent) : null;
  const priorAmount = compare ? sum(compareApproved, (b) => b.amount) : null;

  // ─── Charts ───
  const months = periodMonths(period);
  const chartData: BudgetChartPoint[] = months.map((key) => {
    const inMonth = approved.filter((b) => b.month.startsWith(key));
    const before = compareApproved.filter((b) => b.month.startsWith(addMonths(key, -shift)));
    return {
      key,
      label: new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: "short" }),
      fullLabel: monthName(key),
      budget: sum(inMonth, (b) => b.available),
      actual: sum(inMonth, (b) => b.spent),
      compare: compare ? sum(before, (b) => b.spent) : null,
    };
  });
  const chartEmpty = chartData.every((p) => !p.budget && !p.actual && !p.compare);
  const compareText = compare ? periodName(compare) : null;
  const donutItems = foldIntoOther(
    (data?.channels ?? []).filter((c) => c.currency === currency && c.spent > 0).map((c) => ({ key: c.channel_name, label: c.channel_name, value: c.spent })),
    6,
  );
  const channelTotal = donutItems.reduce((s, i) => s + i.value, 0);

  // ─── Table ───
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        groupBy === "month"
          ? a.month.localeCompare(b.month) || a.market_name.localeCompare(b.market_name)
          : groupName(a, groupBy).localeCompare(groupName(b, groupBy)) || a.month.localeCompare(b.month),
      ),
    [rows, groupBy],
  );
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = sorted.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const groupTotals = useMemo(() => {
    const map = new Map<string, { available: number; spent: number; count: number }>();
    for (const b of sorted) {
      if (b.status !== "APPROVED") continue;
      const g = map.get(groupName(b, groupBy)) ?? { available: 0, spent: 0, count: 0 };
      map.set(groupName(b, groupBy), { available: g.available + b.available, spent: g.spent + b.spent, count: g.count + 1 });
    }
    return map;
  }, [sorted, groupBy]);

  const exportCsv = () =>
    downloadCsv(
      `budget-allocations-${period.key}.csv`,
      ["Month", "Brand", "Region", "Channel", "Currency", "Approved budget", "Moved in", "Moved out", "Available", "Actual spend", "Committed", "Remaining", "Utilization %", compareText ? `Spend ${compareText}` : "Comparison", "Status"],
      sorted.map((b) => [
        b.month.slice(0, 7),
        b.brand_name ?? TBD_ALL,
        b.market_name,
        b.channel_name ?? ALL_CHANNELS,
        b.currency,
        b.amount,
        b.moved_in,
        b.moved_out,
        b.available,
        b.spent,
        b.committed,
        b.remaining,
        b.percent_used,
        priorFor(b),
        FINANCIAL_STATUS_LABELS[financialStatus(b)],
      ]),
    );

  const idOptions = (items: { id: number; name: string }[] | undefined, all: string, none?: string) => [
    { value: ANY, label: all },
    ...(none ? [{ value: NONE, label: none }] : []),
    ...(items ?? []).map((i) => ({ value: String(i.id), label: i.name })),
  ];
  const unbudgeted = (data?.unbudgeted ?? []).filter((u) => u.currency === currency);
  const outside = data?.outside_budget.find((o) => o.currency === currency);
  const cell = "px-3 py-2.5 align-middle";

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* 1. Key figures */}
      <div className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6 ${loading ? "opacity-60" : ""}`}>
        <KpiCard
          label="Approved budget"
          icon={Landmark}
          tone="blue"
          info={INFO.approved}
          value={money(totals.amount)}
          loading={loading}
          change={priorAmount !== null ? { current: totals.amount, previous: priorAmount } : undefined}
          changeLabel={compareText ? `vs. ${compareText}` : undefined}
          hint={pending.length ? `+ ${money(sum(pending, (b) => b.amount))} pending approval` : `${approved.length} ${approved.length === 1 ? "budget" : "budgets"}`}
        />
        <KpiCard
          label="Actual spend"
          icon={Receipt}
          tone="violet"
          info={INFO.actual}
          value={money(totals.spent)}
          loading={loading}
          goodWhen="down"
          change={prior !== null ? { current: totals.spent, previous: prior } : undefined}
          changeLabel={compareText ? `vs. ${compareText}` : undefined}
        />
        <KpiCard label="Committed costs" icon={CircleDashed} tone="amber" info={INFO.committed} value={money(totals.committed)} loading={loading} hint="Not yet invoiced or paid" />
        <KpiCard
          label="Remaining budget"
          icon={PiggyBank}
          tone="green"
          info={INFO.remaining}
          value={money(remaining)}
          valueClassName={remaining < 0 ? "text-red-600 dark:text-red-400" : undefined}
          loading={loading}
          hint={totals.available > 0 ? `${Math.max(0, Math.round((remaining / totals.available) * 100))}% left · ${money(remaining - totals.committed)} after commitments` : "No approved budget"}
        />
        <KpiCard
          label="Budget utilization"
          icon={Gauge}
          tone="sky"
          info={INFO.utilization}
          value={utilization === null ? "-" : `${Math.round(utilization)}%`}
          valueClassName={utilization !== null && utilization > 100 ? "text-red-600 dark:text-red-400" : undefined}
          loading={loading}
          hint={
            <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              <span
                className={`block h-full rounded-full ${utilization !== null && utilization > 100 ? "bg-red-500" : utilization !== null && utilization >= 90 ? "bg-amber-500" : "bg-(--chart-spend,#1d4ed8)"}`}
                style={{ width: `${Math.min(utilization ?? 0, 100)}%` }}
              />
            </span>
          }
        />
        <KpiCard
          label={!compare || monthsBetween(compare, period) === 12 ? "Prior-year spend" : "Previous period spend"}
          icon={History}
          tone="slate"
          info={INFO.prior}
          value={prior === null ? "-" : money(prior)}
          loading={loading}
          hint={compare ? periodName(compare) : "Choose a comparison above"}
        />
      </div>

      {/* 2. Budget against actual over time, where the money went, and the running total */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <ChartCard title={compareText ? `Budget vs actual vs ${compareText}` : "Budget vs actual"} subtitle={`By month · ${periodName(period)}, ${currency}`} action={<BudgetChartLegend compareLabel={compareText} />}>
          {loading ? <Skeleton className="h-[240px] w-full rounded-lg" /> : chartEmpty ? <ChartEmpty text="No budgets or spend in this period." height={240} /> : <BudgetActualChart data={chartData} currency={currency} compareLabel={compareText} />}
        </ChartCard>
        <ChartCard
          title="Spending by channel"
          subtitle={`${money(channelTotal)} actual spend · ${currency}`}
          info="All marketing spend in the period by the initiative's channel, with or without a budget. Travel is left out, as it's outside marketing budgets."
        >
          {loading ? <Skeleton className="h-[180px] w-full rounded-lg" /> : donutItems.length === 0 ? <ChartEmpty text="No spend in this period." height={180} /> : <DonutChart items={donutItems} currency={currency} totalLabel="Total spend" />}
        </ChartCard>
        <ChartCard title="Cumulative spending" subtitle={`Running totals · ${periodName(period)}`} action={<BudgetChartLegend compareLabel={compareText} cumulative />}>
          {loading ? <Skeleton className="h-[240px] w-full rounded-lg" /> : chartEmpty ? <ChartEmpty text="No budgets or spend in this period." height={240} /> : <CumulativeSpendChart data={chartData} currency={currency} compareLabel={compareText} />}
        </ChartCard>
      </div>

      {/* 3. Filters */}
      <FilterBar onClear={filtered ? clearFilters : undefined}>
        <div className="relative min-w-0 sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setParam("q", e.target.value || null)} placeholder="Search brand, region or channel" aria-label="Search budgets" className="h-9 pl-8" />
        </div>
        <FilterSelect label="Brand" value={brand || ANY} onChange={(v) => setParam("brand", v === ANY ? null : v)} options={idOptions(reference?.brands.filter((b) => b.code !== "TBD_ALL"), "All brands", TBD_ALL)} />
        <FilterSelect label="Region" value={market || ANY} onChange={(v) => setParam("market", v === ANY ? null : v)} options={idOptions(reference?.markets, "All regions")} />
        <FilterSelect label="Channel" value={channel || ANY} onChange={(v) => setParam("channel", v === ANY ? null : v)} options={idOptions(reference?.channels, "All channels", ALL_CHANNELS)} />
        <FilterSelect
          label="Status"
          value={fstatus || ANY}
          onChange={(v) => setParam("fstatus", v === ANY ? null : v)}
          options={[{ value: ANY, label: "All statuses" }, ...(Object.keys(FINANCIAL_STATUS_LABELS) as FinancialStatus[]).map((s) => ({ value: s, label: FINANCIAL_STATUS_LABELS[s] }))]}
        />
        {currencies.length > 1 && <FilterSelect label="Currency" value={currency} onChange={(v) => setParam("currency", v === currencies[0] ? null : v)} options={currencies.map((c) => ({ value: c, label: c }))} />}
      </FilterBar>

      {/* 4. Every allocation */}
      <section className={`${DASH_CARD} min-w-0 overflow-hidden`} aria-labelledby="allocations-title">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="allocations-title" className="text-base font-semibold text-foreground">
            Budget allocations <span className="text-sm font-normal text-muted-foreground">({rows.length} {rows.length === 1 ? "result" : "results"})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5 text-sm" role="group" aria-label="View by">
              {GROUP_BY.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={groupBy === g.value}
                  onClick={() => setParam("by", g.value === "month" ? null : g.value)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${groupBy === g.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <Button variant="outline" className="h-9 gap-2" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        {loading ? (
          <Skeleton className="m-4 h-60" />
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{filtered ? "No budgets match these filters." : `No ${currency} budgets in ${periodName(period)}.`}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    {["Month", "Brand", "Region", "Channel"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium">
                        {h}
                      </th>
                    ))}
                    {["Approved budget", "Actual spend", "Committed", "Remaining"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left font-medium">Utilization</th>
                    <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{compareText ?? "Comparison"}</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageRows.map((b, i) => {
                    const group = groupName(b, groupBy);
                    const newGroup = groupBy !== "month" && (i === 0 || groupName(pageRows[i - 1], groupBy) !== group);
                    const g = groupTotals.get(group);
                    const prior = priorFor(b);
                    return [
                      newGroup && (
                        <tr key={`g-${group}`} className="bg-muted/40">
                          <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-foreground">
                            {group}
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-muted-foreground">{g ? money(g.available) : ""}</td>
                          <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-muted-foreground">{g ? money(g.spent) : ""}</td>
                          <td colSpan={5} className="px-3 py-2 text-xs text-muted-foreground">
                            {g ? `${g.count} approved ${g.count === 1 ? "budget" : "budgets"}` : ""}
                          </td>
                        </tr>
                      ),
                      <tr key={b.id} onClick={() => onOpenBudget(b.id)} className="cursor-pointer transition-colors hover:bg-muted/40">
                        <td className={`${cell} whitespace-nowrap text-foreground`}>{monthShort(b.month.slice(0, 7))}</td>
                        <td className={`${cell} text-foreground`}>{b.brand_name ?? <span className="text-muted-foreground">{TBD_ALL}</span>}</td>
                        <td className={`${cell} text-foreground`}>{b.market_name}</td>
                        <td className={`${cell} text-foreground`}>{b.channel_name ?? <span className="text-muted-foreground">{ALL_CHANNELS}</span>}</td>
                        <td className={`${cell} text-right tabular-nums text-foreground`} title={b.moved_in || b.moved_out ? `Approved ${formatMoney(b.amount, b.currency)}, available ${formatMoney(b.available, b.currency)}` : undefined}>
                          {formatMoney(b.amount, b.currency)}
                          {(b.moved_in > 0 || b.moved_out > 0) && <span className="block text-xs text-muted-foreground">{formatMoney(b.available, b.currency)} available</span>}
                        </td>
                        <td className={`${cell} text-right font-medium tabular-nums text-foreground`}>{formatMoney(b.spent, b.currency)}</td>
                        <td className={`${cell} text-right tabular-nums text-muted-foreground`}>{b.committed ? formatMoney(b.committed, b.currency) : "-"}</td>
                        <td className={`${cell} text-right tabular-nums ${b.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{formatMoney(b.remaining, b.currency)}</td>
                        <td className={cell}>
                          <UtilizationBar percent={b.status === "APPROVED" ? b.percent_used : null} />
                        </td>
                        <td className={`${cell} text-right tabular-nums text-foreground`}>
                          {prior === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              {formatMoney(prior, b.currency)}
                              <Change current={b.spent} previous={prior} />
                            </span>
                          )}
                        </td>
                        <td className={cell}>
                          <FinancialStatusPill b={b} />
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                Showing {current * PAGE_SIZE + 1}-{Math.min((current + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}. Open a budget to see its costs, money moves and notes.
              </span>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
                    <ChevronLeft />
                  </Button>
                  <span className="px-2 tabular-nums">
                    {current + 1} / {pages}
                  </span>
                  <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* 5. What isn't in the budgets */}
      {(unbudgeted.length > 0 || (outside && outside.expected > 0)) && (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          {unbudgeted.length > 0 && (
            <section className={`${DASH_CARD} flex flex-col gap-3 p-4`} aria-labelledby="unbudgeted-title">
              <div>
                <h2 id="unbudgeted-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Wallet className="h-4 w-4 text-amber-600" />
                  Spend without a budget
                </h2>
                <p className="text-xs text-muted-foreground">Costs in {periodName(period)} that no budget covers. Add a budget, or check the initiative's market.</p>
              </div>
              <ul className="divide-y divide-border">
                {unbudgeted.map((u) => (
                  <li key={`${u.brand_id}-${u.market_id}-${u.channel_id}-${u.currency}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {u.brand_name} · {u.market_name} · {u.channel_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMoney(u.spent, u.currency)} spent · {formatMoney(u.expected, u.currency)} expected · {u.initiative_count} {u.initiative_count === 1 ? "initiative" : "initiatives"}
                      </span>
                    </span>
                    {canEdit && (
                      <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => onAddFor(u)}>
                        <Plus className="h-3.5 w-3.5" />
                        Add budget
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {outside && outside.expected > 0 && (
            <section className={`${DASH_CARD} flex flex-col gap-1 p-4`} aria-labelledby="outside-title">
              <h2 id="outside-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Plane className="h-4 w-4 text-muted-foreground" />
                Travel, outside marketing budgets
              </h2>
              <p className="text-sm text-foreground">
                <span className="font-semibold tabular-nums">{formatMoney(outside.spent, outside.currency)}</span> spent ·{" "}
                {formatMoney(outside.expected, outside.currency)} expected across {outside.initiative_count} {outside.initiative_count === 1 ? "event" : "events"}
              </p>
              <p className="text-xs text-muted-foreground">
                Flights, hotels, ground transport and per diems (including Navan). They count toward each event's cost and ROI, not against these budgets.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
