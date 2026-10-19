import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, CircleAlert, CircleDashed, Copy, Landmark, Loader2, MessageSquare, PiggyBank, Plane, Plus, Receipt, TriangleAlert, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import BudgetSpendChart, { BudgetSpendLegend, type BudgetSpendPoint } from "@/components/dashboard/BudgetSpendChart";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DonutChart, { foldIntoOther } from "@/components/dashboard/DonutChart";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import InfoTip from "@/components/dashboard/InfoTip";
import InsightCard from "@/components/dashboard/InsightCard";
import KpiCard, { KpiGrid } from "@/components/dashboard/KpiCard";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetMonths, useCopyBudgets } from "@/hooks/useBudgets";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { BudgetMonth, BudgetRow, BudgetStatus, UnbudgetedSpend } from "@/types/budgets";
import { formatMoney } from "../Initiatives/format";
import BudgetDetailSheet from "./BudgetDetailSheet";
import BudgetFormDialog, { type BudgetPreset } from "./BudgetFormDialog";
import BudgetsUpload from "./BudgetsUpload";
import EventsBudgetSection from "./EventsBudgetSection";
import BudgetWeekView, { monthOfWeek, parseWeekKey, weekForMonth, WeekSwitcher } from "./BudgetWeekView";
import NotesThread from "./NotesThread";
import {
  addMonths,
  ALL_CHANNELS,
  BUDGET_STATUS_LABELS,
  BUDGET_STATUSES,
  budgetLabel,
  marketTone,
  monthName,
  monthOnly,
  movedIn,
  movedOut,
  parseMonthKey,
  PROGRESS_DOT,
  PROGRESS_LABELS,
  STATUS_PILL,
  TBD_ALL,
  thisMonthKey,
  toApiMonth,
  usageTone,
} from "./budgetDisplay";

const ANY = "ANY";
/** Filter value for "TBD/All" brand or "All channels" (null on the budget) */
const NONE = "none";

const INFO = {
  available: "Approved amount, plus money moved in, minus money moved out. Cancelled budgets aren't counted.",
  spent: "Invoiced and paid costs that count against these budgets.",
  remaining: "Available minus spent. Red means more was spent than is available.",
  over: "Budgets that have spent more than they have available.",
  notCommitted: "Budgets that aren't approved yet, e.g. copied from last month.",
  unbudgeted: "Costs this month that don't match any budget.",
  outside:
    "Flights, hotels, ground transport, per diems and costs from the travel system and Navan. They're an operating expense, so they don't count against marketing budgets. They still count toward each event's total cost and ROI.",
};

type Compare = "month" | "year";

// ─── Small pieces ────────────────────────────────────────────────────────────

