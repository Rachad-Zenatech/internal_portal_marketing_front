import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetWeek } from "@/hooks/useBudgets";
import type { BudgetWeekLine, BudgetWeekMonth } from "@/types/budgets";
import type { SpendStatus } from "@/types/spend";
import { formatMoney } from "../Initiatives/format";
import { isActualStatus, SPEND_STATUS_LABELS } from "../Initiatives/spendRules";

const CARD = "rounded-xl border border-border bg-card shadow-xs";

const STATUS_DOT: Record<SpendStatus, string> = {
  ESTIMATED: "bg-zinc-400",
  COMMITTED: "bg-blue-500",
  INVOICED: "bg-amber-500",
  PAID: "bg-emerald-500",
};

// ─── Weeks ───────────────────────────────────────────────────────────────────
// The URL keeps the week's Monday as "2026-10-12", the same as the API.

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function mondayOf(d: Date) {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export function addWeeks(weekKey: string, weeks: number) {
  const d = fromIso(weekKey);
  d.setDate(d.getDate() + weeks * 7);
  return toIso(d);
}

export function thisWeekKey() {
  return toIso(mondayOf(new Date()));
}

/** A valid Monday from the URL, or the Monday of the week the date falls in, or this week */
export function parseWeekKey(value: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromIso(value).getTime())) return toIso(mondayOf(fromIso(value)));
  return thisWeekKey();
}

/** The week to show for a month: this week if it's the current month, otherwise the week its 1st falls in */
export function weekForMonth(monthKey: string) {
  return toIso(new Date()).startsWith(monthKey) ? thisWeekKey() : toIso(mondayOf(fromIso(`${monthKey}-01`)));
}

/** "Oct 12 – 18, 2026", "Sep 28 – Oct 4, 2026", "Dec 28, 2026 – Jan 3, 2027" */
export function weekName(weekKey: string) {
  const start = fromIso(weekKey);
  const end = fromIso(addWeeks(weekKey, 1));
  end.setDate(end.getDate() - 1);
  const short = (d: Date, withYear = false) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
  if (start.getFullYear() !== end.getFullYear()) return `${short(start, true)} – ${short(end, true)}`;
  if (start.getMonth() === end.getMonth()) return `${short(start)} – ${end.getDate()}, ${end.getFullYear()}`;
  return `${short(start)} – ${short(end)}, ${end.getFullYear()}`;
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

export function WeekSwitcher({ weekKey, onChange }: { weekKey: string; onChange: (key: string) => void }) {
  const current = thisWeekKey();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1" role="group" aria-label="Week">
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(addWeeks(weekKey, -1))} aria-label={`Previous week, ${weekName(addWeeks(weekKey, -1))}`}>
          <ChevronLeft />
        </Button>
        <span className="min-w-44 rounded-md bg-card px-3 py-1 text-center text-sm font-medium text-foreground shadow-xs" aria-live="polite">
          {weekName(weekKey)}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(addWeeks(weekKey, 1))} aria-label={`Next week, ${weekName(addWeeks(weekKey, 1))}`}>
          <ChevronRight />
        </Button>
      </div>
      {weekKey !== current && (
        <Button variant="outline" size="sm" onClick={() => onChange(current)}>
          This week
        </Button>
      )}
    </div>
  );
}

