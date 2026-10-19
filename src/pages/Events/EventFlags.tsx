import { Link } from "react-router-dom";
import { AlertTriangle, CircleAlert, Clock, Flag, Info } from "lucide-react";
import { DASH_CARD } from "@/components/dashboard/tones";
import type { EventPerformance } from "@/types/eventPerformance";
import { fmtMoney } from "../PaidAds/adsDisplay";
import { isoDate } from "../PaidAds/adsPeriods";
import { missingLeads } from "./eventPerformanceDisplay";

type Severity = "problem" | "warning" | "info";

interface EventFlag {
  key: string;
  severity: Severity;
  text: React.ReactNode;
  /** The event it's about, for the link */
  event?: EventPerformance;
}

const SEVERITY: Record<Severity, { icon: React.ElementType; label: string; className: string }> = {
  problem: { icon: CircleAlert, label: "Problem", className: "text-red-600 dark:text-red-400" },
  warning: { icon: AlertTriangle, label: "Check", className: "text-amber-600 dark:text-amber-400" },
  info: { icon: Info, label: "Note", className: "text-blue-600 dark:text-blue-400" },
};
const ORDER: Record<Severity, number> = { problem: 0, warning: 1, info: 2 };
const MAX_FLAGS = 8;

const noResults = (e: EventPerformance) => [e.attendees, e.leads, e.qualified_leads, e.demos, e.customers].every((n) => n === null);

/** What needs attention across the events shown, worked out from their figures (never typed in) */
export function eventFlags(events: EventPerformance[], today = isoDate(new Date())): EventFlag[] {
  const flags: EventFlag[] = [];
  for (const e of events) {
    const money = (n: number) => fmtMoney(n, e.currency);
    const budget = e.approved_budget;
    if (budget !== null && e.actual_cost > budget) {
      flags.push({ key: `over-${e.id}`, severity: "problem", event: e, text: <>is over budget: {money(e.actual_cost)} spent against {money(budget)} approved.</> });
    } else if (budget !== null && e.actual_cost + e.awaiting_cost > budget) {
      flags.push({
        key: `heading-${e.id}`,
        severity: "warning",
        event: e,
        text: <>is heading over budget: {money(e.actual_cost + e.awaiting_cost)} with the invoices still due, against {money(budget)} approved.</>,
      });
    }
    const ended = (e.end_date ?? e.start_date) < today;
    if (e.status === "COMPLETED" && noResults(e)) {
      flags.push({ key: `results-${e.id}`, severity: "warning", event: e, text: <>has no results recorded yet.</> });
    } else if (missingLeads(e)) {
      flags.push({ key: `leads-${e.id}`, severity: "warning", event: e, text: <>has no leads recorded yet.</> });
    }
    if (ended && e.awaiting_cost > 0) {
      flags.push({ key: `awaiting-${e.id}`, severity: "info", event: e, text: <>has ended with {money(e.awaiting_cost)} still awaiting invoices.</> });
    }
    if (budget === null) {
      flags.push({ key: `budget-${e.id}`, severity: "info", event: e, text: <>has no budget set.</> });
    }
    if (e.other_currency_lines > 0) {
      flags.push({
        key: `currency-${e.id}`,
        severity: "info",
        event: e,
        text: <>has {e.other_currency_lines} {e.other_currency_lines === 1 ? "cost" : "costs"} in another currency, left out of its totals.</>,
      });
    }
  }
  return flags.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export default function EventFlags({ events }: { events: EventPerformance[] }) {
  const flags = eventFlags(events);
  const shown = flags.slice(0, MAX_FLAGS);
  return (
    <section className={`${DASH_CARD} flex flex-col gap-3 p-4 sm:flex-row sm:gap-5 sm:p-5`} aria-labelledby="event-flags-title">
      <div className="flex items-center gap-3 sm:w-52 sm:shrink-0 sm:items-start">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Flag className="h-4 w-4" />
        </span>
        <div>
          <h2 id="event-flags-title" className="text-base font-semibold text-foreground">
            Event Notes & Flags
          </h2>
          <p className="text-xs text-muted-foreground">Worked out from the figures, for the events shown.</p>
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="flex items-center gap-2 self-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          Nothing needs attention: every event has a budget, is within it, and has results recorded.
        </p>
      ) : (
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
          {shown.map((f) => {
            const s = SEVERITY[f.severity];
            const Icon = s.icon;
            return (
              <li key={f.key} className="flex min-w-0 items-start gap-2 text-sm">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.className}`} aria-label={s.label} />
                <span className="min-w-0 text-foreground">
                  {f.event && (
                    <Link to={`/events/${f.event.id}`} className="font-medium text-primary underline-offset-2 hover:underline">
                      {f.event.name}
                    </Link>
                  )}{" "}
                  {f.text}
                </span>
              </li>
            );
          })}
          {flags.length > shown.length && (
            <li className="text-xs text-muted-foreground">
              And {flags.length - shown.length} more. Use the filters to narrow the events down.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