/** Spent figure with a bar: green while there's room, amber from 90%, red when over */
function SpentBar({ b, className = "" }: { b: BudgetRow; className?: string }) {
  const tone = usageTone(b.percent_used, b.over_budget);
  const percent = b.percent_used ?? (b.spent > 0 ? 100 : 0);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium tabular-nums text-foreground">{formatMoney(b.spent, b.currency)}</span>
        {b.percent_used !== null && <span className={`text-xs font-medium tabular-nums ${tone.text}`}>{Math.round(b.percent_used)}%</span>}
      </div>
      <span
        className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted"
        title={b.percent_used === null ? undefined : `${Math.round(b.percent_used)}% of the available budget spent`}
      >
        <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(Math.max(percent, b.spent > 0 ? 3 : 0), 100)}%` }} />
      </span>
    </div>
  );
}

function StatusLabel({ b }: { b: BudgetRow }) {
  return (
    <div className="flex flex-col items-start gap-1 text-xs">
      <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-medium ${STATUS_PILL[b.status]}`}>{BUDGET_STATUS_LABELS[b.status]}</span>
      {b.status === "APPROVED" && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PROGRESS_DOT[b.progress]}`} />
          {PROGRESS_LABELS[b.progress]}
        </span>
      )}
    </div>
  );
}

function NotesCount({ b }: { b: BudgetRow }) {
  if (!b.comment_count) return <span className="text-xs text-muted-foreground/50">-</span>;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-medium tabular-nums text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
      title={`${b.comment_count} ${b.comment_count === 1 ? "note" : "notes"}`}
    >
      <MessageSquare className="h-3 w-3" />
      {b.comment_count}
    </span>
  );
}

/** "Approved $5,000 · Moved in +$1,000" for a tooltip on the Available figure */
function availableTitle(b: BudgetRow) {
  const parts = [`Approved ${formatMoney(b.amount, b.currency)}`];
  if (b.moved_in > 0) parts.push(`Moved in ${movedIn(b)}`);
  if (b.moved_out > 0) parts.push(`Moved out ${movedOut(b)}`);
  return parts.join(" · ");
}

// ─── Month switcher and Month / Week ─────────────────────────────────────────

function MonthSwitcher({ monthKey, onChange }: { monthKey: string; onChange: (key: string) => void }) {
  const current = thisMonthKey();
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-xs" role="group" aria-label="Month">
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(addMonths(monthKey, -1))} aria-label={`Previous month, ${monthName(addMonths(monthKey, -1))}`}>
          <ChevronLeft />
        </Button>
        <span className="min-w-36 px-2 text-center text-sm font-medium text-foreground" aria-live="polite">
          {monthName(monthKey)}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(addMonths(monthKey, 1))} aria-label={`Next month, ${monthName(addMonths(monthKey, 1))}`}>
          <ChevronRight />
        </Button>
      </div>
      {monthKey !== current && (
        <Button variant="outline" size="sm" className="h-9 bg-card" onClick={() => onChange(current)}>
          This month
        </Button>
      )}
    </div>
  );
}

type View = "month" | "week";

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5" role="group" aria-label="View">
      {(["month", "week"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          {v === "month" ? "Month" : "Week"}
        </button>
      ))}
    </div>
  );
}

// ─── Budget list, grouped by market ──────────────────────────────────────────

interface MarketGroup {
  marketId: number;
  marketName: string;
  budgets: BudgetRow[];
}

function groupByMarket(budgets: BudgetRow[]): MarketGroup[] {
  const groups: MarketGroup[] = [];
  for (const b of budgets) {
    const last = groups[groups.length - 1];
    if (last && last.marketId === b.market_id) last.budgets.push(b);
    else groups.push({ marketId: b.market_id, marketName: b.market_name, budgets: [b] });
  }
  return groups;
}

/** "$25,000 available · $19,800 spent", per currency, for a market's header */
function groupTotals(budgets: BudgetRow[]) {
  const byCurrency = new Map<string, { available: number; spent: number; remaining: number }>();
  for (const b of budgets) {
    if (b.status === "CANCELLED") continue;
    const t = byCurrency.get(b.currency) ?? { available: 0, spent: 0, remaining: 0 };
    t.available += b.available;
    t.spent += b.spent;
    t.remaining += b.remaining;
    byCurrency.set(b.currency, t);
  }
  return [...byCurrency.entries()].map(([currency, t]) => ({ currency, ...t }));
}

function MarketHeading({ group }: { group: MarketGroup }) {
  const tone = marketTone(group.marketId, group.marketName);
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
        {group.marketName}
        <span className="font-normal text-muted-foreground">
          {group.budgets.length} {group.budgets.length === 1 ? "budget" : "budgets"}
        </span>
      </p>
      <p className="flex flex-wrap gap-x-3 text-xs tabular-nums text-muted-foreground">
        {groupTotals(group.budgets).map((t) => (
          <span key={t.currency}>
            {formatMoney(t.available, t.currency)} available · {formatMoney(t.spent, t.currency)} spent ·{" "}
            <span className={t.remaining < 0 ? "font-medium text-red-600 dark:text-red-400" : "font-medium text-emerald-700 dark:text-emerald-400"}>
              {formatMoney(Math.abs(t.remaining), t.currency)} {t.remaining < 0 ? "over" : "left"}
            </span>
          </span>
        ))}
      </p>
    </div>
  );
}

const rowTint = (b: BudgetRow) =>
  b.status === "CANCELLED"
    ? "opacity-60 hover:bg-muted/40"
    : b.over_budget
      ? "bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
      : "hover:bg-muted/40";

function BudgetTable({ groups, onOpen }: { groups: MarketGroup[]; onOpen: (id: string) => void }) {
  const head = "px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap";
  const cell = "px-3 py-3 align-middle";
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className={head}>Brand</th>
            <th className={head}>Channel</th>
            <th className={`${head} text-right`}>
              <span className="inline-flex flex-row-reverse items-center gap-1">
                Available
                <InfoTip text={INFO.available} label="Available" />
              </span>
            </th>
            <th className={`${head} w-44`}>Spent</th>
            <th className={`${head} text-right`}>Remaining</th>
            <th className={head}>Status</th>
            <th className={head}>
              <span className="sr-only">Notes</span>
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.marketId} className="divide-y divide-border border-b border-border last:border-b-0">
            <tr className="bg-muted/20">
              <td colSpan={7} className="px-3 py-2">
                <MarketHeading group={group} />
              </td>
            </tr>
            {group.budgets.map((b) => (
              <tr key={b.id} onClick={() => onOpen(b.id)} className={`cursor-pointer transition-colors ${rowTint(b)}`}>
                <td className={cell}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(b.id);
                    }}
                    className="text-left font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {b.brand_name ?? TBD_ALL}
                  </button>
                  {b.over_budget && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                      <TriangleAlert className="h-3 w-3" />
                      Over budget
                    </span>
                  )}
                </td>
                <td className={`${cell} ${b.channel_name ? "text-foreground" : "text-muted-foreground"}`}>{b.channel_name ?? ALL_CHANNELS}</td>
                <td className={`${cell} text-right tabular-nums text-foreground`} title={availableTitle(b)}>
                  {formatMoney(b.available, b.currency)}
                </td>
                <td className={cell}>
                  <SpentBar b={b} />
                </td>
                <td className={`${cell} text-right font-semibold tabular-nums ${b.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {formatMoney(b.remaining, b.currency)}
                </td>
                <td className={cell}>
                  <StatusLabel b={b} />
                </td>
                <td className={cell}>
                  <NotesCount b={b} />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function BudgetCards({ groups, onOpen }: { groups: MarketGroup[]; onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-col divide-y divide-border lg:hidden">
      {groups.map((group) => (
        <section key={group.marketId} className="flex flex-col gap-2 p-3" aria-label={group.marketName}>
          <MarketHeading group={group} />
          {group.budgets.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onOpen(b.id)}
              className={`flex w-full flex-col gap-2.5 rounded-lg border border-border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${rowTint(b)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{b.brand_name ?? TBD_ALL}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.channel_name ?? ALL_CHANNELS} · {formatMoney(b.available, b.currency)} available
                  </p>
                </div>
                <StatusLabel b={b} />
              </div>
              <SpentBar b={b} />
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className={`font-semibold ${b.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {formatMoney(Math.abs(b.remaining), b.currency)} {b.remaining < 0 ? "over" : "left"}
                </span>
                <NotesCount b={b} />
              </div>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

// ─── Spend without a budget ──────────────────────────────────────────────────

function Unbudgeted({ items, canEdit, onAdd }: { items: UnbudgetedSpend[]; canEdit: boolean; onAdd: (item: UnbudgetedSpend) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-card shadow-xs dark:border-amber-900/60">
      <div className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-900 dark:text-amber-200">These costs don't match any budget this month. Add a budget for them, or check the market on the initiative.</p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((u) => (
          <li key={`${u.brand_id}-${u.market_id}-${u.channel_id}-${u.currency}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                <span className={`h-2 w-2 shrink-0 rounded-full ${marketTone(u.market_id, u.market_name).dot}`} />
                {budgetLabel(u)}
              </p>
              <p className="text-xs text-muted-foreground">
                {u.initiative_count} {u.initiative_count === 1 ? "initiative" : "initiatives"} · {formatMoney(u.spent, u.currency)} spent · {formatMoney(u.expected, u.currency)}{" "}
                expected
              </p>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-auto" onClick={() => onAdd(u)}>
                <Plus />
                Add budget
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ id, title, count, description }: { id: string; title: string; count?: number; description?: string }) {
  return (
    <div>
      <h2 id={id} className="text-lg font-semibold text-foreground">
        {title} {count !== undefined && <span className="font-normal text-muted-foreground">{count}</span>}
      </h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

// ─── Figures for one month, after the filters ───────────────────────────────

interface Filters {
  brand: string;
  market: string;
  channel: string;
  status: BudgetStatus | null;
}

const matchId = (filter: string, id: number | null) => !filter || (filter === NONE ? id === null : String(id) === filter);
const budgetMatches = (b: BudgetRow, f: Filters) => matchId(f.brand, b.brand_id) && matchId(f.market, b.market_id) && matchId(f.channel, b.channel_id) && (!f.status || b.status === f.status);
const unbudgetedMatches = (u: UnbudgetedSpend, f: Filters) => matchId(f.brand, u.brand_id) && matchId(f.market, u.market_id) && matchId(f.channel, u.channel_id);

function monthFigures(month: BudgetMonth | undefined, f: Filters, currency: string) {
  const budgets = (month?.budgets ?? []).filter((b) => budgetMatches(b, f));
  const active = budgets.filter((b) => b.status !== "CANCELLED" && b.currency === currency);
  const sum = (pick: (b: BudgetRow) => number) => active.reduce((s, b) => s + pick(b), 0);
  return {
    budgets,
    active,
    amount: sum((b) => b.amount),
    available: sum((b) => b.available),
    spent: sum((b) => b.spent),
    remaining: sum((b) => b.remaining),
    over: active.filter((b) => b.over_budget).length,
    notCommitted: budgets.filter((b) => b.status === "NOT_COMMITTED").length,
    unbudgeted: (month?.unbudgeted ?? []).filter((u) => unbudgetedMatches(u, f)),
    unbudgetedSpent: (month?.unbudgeted ?? []).filter((u) => u.currency === currency && unbudgetedMatches(u, f)).reduce((s, u) => s + u.spent, 0),
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: reference } = useReferenceData();
  const view: View = searchParams.get("view") === "week" ? "week" : "month";
  // The week view keeps the week's Monday in the URL; its month is the one the week mostly falls in
  const weekKey = view === "week" ? parseWeekKey(searchParams.get("week")) : weekForMonth(parseMonthKey(searchParams.get("month")));
  const monthKey = view === "week" ? monthOfWeek(weekKey) : parseMonthKey(searchParams.get("month"));
  const openBudgetId = searchParams.get("budget");

  const statusParam = searchParams.get("status");
  const filters: Filters = {
    brand: searchParams.get("brand") ?? "",
    market: searchParams.get("market") ?? "",
    channel: searchParams.get("channel") ?? "",
    status: BUDGET_STATUSES.includes(statusParam as BudgetStatus) ? (statusParam as BudgetStatus) : null,
  };
  const currencyParam = searchParams.get("currency") ?? "";
  const compareWith: Compare = searchParams.get("compare") === "year" ? "year" : "month";

  // This month, last month (for the change lines) and 4 more for the chart: oldest first, this month last
  const monthKeys = useMemo(() => [-5, -4, -3, -2, -1, 0].map((d) => addMonths(monthKey, d)), [monthKey]);
  const months = useBudgetMonths(
    monthKeys.map((k) => toApiMonth(k)),
    view === "month",
  );
  const monthQuery = months[5];
  const data = monthQuery.data;
  const yearAgoKey = addMonths(monthKey, -12);
  const [yearAgoQuery] = useBudgetMonths([toApiMonth(yearAgoKey)], view === "month" && compareWith === "year");
  const previousData = compareWith === "year" ? yearAgoQuery.data : months[4].data;
  const isLoading = monthQuery.isLoading;
  const error = monthQuery.error;

  const copy = useCopyBudgets();
  const [form, setForm] = useState<{ open: boolean; preset?: BudgetPreset }>({ open: false });
  const [uploadOpen, setUploadOpen] = useState(false);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const filterKeys = ["brand", "market", "channel", "status", "currency"];
  const filtered = filterKeys.some((k) => searchParams.get(k));
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    filterKeys.forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };
  // Changing month or view keeps the filters and what the figures are compared with
  const keepFilters = (extra: Record<string, string>) => {
    const next = new URLSearchParams(extra);
    [...filterKeys, "compare"].forEach((k) => {
      const v = searchParams.get(k);
      if (v) next.set(k, v);
    });
    return next;
  };
  const setMonth = (key: string) => setSearchParams(keepFilters({ month: key }));
  const setWeek = (key: string) => setSearchParams(keepFilters({ view: "week", week: key }));
  const setView = (next: View) => (next === "week" ? setWeek(weekKey) : setMonth(monthKey));

  // Opening a budget adds a history step, so the browser's back button returns to the month
  const openBudget = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (view === "month") next.set("month", monthKey);
    next.set("budget", id);
    setSearchParams(next, { state: { budgetOpened: true }, replace: Boolean(openBudgetId) });
  };
  const closeBudget = () => {
    if ((location.state as { budgetOpened?: boolean } | null)?.budgetOpened) {
      navigate(-1);
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("budget");
    setSearchParams(next, { replace: true });
  };

  // Money is never added across currencies: the figures show one currency at a time
  const currencies = useMemo(() => [...(data?.totals ?? [])].sort((a, b) => b.available - a.available).map((t) => t.currency), [data]);
  const currency = currencies.includes(currencyParam) ? currencyParam : (currencies[0] ?? "USD");

  const now = monthFigures(data, filters, currency);
  const before = previousData ? monthFigures(previousData, filters, currency) : null;
  const groups = groupByMarket(now.budgets);
  const allBudgets = data?.budgets ?? [];
  const empty = !isLoading && !error && allBudgets.length === 0;
  const previousKey = addMonths(monthKey, -1);
  const canCopy = canEdit && empty && Boolean(data?.previous_month_has_budgets);
  const unbudgeted = now.unbudgeted;

  const chartData: BudgetSpendPoint[] = monthKeys.map((k, i) => {
    const f = monthFigures(months[i].data, filters, currency);
    return { key: k, label: monthOnly(k).slice(0, 3), fullLabel: monthName(k), budget: f.available, spend: f.spent };
  });
  const chartLoading = months.some((m) => m.isLoading);
  const chartEmpty = chartData.every((p) => p.budget === 0 && p.spend === 0);

  const byChannel = new Map<string, number>();
  for (const b of now.active) byChannel.set(b.channel_name ?? ALL_CHANNELS, (byChannel.get(b.channel_name ?? ALL_CHANNELS) ?? 0) + b.spent);
  const donutItems = foldIntoOther([...byChannel.entries()].map(([label, value]) => ({ key: label, label, value })));

  const mostOver = [...now.active].filter((b) => b.remaining < 0).sort((a, b) => a.remaining - b.remaining)[0];
  const mostLeft = [...now.active].filter((b) => b.remaining > 0).sort((a, b) => b.remaining - a.remaining)[0];
  const biggestUnbudgeted = [...unbudgeted].sort((a, b) => b.spent - a.spent || b.expected - a.expected)[0];
  const money = (n: number) => formatMoney(n, currency);
  const changeLabel = compareWith === "year" ? `vs. ${monthName(yearAgoKey)}` : `vs. ${monthOnly(previousKey)}`;
  const outside = data?.outside_budget.find((o) => o.currency === currency);
  const compare = Boolean(before);

  const copyLastMonth = () =>
    copy.mutate(
      { fromMonth: toApiMonth(previousKey), toMonth: toApiMonth(monthKey) },
      {
        onSuccess: (result) =>
          toast.success(
            result.created === 0
              ? `Nothing to copy. ${monthName(monthKey)} already has these budgets.`
              : `Copied ${result.created} ${result.created === 1 ? "budget" : "budgets"} from ${monthOnly(previousKey)}`,
            { description: result.created ? "They start as Not committed. Check the amounts and approve each one." : undefined },
          ),
        onError: (err) => toast.error(err.message || "Could not copy last month's budgets."),
      },
    );

  const copyButton = (
    <Button variant="outline" onClick={copyLastMonth} disabled={copy.isPending} className="h-9 gap-2 bg-card">
      {copy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      Copy last month's budgets
    </Button>
  );
  const uploadButton = (
    <Button variant="outline" onClick={() => setUploadOpen(true)} className="h-9 gap-2 bg-card">
      <Upload className="h-4 w-4" />
      Upload spreadsheet
    </Button>
  );
  const addButton = (
    <Button onClick={() => setForm({ open: true })} className="h-9 gap-2">
      <Plus className="h-4 w-4" />
      Add budget
    </Button>
  );

  const idOptions = (items: { id: number; name: string }[] | undefined, all: string, none?: string) => [
    { value: ANY, label: all },
    ...(none ? [{ value: NONE, label: none }] : []),
    ...(items ?? []).map((i) => ({ value: String(i.id), label: i.name })),
  ];
  // Events follow the Brand filter, and show unless another channel is picked
  const brandName = filters.brand && filters.brand !== NONE ? (reference?.brands.find((b) => String(b.id) === filters.brand)?.name ?? null) : null;
  const eventsChannelId = reference?.channels.find((c) => c.code === "EVENTS")?.id;
  const showEvents = !filters.channel || filters.channel === String(eventsChannelId);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <DashboardHeader
        title="Budgets & Expenses"
        subtitle="What each brand and market can spend, what's been spent, and what's left."
        actions={
          <>
            <ViewToggle view={view} onChange={setView} />
            {view === "week" ? <WeekSwitcher weekKey={weekKey} onChange={setWeek} /> : <MonthSwitcher monthKey={monthKey} onChange={setMonth} />}
            {canEdit && canCopy && view === "month" && copyButton}
            {canEdit && uploadButton}
            {canEdit && addButton}
          </>
        }
      />

      {view === "week" ? (
        <BudgetWeekView weekKey={weekKey} onOpenBudget={openBudget} />
      ) : (
        <>
          <FilterBar onClear={filtered ? clearFilters : undefined}>
            <FilterSelect label="Brand" value={filters.brand || ANY} onChange={(v) => setParam("brand", v === ANY ? null : v)} options={idOptions(reference?.brands, "All brands", TBD_ALL)} />
            <FilterSelect label="Market" value={filters.market || ANY} onChange={(v) => setParam("market", v === ANY ? null : v)} options={idOptions(reference?.markets, "All markets")} />
            <FilterSelect
              label="Channel"
              value={filters.channel || ANY}
              onChange={(v) => setParam("channel", v === ANY ? null : v)}
              options={idOptions(reference?.channels, "Any channel", ALL_CHANNELS)}
            />
            <FilterSelect
              label="Status"
              value={filters.status ?? ANY}
              onChange={(v) => setParam("status", v === ANY ? null : v)}
              options={[{ value: ANY, label: "All" }, ...BUDGET_STATUSES.map((s) => ({ value: s, label: BUDGET_STATUS_LABELS[s] }))]}
            />
            <FilterSelect
              label="Compare with"
              value={compareWith}
              onChange={(v) => setParam("compare", v === "year" ? "year" : null)}
              options={[
                { value: "month", label: "Last month" },
                { value: "year", label: "Same month last year" },
              ]}
            />
            {currencies.length > 1 && (
              <FilterSelect label="Currency" value={currency} onChange={(v) => setParam("currency", v === currencies[0] ? null : v)} options={currencies.map((c) => ({ value: c, label: c }))} />
            )}
          </FilterBar>

          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : error ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
              <p className="text-sm text-red-800 dark:text-red-300">Could not load the budgets for {monthName(monthKey)}.</p>
              <Button variant="outline" size="sm" onClick={() => monthQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className={`flex flex-col gap-5 transition-opacity sm:gap-6 ${monthQuery.isPlaceholderData ? "opacity-60" : ""}`}>
              {empty ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
                  <Wallet className="h-8 w-8 text-muted-foreground/60" />
                  <p className="font-medium text-foreground">No budgets for {monthName(monthKey)} yet</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    {data?.previous_month_has_budgets
                      ? `Copy ${monthOnly(previousKey)}'s budgets and adjust the amounts, or add each budget yourself. Copied budgets start as Not committed until you approve them.`
                      : "Add a budget for each brand and market with money approved for this month, or upload your Budget Tracker spreadsheet to bring several months in at once. Costs on matching initiatives will count against it."}
                  </p>
                  {canEdit ? (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      {canCopy && copyButton}
                      {uploadButton}
                      {addButton}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Ask someone who can edit initiatives to add them.</p>
                  )}
                </div>
              ) : (
                <>
                  <section aria-label={`Key figures for ${monthName(monthKey)}`}>
                    <KpiGrid>
                      <KpiCard
                        label="Available"
                        icon={Landmark}
                        tone="blue"
                        info={`${INFO.available} Approved: ${money(now.amount)}.`}
                        value={money(now.available)}
                        change={compare ? { current: now.available, previous: before?.available } : undefined}
                        changeLabel={changeLabel}
                      />
                      <KpiCard
                        label="Spent"
                        icon={Receipt}
                        tone="violet"
                        info={INFO.spent}
                        value={money(now.spent)}
                        change={compare ? { current: now.spent, previous: before?.spent } : undefined}
                        changeLabel={changeLabel}
                      />
                      <KpiCard
                        label="Remaining"
                        icon={PiggyBank}
                        tone="green"
                        info={INFO.remaining}
                        value={money(now.remaining)}
                        valueClassName={now.remaining < 0 ? "text-red-600 dark:text-red-400" : undefined}
                        change={compare ? { current: now.remaining, previous: before?.remaining } : undefined}
                        changeLabel={changeLabel}
                      />
                      <KpiCard
                        label="Over budget"
                        icon={TriangleAlert}
                        tone="orange"
                        info={INFO.over}
                        value={now.over === 0 ? "None" : `${now.over} of ${now.active.length}`}
                        valueClassName={now.over > 0 ? "text-red-600 dark:text-red-400" : undefined}
                        goodWhen="down"
                        change={compare ? { current: now.over, previous: before?.over, mode: "absolute" } : undefined}
                        changeLabel={changeLabel}
                      />
                      <KpiCard
                        label="Not committed"
                        icon={CircleDashed}
                        tone="sky"
                        info={INFO.notCommitted}
                        value={now.notCommitted}
                        goodWhen="down"
                        change={compare ? { current: now.notCommitted, previous: before?.notCommitted, mode: "absolute" } : undefined}
                        changeLabel={changeLabel}
                      />
                      <KpiCard
                        label="Spend without a budget"
                        icon={CircleAlert}
                        tone="pink"
                        info={INFO.unbudgeted}
                        value={money(now.unbudgetedSpent)}
                        valueClassName={now.unbudgetedSpent > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
                        goodWhen="down"
                        change={compare ? { current: now.unbudgetedSpent, previous: before?.unbudgetedSpent } : undefined}
                        changeLabel={changeLabel}
                      />
                    </KpiGrid>
                    {outside && (outside.spent > 0 || outside.expected > 0) && (
                      <div className={`${DASH_CARD} mt-3 flex items-start gap-3 px-4 py-3 text-sm sm:mt-4`}>
                        <Plane className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <p className="min-w-0 text-muted-foreground">
                          <span className="font-medium text-foreground">Travel outside the budget: {money(outside.spent)} spent</span>
                          {outside.expected !== outside.spent && <> ({money(outside.expected)} expected)</>} across {outside.initiative_count}{" "}
                          {outside.initiative_count === 1 ? "initiative" : "initiatives"}
                          {filtered ? ", all brands and markets" : ""}. Not counted in the figures above.{" "}
                          <InfoTip text={INFO.outside} />
                        </p>
                      </div>
                    )}
                  </section>

                  <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-5">
                    <ChartCard
                      className="xl:col-span-3"
                      title="Available vs spent"
                      subtitle={`Last 6 months, ${currency}`}
                      info="Available and spent for each month's budgets, with the filters above. Cancelled budgets aren't counted."
                      action={<BudgetSpendLegend budgetLabel="Available" spendLabel="Spent" />}
                    >
                      {chartLoading ? (
                        <Skeleton className="h-[260px] w-full rounded-lg" />
                      ) : chartEmpty ? (
                        <ChartEmpty text="No budgets in these months." />
                      ) : (
                        <BudgetSpendChart data={chartData} currency={currency} budgetLabel="Available" spendLabel="Spent" />
                      )}
                    </ChartCard>
                    <ChartCard className="xl:col-span-2" title="Spend by channel" subtitle={`${monthName(monthKey)}, ${currency}`}>
                      {donutItems.length === 0 ? <ChartEmpty text="Nothing spent yet this month." height={180} /> : <DonutChart items={donutItems} currency={currency} totalLabel="Spent" />}
                    </ChartCard>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
                    <InsightCard
                      icon={TriangleAlert}
                      tone="red"
                      warning
                      label="Most over budget"
                      title={mostOver ? budgetLabel(mostOver) : undefined}
                      emptyText="Every budget is within what it has."
                      stats={
                        mostOver
                          ? [
                              { label: "Over by", value: formatMoney(-mostOver.remaining, mostOver.currency) },
                              { label: "Spent", value: formatMoney(mostOver.spent, mostOver.currency) },
                              { label: "Available", value: formatMoney(mostOver.available, mostOver.currency) },
                            ]
                          : []
                      }
                      onClick={mostOver ? () => openBudget(mostOver.id) : undefined}
                    />
                    <InsightCard
                      icon={PiggyBank}
                      tone="green"
                      label="Most left to spend"
                      title={mostLeft ? budgetLabel(mostLeft) : undefined}
                      stats={
                        mostLeft
                          ? [
                              { label: "Remaining", value: formatMoney(mostLeft.remaining, mostLeft.currency) },
                              { label: "Spent", value: formatMoney(mostLeft.spent, mostLeft.currency) },
                              { label: "Available", value: formatMoney(mostLeft.available, mostLeft.currency) },
                            ]
                          : []
                      }
                      onClick={mostLeft ? () => openBudget(mostLeft.id) : undefined}
                    />
                    <InsightCard
                      icon={CircleAlert}
                      tone="amber"
                      warning
                      label="Spend without a budget"
                      title={biggestUnbudgeted ? budgetLabel(biggestUnbudgeted) : undefined}
                      emptyText="Every cost matches a budget."
                      stats={
                        biggestUnbudgeted
                          ? [
                              { label: "Spent", value: formatMoney(biggestUnbudgeted.spent, biggestUnbudgeted.currency) },
                              { label: "Expected", value: formatMoney(biggestUnbudgeted.expected, biggestUnbudgeted.currency) },
                              { label: "Initiatives", value: biggestUnbudgeted.initiative_count },
                            ]
                          : []
                      }
                      onClick={biggestUnbudgeted ? () => scrollTo("budget-unbudgeted") : undefined}
                    />
                  </div>

                  <section className="flex min-w-0 scroll-mt-16 flex-col gap-3" id="budget-list" aria-labelledby="budget-list-title">
                    <SectionHeading
                      id="budget-list-title"
                      title="Budgets by market"
                      count={now.budgets.length}
                      description="Open a budget to see where the spend comes from, move money or add a note."
                    />
                    <div className={`${DASH_CARD} min-w-0 overflow-hidden`}>
                      {groups.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-muted-foreground">No budgets match these filters.</p>
                      ) : (
                        <>
                          <BudgetTable groups={groups} onOpen={openBudget} />
                          <BudgetCards groups={groups} onOpen={openBudget} />
                        </>
                      )}
                    </div>
                  </section>
                </>
              )}

              {showEvents && (
                <section className="flex min-w-0 scroll-mt-16 flex-col gap-3" id="budget-events" aria-labelledby="budget-events-title">
                  <SectionHeading
                    id="budget-events-title"
                    title={`Events in ${monthName(monthKey)}`}
                    description={`Each event's budget, expected costs, what's been spent and travel. Open an event to manage its costs.${
                      filters.market ? " Events don't have a market yet, so this shows every market." : ""
                    }`}
                  />
                  <EventsBudgetSection monthKey={monthKey} monthName={monthName(monthKey)} brandName={brandName} />
                </section>
              )}

              {unbudgeted.length > 0 && (
                <section className="flex scroll-mt-16 flex-col gap-3" id="budget-unbudgeted" aria-labelledby="budget-unbudgeted-title">
                  <SectionHeading id="budget-unbudgeted-title" title="Spend without a budget" count={unbudgeted.length} />
                  <Unbudgeted
                    items={unbudgeted}
                    canEdit={canEdit}
                    onAdd={(u) =>
                      setForm({
                        open: true,
                        preset: { brand_id: u.brand_id, market_id: u.market_id, channel_id: u.channel_id, currency: u.currency, expected: u.expected },
                      })
                    }
                  />
                </section>
              )}

              <section className="flex scroll-mt-16 flex-col gap-3" id="budget-notes" aria-labelledby="budget-notes-title">
                <SectionHeading
                  id="budget-notes-title"
                  title={`Notes for ${monthName(monthKey)}`}
                  count={data?.notes.length ?? 0}
                  description="For the month as a whole, e.g. decisions from the budget meeting. Notes on one budget go on that budget."
                />
                <div className={`${DASH_CARD} p-4`}>
                  <NotesThread
                    key={monthKey}
                    target={{ month: toApiMonth(monthKey) }}
                    comments={data?.notes ?? []}
                    placeholder={`Add a note for ${monthName(monthKey)}`}
                    emptyText={`No notes for ${monthName(monthKey)} yet.`}
                  />
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {canEdit && (
        <BudgetsUpload key={monthKey.slice(0, 4)} open={uploadOpen} onOpenChange={setUploadOpen} defaultYear={Number(monthKey.slice(0, 4))} />
      )}
      {canEdit && <BudgetFormDialog open={form.open} onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))} monthKey={monthKey} preset={form.preset} />}
      <BudgetDetailSheet budgetId={openBudgetId} onClose={closeBudget} onOpenBudget={openBudget} />
    </div>
  );
}