/** One currency's month so far: "$3,450 of $38,000", with a marker for how much of the month has gone */
function PaceRow({ m, elapsed }: { m: BudgetWeekMonth; elapsed: number }) {
  const money = (n: number) => formatMoney(n, m.currency);
  const used = m.available > 0 ? (m.spent_to_date / m.available) * 100 : null;
  const over = m.spent_to_date > m.available;
  const ahead = !over && used !== null && used > elapsed + 10;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm text-foreground">
          <span className={`font-semibold tabular-nums ${over ? "text-red-600 dark:text-red-400" : ""}`}>{money(m.spent_to_date)}</span>
          <span className="text-muted-foreground"> of {money(m.available)}</span>
        </span>
        <span className={`shrink-0 text-xs tabular-nums ${over ? "text-red-600 dark:text-red-400" : ahead ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
          {used === null ? "Nothing available" : over ? "Over budget" : ahead ? `${Math.round(used)}% · ahead` : `${Math.round(used)}%`}
        </span>
      </div>
      <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className={`block h-full rounded-full ${over ? "bg-red-500" : ahead ? "bg-amber-500" : "bg-foreground/70"}`}
          style={{ width: `${Math.min(used ?? 0, 100)}%` }}
        />
        <span className="absolute inset-y-0 w-0.5 bg-foreground/40" style={{ left: `${Math.min(elapsed, 100)}%` }} />
      </span>
    </div>
  );
}

/** A month the week falls in: how far through its budgets it was by the end of the week, one row per currency */
function MonthPace({ rows }: { rows: BudgetWeekMonth[] }) {
  const first = rows[0];
  const through = fromIso(first.through);
  const elapsed = (through.getDate() / first.days_in_month) * 100;
  return (
    <div className="flex min-w-0 flex-col gap-2.5 bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">
        {fromIso(first.month).toLocaleDateString(undefined, { month: "long" })} by{" "}
        {through.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {Math.round(elapsed)}% of the month gone
      </dt>
      <dd className="flex flex-col gap-2.5">
        {rows.map((m) => (
          <PaceRow key={m.currency} m={m} elapsed={elapsed} />
        ))}
      </dd>
    </div>
  );
}

function CostItem({ line, onOpenBudget }: { line: BudgetWeekLine; onOpenBudget: (id: string) => void }) {
  const actual = isActualStatus(line.status);
  // The month is already clear from the day; "DeskFlex · North America · Paid Search"
  const budget = line.budget_label?.split(" · ").slice(1).join(" · ");
  return (
    <li className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-border bg-background px-2.5 py-2 text-xs">
      <Link to={`/initiatives/${line.initiative_id}/costs`} className="line-clamp-2 font-medium text-foreground underline-offset-2 hover:underline">
        {line.initiative_name}
      </Link>
      <span className="flex items-center justify-between gap-2">
        <span
          className={`font-semibold tabular-nums ${actual ? "text-foreground" : "text-muted-foreground"}`}
          title={actual ? undefined : "Not billed yet, so not counted as spent"}
        >
          {formatMoney(line.amount, line.currency)}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[line.status]}`} aria-hidden />
          {SPEND_STATUS_LABELS[line.status]}
        </span>
      </span>
      {(line.description || line.vendor || line.category_name) && (
        <span className="truncate text-muted-foreground" title={[line.description ?? line.category_name, line.vendor].filter(Boolean).join(" · ")}>
          {[line.description ?? line.category_name, line.vendor].filter(Boolean).join(" · ")}
        </span>
      )}
      {line.budget_id ? (
        <button
          type="button"
          onClick={() => onOpenBudget(line.budget_id as string)}
          className="truncate text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          title={`Counts against ${line.budget_label}`}
        >
          {budget}
        </button>
      ) : line.outside_budget ? (
        <span className="text-muted-foreground" title="Travel is an operating expense. It counts toward the event's cost, not against a marketing budget.">
          Travel, outside budget
        </span>
      ) : (
        <span className="text-amber-700 dark:text-amber-400" title={`No ${line.brand_name} · ${line.market_name} budget covers it`}>
          No budget
        </span>
      )}
    </li>
  );
}

/** Day totals per currency, e.g. "$3,150 · A$3,600" */
function dayTotal(lines: BudgetWeekLine[]) {
  const sums = new Map<string, number>();
  for (const l of lines) sums.set(l.currency, (sums.get(l.currency) ?? 0) + l.amount);
  return [...sums].map(([currency, amount]) => formatMoney(amount, currency)).join(" · ");
}

