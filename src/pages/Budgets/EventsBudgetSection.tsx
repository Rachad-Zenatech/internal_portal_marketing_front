// Events running in the selected month, with what each was given and what it has cost, on the Budgets & Expenses page
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventOverview } from "@/hooks/useEventManagement";
import type { EventOverviewItem } from "@/types/eventManagement";
import { dateRange, TIMING_DOT, TIMING_LABELS } from "../Events/eventDisplay";
import { formatMoney } from "../Initiatives/format";
import { EVENT_STATUS_LABELS, STATUS_STYLES } from "../Initiatives/status";
import { usageTone } from "./budgetDisplay";

/** First and last day of a "YYYY-MM" month, as "YYYY-MM-DD" */
function monthBounds(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { first: `${monthKey}-01`, last: `${monthKey}-${String(last).padStart(2, "0")}` };
}

/** Events with dates that overlap the month; drafts are left out */
export function eventsInMonth(events: EventOverviewItem[], monthKey: string, brandName: string | null) {
  const { first, last } = monthBounds(monthKey);
  return events
    .filter((e) => e.status !== "DRAFT" && e.start_date && e.start_date <= last && (e.end_date ?? e.start_date) >= first)
    .filter((e) => !brandName || e.brand_name === brandName)
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
}

function SpentBar({ spent, budget, currency }: { spent: number; budget: number | null; currency: string }) {
  const percent = budget ? (spent / budget) * 100 : null;
  const tone = usageTone(percent, percent !== null && percent > 100);
  return (
    <div className="min-w-[120px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium tabular-nums text-foreground">{formatMoney(spent, currency)}</span>
        {percent !== null && <span className={`text-xs tabular-nums ${tone.text}`}>{Math.round(percent)}%</span>}
      </div>
      {percent !== null && (
        <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(Math.max(percent, spent > 0 ? 3 : 0), 100)}%` }} />
        </span>
      )}
    </div>
  );
}

function Travel({ e }: { e: EventOverviewItem }) {
  if (!e.travel_budget_amount) return <span className="text-xs text-muted-foreground">No travel budget</span>;
  const over = e.travel_spent > e.travel_budget_amount;
  return (
    <span className={`text-sm tabular-nums ${over ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
      {formatMoney(e.travel_spent, e.currency)} <span className="text-muted-foreground">of {formatMoney(e.travel_budget_amount, e.currency)}</span>
    </span>
  );
}

function Status({ e }: { e: EventOverviewItem }) {
  return (
    <div className="flex flex-col items-start gap-1 text-xs">
      <Badge variant="outline" className={STATUS_STYLES[e.status as keyof typeof STATUS_STYLES] ?? ""}>
        {EVENT_STATUS_LABELS[e.status as keyof typeof EVENT_STATUS_LABELS] ?? e.status}
      </Badge>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${TIMING_DOT[e.timing]}`} />
        {TIMING_LABELS[e.timing]}
      </span>
    </div>
  );
}

interface Props {
  monthKey: string;
  monthName: string;
  /** Name of the brand chosen in the filters, if any */
  brandName: string | null;
}

/** Each event in the month: budget, expected cost, spent so far and travel, linking to the event */
export default function EventsBudgetSection({ monthKey, monthName, brandName }: Props) {
  const { data, isLoading, error } = useEventOverview("");
  const events = eventsInMonth(data ?? [], monthKey, brandName);

  // Totals per currency, never added across currencies
  const totals = new Map<string, { budget: number; expected: number; spent: number }>();
  for (const e of events) {
    if (e.status === "CANCELLED") continue;
    const t = totals.get(e.currency) ?? { budget: 0, expected: 0, spent: 0 };
    t.budget += e.budget_amount ?? 0;
    t.expected += e.expected_cost;
    t.spent += e.actual_cost;
    totals.set(e.currency, t);
  }

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (error) return <p className={`${DASH_CARD} px-4 py-6 text-sm text-muted-foreground`}>Could not load the events.</p>;
  if (events.length === 0) {
    return (
      <div className={`${DASH_CARD} flex flex-col items-center gap-2 px-4 py-8 text-center`}>
        <CalendarDays className="h-7 w-7 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">No events in {monthName}.</p>
      </div>
    );
  }

  const head = "px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap";
  const cell = "px-3 py-3 align-top";
  return (
    <div className={`${DASH_CARD} min-w-0 overflow-hidden`}>
      {totals.size > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          {[...totals.entries()].map(([currency, t]) => (
            <span key={currency} className="tabular-nums">
              <span className="font-medium text-foreground">{formatMoney(t.budget, currency)}</span> event budgets ·{" "}
              <span className="font-medium text-foreground">{formatMoney(t.expected, currency)}</span> expected ·{" "}
              <span className="font-medium text-foreground">{formatMoney(t.spent, currency)}</span> spent
            </span>
          ))}
        </div>
      )}

      {/* Wide screens: a table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className={head}>Event</th>
              <th className={head}>Dates</th>
              <th className={`${head} text-right`}>Budget</th>
              <th className={`${head} text-right`}>Expected</th>
              <th className={`${head} w-44`}>Spent</th>
              <th className={head}>Travel</th>
              <th className={head}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((e) => (
              <tr key={e.id} className={`transition-colors hover:bg-muted/40 ${e.status === "CANCELLED" ? "opacity-60" : ""}`}>
                <td className={cell}>
                  <Link to={`/events/${e.id}`} className="font-medium text-foreground underline-offset-2 hover:underline">
                    {e.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{[e.event_code, e.brand_name, e.city].filter(Boolean).join(" · ")}</span>
                </td>
                <td className={`${cell} whitespace-nowrap text-muted-foreground`}>{dateRange(e.start_date, e.end_date)}</td>
                <td className={`${cell} text-right tabular-nums text-foreground`}>{e.budget_amount ? formatMoney(e.budget_amount, e.currency) : "-"}</td>
                <td className={`${cell} text-right tabular-nums text-foreground`}>{formatMoney(e.expected_cost, e.currency)}</td>
                <td className={cell}>
                  <SpentBar spent={e.actual_cost} budget={e.budget_amount} currency={e.currency} />
                </td>
                <td className={cell}>
                  <Travel e={e} />
                </td>
                <td className={cell}>
                  <Status e={e} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones and tablets: cards */}
      <div className="flex flex-col divide-y divide-border lg:hidden">
        {events.map((e) => (
          <Link key={e.id} to={`/events/${e.id}`} className={`flex flex-col gap-2.5 p-4 transition-colors hover:bg-muted/40 ${e.status === "CANCELLED" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{e.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {dateRange(e.start_date, e.end_date)} · {e.brand_name}
                </p>
              </div>
              <Status e={e} />
            </div>
            <SpentBar spent={e.actual_cost} budget={e.budget_amount} currency={e.currency} />
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Budget {e.budget_amount ? formatMoney(e.budget_amount, e.currency) : "-"} · Expected {formatMoney(e.expected_cost, e.currency)}
              </span>
              <span>
                Travel <Travel e={e} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
