import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Copy,
  Landmark,
  LayoutList,
  Loader2,
  MessageSquare,
  NotebookPen,
  PiggyBank,
  Plus,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetMonth, useCopyBudgets } from "@/hooks/useBudgets";
import { useAuth } from "@/lib/AuthContext";
import type { BudgetRow, BudgetTotals, UnbudgetedSpend } from "@/types/budgets";
import { formatMoney } from "../Initiatives/format";
import BudgetDetailSheet from "./BudgetDetailSheet";
import BudgetFormDialog, { type BudgetPreset } from "./BudgetFormDialog";
import BudgetWeekView, { monthOfWeek, parseWeekKey, weekForMonth, WeekSwitcher } from "./BudgetWeekView";
import NotesThread from "./NotesThread";
import {
  addMonths,
  ALL_CHANNELS,
  BUDGET_STATUS_LABELS,
  budgetLabel,
  formatFullWhen,
  formatWhen,
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

const CARD = "rounded-xl border border-border bg-card shadow-xs";

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
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${STATUS_PILL[b.status]}`}>{BUDGET_STATUS_LABELS[b.status]}</span>
      {b.status === "APPROVED" && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PROGRESS_DOT[b.progress]}`} />
          {PROGRESS_LABELS[b.progress]}
        </span>
      )}
    </div>
  );
}

function Moved({ b }: { b: BudgetRow }) {
  if (!b.moved_in && !b.moved_out) return <span className="text-xs text-muted-foreground/60">-</span>;
  return (
    <div className="flex flex-col text-xs font-medium tabular-nums">
      {b.moved_in > 0 && (
        <span className="text-emerald-700 dark:text-emerald-400" title="Moved in">
          {movedIn(b)}
        </span>
      )}
      {b.moved_out > 0 && (
        <span className="text-rose-700 dark:text-rose-400" title="Moved out">
          {movedOut(b)}
        </span>
      )}
    </div>
  );
}

function LatestNote({ b }: { b: BudgetRow }) {
  if (!b.latest_comment) return <span className="text-xs text-muted-foreground/70">No notes</span>;
  return (
    <div className="flex min-w-0 items-start gap-1.5 text-xs">
      <span
        className="inline-flex shrink-0 items-center gap-0.5 rounded bg-blue-50 px-1 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
        title={`${b.comment_count} ${b.comment_count === 1 ? "note" : "notes"}`}
      >
        <MessageSquare className="h-3 w-3" />
        {b.comment_count}
      </span>
      <span className="min-w-0 truncate text-foreground" title={b.latest_comment.body}>
        {b.latest_comment.body}
      </span>
    </div>
  );
}

function LastUpdate({ b }: { b: BudgetRow }) {
  return (
    <div className="text-xs" title={formatFullWhen(b.last_update)}>
      <span className="block text-foreground">{formatWhen(b.last_update)}</span>
      {b.last_update_by_name && <span className="block truncate text-muted-foreground">{b.last_update_by_name}</span>}
    </div>
  );
}

/** A section heading with a coloured icon, so each part of the page is easy to spot */
function SectionTitle({
  id,
  icon: Icon,
  tone,
  title,
  count,
  description,
  action,
}: {
  id: string;
  icon: React.ElementType;
  tone: string;
  title: string;
  count?: number;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 id={id} className="text-base font-semibold text-foreground">
            {title} {count !== undefined && <span className="font-normal text-muted-foreground">{count}</span>}
          </h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Month switcher ──────────────────────────────────────────────────────────

function MonthSwitcher({ monthKey, onChange }: { monthKey: string; onChange: (key: string) => void }) {
  const current = thisMonthKey();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1" role="group" aria-label="Month">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(addMonths(monthKey, -1))}
          aria-label={`Previous month, ${monthName(addMonths(monthKey, -1))}`}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-36 rounded-md bg-card px-3 py-1 text-center text-sm font-medium text-foreground shadow-xs" aria-live="polite">
          {monthName(monthKey)}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(addMonths(monthKey, 1))} aria-label={`Next month, ${monthName(addMonths(monthKey, 1))}`}>
          <ChevronRight />
        </Button>
      </div>
      {monthKey !== current && (
        <Button variant="outline" size="sm" onClick={() => onChange(current)}>
          This month
        </Button>
      )}
    </div>
  );
}

// ─── Month or week ───────────────────────────────────────────────────────────