function DayHeading({ day, isToday }: { day: Date; isToday: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs font-medium uppercase text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</span>
      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-semibold tabular-nums ${
          isToday ? "bg-foreground text-background" : "text-foreground"
        }`}
      >
        {day.getDate()}
      </span>
    </span>
  );
}

// ─── Week ────────────────────────────────────────────────────────────────────

/** Costs for one Monday-to-Sunday week, each on the day it's dated, with how the week's months are pacing */
export default function BudgetWeekView({ weekKey, onOpenBudget }: { weekKey: string; onOpenBudget: (id: string) => void }) {
  const { data, isLoading, isPlaceholderData, error, refetch } = useBudgetWeek(weekKey);
  const today = toIso(new Date());

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = fromIso(weekKey);
        day.setDate(day.getDate() + i);
        const iso = toIso(day);
        return { iso, day, lines: (data?.lines ?? []).filter((l) => l.incurred_on === iso) };
      }),
    [weekKey, data],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
        <p className="text-sm text-red-800 dark:text-red-300">Could not load the costs for {weekName(weekKey)}.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const count = data.lines.length;
  // One card per month, leaving out currencies with nothing available and nothing spent (e.g. all carried forward)
  const months = [...new Set(data.months.map((m) => m.month))]
    .map((month) => data.months.filter((m) => m.month === month && (m.available !== 0 || m.spent_to_date !== 0)))
    .filter((rows) => rows.length > 0);

  return (
    <div className={`flex flex-col gap-5 transition-opacity sm:gap-6 ${isPlaceholderData ? "opacity-60" : ""}`}>
      <section className={`${CARD} overflow-hidden`} aria-label="This week">
        <dl className={`grid grid-cols-1 gap-px bg-border ${months.length === 1 ? "md:grid-cols-2" : months.length > 1 ? "md:grid-cols-3" : ""}`}>
          <div className="flex min-w-0 flex-col gap-1 bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">
              This week · {count} {count === 1 ? "cost" : "costs"}
            </dt>
            {data.totals.length === 0 ? (
              <dd className="text-lg font-semibold text-foreground">Nothing yet</dd>
            ) : (
              data.totals.map((t) => (
                <dd key={t.currency} className="truncate text-sm text-foreground">
                  <span className="text-lg font-semibold tabular-nums">{formatMoney(t.spent, t.currency)}</span>
                  <span className="text-muted-foreground"> spent</span>
                  {t.expected !== t.spent && <span className="text-xs text-muted-foreground"> · {formatMoney(t.expected, t.currency)} expected</span>}
                </dd>
              ))
            )}
          </div>
          {months.map((rows) => (
            <MonthPace key={rows[0].month} rows={rows} />
          ))}
        </dl>
      </section>

      <section className={`${CARD} overflow-hidden`} aria-label={`Costs, ${weekName(weekKey)}`}>
        {count === 0 && (
          <p className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
            No costs are dated this week.
          </p>
        )}

        {/* Wide screens: a calendar week, one column per day */}
        <ol className="hidden grid-cols-7 divide-x divide-border lg:grid">
          {days.map(({ iso, day, lines }) => (
            <li key={iso} className={`flex min-h-64 min-w-0 flex-col ${iso === today ? "bg-muted/40" : ""}`} aria-label={day.toDateString()}>
              <div className="border-b border-border px-2.5 py-2">
                <DayHeading day={day} isToday={iso === today} />
              </div>
              <ul className="flex flex-1 flex-col gap-1.5 p-1.5">
                {lines.map((l) => (
                  <CostItem key={l.id} line={l} onOpenBudget={onOpenBudget} />
                ))}
              </ul>
              {lines.length > 0 && <p className="truncate border-t border-border px-2.5 py-1.5 text-xs font-medium tabular-nums text-foreground">{dayTotal(lines)}</p>}
            </li>
          ))}
        </ol>

        {/* Narrow screens: the days one under another */}
        <ol className="divide-y divide-border lg:hidden">
          {days.map(({ iso, day, lines }) => (
            <li key={iso} className={`flex flex-col gap-2 px-4 py-3 ${iso === today ? "bg-muted/40" : ""}`} aria-label={day.toDateString()}>
              <div className="flex items-center justify-between gap-2">
                <DayHeading day={day} isToday={iso === today} />
                <span className="text-xs tabular-nums text-muted-foreground">{lines.length ? dayTotal(lines) : "No costs"}</span>
              </div>
              {lines.length > 0 && (
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {lines.map((l) => (
                    <CostItem key={l.id} line={l} onOpenBudget={onOpenBudget} />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs text-muted-foreground">
        Costs sit on the date they're entered with: the bill date, or the expected date while they're an estimate. Only invoiced and paid costs count as
        spent; grey amounts aren't billed yet.
      </p>
    </div>
  );
}