type View = "month" | "week";

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-muted p-1" role="group" aria-label="View">
      {(["month", "week"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            view === v ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {v === "month" ? "Month" : "Week"}
        </button>
      ))}
    </div>
  );
}

// ─── Jump to a section ───────────────────────────────────────────────────────

interface JumpLink {
  target: string;
  label: string;
  count?: number;
  dot: string;
}

/** A bar of links to each section of the month; stays at the top while scrolling */
function SectionNav({ links }: { links: JumpLink[] }) {
  const jump = (target: string) => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-10 -mx-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6"
    >
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {links.map((l) => (
          <button
            key={l.target}
            type="button"
            onClick={() => jump(l.target)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <span className={`h-2 w-2 rounded-full ${l.dot}`} />
            {l.label}
            {l.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{l.count}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  valueTone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ElementType;
  tone: string;
  valueTone?: string;
}) {
  return (
    <div className={`${CARD} flex min-w-0 items-start gap-3 p-4`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className={`mt-0.5 truncate text-lg font-semibold tabular-nums sm:text-xl ${valueTone ?? "text-foreground"}`}>{value}</dd>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function Summary({ totals, budgets, showCurrency }: { totals: BudgetTotals; budgets: BudgetRow[]; showCurrency: boolean }) {
  const money = (n: number) => formatMoney(n, totals.currency);
  const active = budgets.filter((b) => b.currency === totals.currency && b.status !== "CANCELLED");
  const over = active.filter((b) => b.over_budget).length;
  const percent = totals.available > 0 ? (totals.spent / totals.available) * 100 : null;
  const moved = totals.available - totals.amount;
  const tone = usageTone(percent, totals.remaining < 0);
  return (
    <div className="flex flex-col gap-3" aria-label={`Totals in ${totals.currency}`}>
      {showCurrency && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{totals.currency}</p>}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Approved"
          icon={Landmark}
          tone="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
          value={money(totals.amount)}
          hint={`${active.length} ${active.length === 1 ? "budget" : "budgets"}`}
        />
        <StatCard
          label="Available"
          icon={ArrowRightLeft}
          tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
          value={money(totals.available)}
          hint={moved === 0 ? "No money moved" : `${moved > 0 ? "+" : "−"}${money(Math.abs(moved))} moved`}
        />
        <StatCard
          label="Spent"
          icon={Receipt}
          tone="bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400"
          value={money(totals.spent)}
          hint={`${money(totals.expected)} expected incl. estimates`}
        />
        <StatCard
          label="Remaining"
          icon={PiggyBank}
          tone={
            totals.remaining < 0
              ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
          }
          valueTone={totals.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}
          value={money(totals.remaining)}
          hint={totals.remaining < 0 ? "Over the available budget" : "Left to spend"}
        />
        <StatCard
          label="Over budget"
          icon={over > 0 ? TriangleAlert : CircleCheck}
          tone={over > 0 ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"}
          valueTone={over > 0 ? "text-red-600 dark:text-red-400" : undefined}
          value={over === 0 ? "None" : `${over} of ${active.length}`}
          hint={over === 0 ? "Every budget is within its limit" : over === 1 ? "1 budget spent more than it has" : `${over} budgets spent more than they have`}
        />
      </dl>
      {percent !== null && (
        <div className={`${CARD} px-4 py-3`}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">How much of the month's budget is spent</span>
            <span className={`font-semibold tabular-nums ${tone.text}`}>{Math.round(percent)}%</span>
          </div>
          <span className="mt-2 block h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(percent, 100)}%` }} />
          </span>
        </div>
      )}
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

/** "$25,000 approved · $19,800 spent", per currency, for a market's header */
function groupTotals(budgets: BudgetRow[]) {
  const byCurrency = new Map<string, { amount: number; spent: number; remaining: number }>();
  for (const b of budgets) {
    if (b.status === "CANCELLED") continue;
    const t = byCurrency.get(b.currency) ?? { amount: 0, spent: 0, remaining: 0 };
    t.amount += b.amount;
    t.spent += b.spent;
    t.remaining += b.remaining;
    byCurrency.set(b.currency, t);
  }
  return [...byCurrency.entries()].map(([currency, t]) => ({ currency, ...t }));
}

function MarketHeader({ group }: { group: MarketGroup }) {
  const tone = marketTone(group.marketId, group.marketName);
  const totals = groupTotals(group.budgets);
  return (
    <div className={`flex flex-col gap-1 border-l-4 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${tone.band}`}>
      <p className={`flex items-center gap-2 text-sm font-semibold ${tone.text}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
        {group.marketName}
        <span className="font-normal opacity-70">
          {group.budgets.length} {group.budgets.length === 1 ? "budget" : "budgets"}
        </span>
      </p>
      <p className="flex flex-wrap gap-x-3 text-xs tabular-nums text-muted-foreground">
        {totals.map((t) => (
          <span key={t.currency}>
            {formatMoney(t.amount, t.currency)} approved · {formatMoney(t.spent, t.currency)} spent ·{" "}
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
    ? "opacity-60"
    : b.over_budget
      ? "bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
      : b.status === "NOT_COMMITTED"
        ? "bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/15 dark:hover:bg-amber-950/25"
        : "hover:bg-muted/50";

function BudgetTable({ groups, onOpen }: { groups: MarketGroup[]; onOpen: (id: string) => void }) {
  const head = "px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap";
  const cell = "px-3 py-3 align-top";
  return (
    <div className="hidden flex-col gap-4 lg:flex">
      {groups.map((group) => (
        <section key={group.marketId} className={`${CARD} overflow-hidden`} aria-label={group.marketName}>
          <MarketHeader group={group} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-y border-border bg-muted/30">
                <tr>
                  <th className={head}>Brand</th>
                  <th className={head}>Channel</th>
                  <th className={`${head} text-right`}>Approved</th>
                  <th className={`${head} text-right`}>Moved</th>
                  <th className={`${head} w-40`}>Spent</th>
                  <th className={`${head} text-right`}>Remaining</th>
                  <th className={head}>Status</th>
                  <th className={`${head} w-64`}>Latest note</th>
                  <th className={head}>Last update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.budgets.map((b) => (
                  <tr key={b.id} onClick={() => onOpen(b.id)} className={`cursor-pointer transition-colors ${rowTint(b)}`}>
                    <td className={cell}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(b.id);
                        }}
                        className="text-left font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {b.brand_name ?? TBD_ALL}
                      </button>
                      {b.over_budget && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <TriangleAlert className="h-3 w-3" />
                          Over budget
                        </span>
                      )}
                    </td>
                    <td className={`${cell} ${b.channel_name ? "text-foreground" : "text-muted-foreground"}`}>{b.channel_name ?? ALL_CHANNELS}</td>
                    <td className={`${cell} text-right tabular-nums text-foreground`}>{formatMoney(b.amount, b.currency)}</td>
                    <td className={`${cell} text-right`}>
                      <Moved b={b} />
                    </td>
                    <td className={cell}>
                      <SpentBar b={b} />
                    </td>
                    <td
                      className={`${cell} text-right font-semibold tabular-nums ${b.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
                    >
                      {formatMoney(b.remaining, b.currency)}
                    </td>
                    <td className={cell}>
                      <StatusLabel b={b} />
                    </td>
                    <td className={`${cell} max-w-64`}>
                      <LatestNote b={b} />
                    </td>
                    <td className={cell}>
                      <LastUpdate b={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function BudgetCard({ b, onOpen }: { b: BudgetRow; onOpen: (id: string) => void }) {
  const tone = marketTone(b.market_id, b.market_name);
  return (
    <button
      type="button"
      onClick={() => onOpen(b.id)}
      className={`${CARD} flex w-full flex-col gap-3 border-l-4 p-4 text-left transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tone.band.split(" ")[0]} ${
        b.status === "CANCELLED" ? "opacity-60" : b.over_budget ? "bg-red-50/50 dark:bg-red-950/20" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{b.brand_name ?? TBD_ALL}</p>
          <p className="truncate text-xs text-muted-foreground">
            {b.channel_name ?? ALL_CHANNELS} · {formatMoney(b.amount, b.currency)} approved
          </p>
        </div>
        <StatusLabel b={b} />
      </div>
      <SpentBar b={b} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <span className={`font-semibold ${b.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
          {formatMoney(Math.abs(b.remaining), b.currency)} {b.remaining < 0 ? "over" : "left"}
        </span>
        {(b.moved_in > 0 || b.moved_out > 0) && (
          <span className="tabular-nums text-muted-foreground">
            Moved {[b.moved_in > 0 && movedIn(b), b.moved_out > 0 && movedOut(b)].filter(Boolean).join(" / ")}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
        <div className="min-w-0 flex-1">
          <LatestNote b={b} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground" title={formatFullWhen(b.last_update)}>
          {formatWhen(b.last_update)}
        </span>
      </div>
    </button>
  );
}

function BudgetCards({ groups, onOpen }: { groups: MarketGroup[]; onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-5 lg:hidden">
      {groups.map((group) => (
        <section key={group.marketId} className="flex flex-col gap-2.5" aria-label={group.marketName}>
          <div className={`${CARD} overflow-hidden`}>
            <MarketHeader group={group} />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {group.budgets.map((b) => (
              <BudgetCard key={b.id} b={b} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Quick filters ───────────────────────────────────────────────────────────

type Filter = "ALL" | "OVER" | "NOT_COMMITTED" | "CANCELLED";

const FILTERS: { value: Filter; label: string; dot: string; test: (b: BudgetRow) => boolean }[] = [
  { value: "ALL", label: "All", dot: "bg-foreground/60", test: () => true },
  { value: "OVER", label: "Over budget", dot: "bg-red-500", test: (b) => b.over_budget && b.status !== "CANCELLED" },
  { value: "NOT_COMMITTED", label: "Not committed", dot: "bg-amber-500", test: (b) => b.status === "NOT_COMMITTED" },
  { value: "CANCELLED", label: "Cancelled", dot: "bg-zinc-400", test: (b) => b.status === "CANCELLED" },
];

function FilterChips({ budgets, value, onChange }: { budgets: BudgetRow[]; value: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
      <div className="inline-flex gap-0.5 rounded-lg bg-muted p-1" role="group" aria-label="Show">
        {FILTERS.map((f) => {
          const count = budgets.filter(f.test).length;
          if (f.value !== "ALL" && count === 0 && value !== f.value) return null;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange(f.value)}
              aria-pressed={value === f.value}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                value === f.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${f.dot}`} />
              {f.label}
              <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Spend without a budget ──────────────────────────────────────────────────

function Unbudgeted({ items, canEdit, onAdd }: { items: UnbudgetedSpend[]; canEdit: boolean; onAdd: (item: UnbudgetedSpend) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-card shadow-xs dark:border-amber-900/60">
      <div className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          These costs don't match any budget this month. Add a budget for them, or check the market on the initiative.
        </p>
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
                {u.initiative_count} {u.initiative_count === 1 ? "initiative" : "initiatives"} · {formatMoney(u.spent, u.currency)} spent ·{" "}
                {formatMoney(u.expected, u.currency)} expected
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const view: View = searchParams.get("view") === "week" ? "week" : "month";
  // The week view keeps the week's Monday in the URL; its month is the one the week mostly falls in
  const weekKey = view === "week" ? parseWeekKey(searchParams.get("week")) : weekForMonth(parseMonthKey(searchParams.get("month")));
  const monthKey = view === "week" ? monthOfWeek(weekKey) : parseMonthKey(searchParams.get("month"));
  const openBudgetId = searchParams.get("budget");

  const { data, isLoading, isPlaceholderData, error, refetch } = useBudgetMonth(toApiMonth(monthKey));
  const copy = useCopyBudgets();
  const [form, setForm] = useState<{ open: boolean; preset?: BudgetPreset }>({ open: false });
  const [filter, setFilter] = useState<Filter>("ALL");

  const budgets = useMemo(() => data?.budgets ?? [], [data]);
  const shown = useMemo(() => budgets.filter(FILTERS.find((f) => f.value === filter)!.test), [budgets, filter]);
  const groups = useMemo(() => groupByMarket(shown), [shown]);
  const empty = !isLoading && !error && budgets.length === 0;
  const previousKey = addMonths(monthKey, -1);
  const canCopy = canEdit && empty && Boolean(data?.previous_month_has_budgets);
  const unbudgeted = data?.unbudgeted ?? [];

  const setMonth = (key: string) => {
    setFilter("ALL");
    setSearchParams({ month: key });
  };
  const setWeek = (key: string) => setSearchParams({ view: "week", week: key });
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
    <Button variant="outline" onClick={copyLastMonth} disabled={copy.isPending} className="gap-2">
      {copy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      Copy last month's budgets
    </Button>
  );
  const addButton = (
    <Button onClick={() => setForm({ open: true })} className="gap-2">
      <Plus className="h-4 w-4" />
      Add budget
    </Button>
  );

  const jumpLinks: JumpLink[] = [
    ...(!empty ? [{ target: "budget-overview", label: "Overview", dot: "bg-blue-500" }] : []),
    ...(!empty ? [{ target: "budget-list", label: "Budgets", count: budgets.length, dot: "bg-emerald-500" }] : []),
    ...(unbudgeted.length ? [{ target: "budget-unbudgeted", label: "Spend without a budget", count: unbudgeted.length, dot: "bg-amber-500" }] : []),
    { target: "budget-notes", label: "Notes", count: data?.notes.length ?? 0, dot: "bg-sky-500" },
  ];

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <PageHeader
        icon={Wallet}
        title="Monthly Budgets"
        description="What each brand and market can spend this month, what's been spent so far, and notes on why."
        actions={
          canEdit && (
            <>
              {canCopy && copyButton}
              {addButton}
            </>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ViewToggle view={view} onChange={setView} />
        {view === "week" ? <WeekSwitcher weekKey={weekKey} onChange={setWeek} /> : <MonthSwitcher monthKey={monthKey} onChange={setMonth} />}
      </div>

      {view === "week" ? (
        <BudgetWeekView weekKey={weekKey} onOpenBudget={openBudget} />
      ) : isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">Could not load the budgets for {monthName(monthKey)}.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className={`flex flex-col gap-6 transition-opacity sm:gap-8 ${isPlaceholderData ? "opacity-60" : ""}`}>
          <SectionNav links={jumpLinks} />

          {empty ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No budgets for {monthName(monthKey)} yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {data?.previous_month_has_budgets
                  ? `Copy ${monthOnly(previousKey)}'s budgets and adjust the amounts, or add each budget yourself. Copied budgets start as Not committed until you approve them.`
                  : "Add a budget for each brand and market with money approved for this month. Costs on matching initiatives will count against it."}
              </p>
              {canEdit ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  {canCopy && copyButton}
                  {addButton}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Ask someone who can edit initiatives to add them.</p>
              )}
            </div>
          ) : (
            <>
              <section className="flex scroll-mt-16 flex-col gap-3" id="budget-overview" aria-labelledby="budget-overview-title">
                <SectionTitle
                  id="budget-overview-title"
                  icon={LayoutList}
                  tone="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                  title={`${monthOnly(monthKey)} at a glance`}
                  description="Totals across every budget this month. Cancelled budgets aren't counted."
                />
                {data &&
                  data.totals.map((t) => <Summary key={t.currency} totals={t} budgets={budgets} showCurrency={data.totals.length > 1} />)}
              </section>

              <section className="flex scroll-mt-16 flex-col gap-3" id="budget-list" aria-labelledby="budget-list-title">
                <SectionTitle
                  id="budget-list-title"
                  icon={Wallet}
                  tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                  title="Budgets by market"
                  count={budgets.length}
                  description="Open a budget to see where the spend comes from, move money or add a note."
                  action={<FilterChips budgets={budgets} value={filter} onChange={setFilter} />}
                />
                {groups.length === 0 ? (
                  <p className={`${CARD} px-4 py-6 text-center text-sm text-muted-foreground`}>No budgets match this filter.</p>
                ) : (
                  <>
                    <BudgetTable groups={groups} onOpen={openBudget} />
                    <BudgetCards groups={groups} onOpen={openBudget} />
                  </>
                )}
              </section>
            </>
          )}

          {unbudgeted.length > 0 && (
            <section className="flex scroll-mt-16 flex-col gap-3" id="budget-unbudgeted" aria-labelledby="budget-unbudgeted-title">
              <SectionTitle
                id="budget-unbudgeted-title"
                icon={CircleAlert}
                tone="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                title="Spend without a budget"
                count={unbudgeted.length}
              />
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
            <SectionTitle
              id="budget-notes-title"
              icon={NotebookPen}
              tone="bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400"
              title={`Notes for ${monthName(monthKey)}`}
              count={data?.notes.length ?? 0}
              description="For the month as a whole, e.g. decisions from the budget meeting. Notes on one budget go on that budget."
            />
            <div className="rounded-xl border border-sky-200 bg-card p-4 shadow-xs dark:border-sky-900/60">
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

      {canEdit && (
        <BudgetFormDialog open={form.open} onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))} monthKey={monthKey} preset={form.preset} />
      )}
      <BudgetDetailSheet budgetId={openBudgetId} onClose={closeBudget} onOpenBudget={openBudget} />
    </div>
  );
}
