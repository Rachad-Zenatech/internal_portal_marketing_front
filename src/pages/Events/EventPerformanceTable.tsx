import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, MapPin, Search, Video } from "lucide-react";
import InfoTip from "@/components/dashboard/InfoTip";
import { downloadCsv } from "@/components/dashboard/csv";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EventPerformance } from "@/types/eventPerformance";
import { formatDate } from "../Initiatives/format";
import { fmtCount, fmtMoney, fmtUnitCost } from "../PaidAds/adsDisplay";
import { dateRange, eventPlace } from "./eventDisplay";
import { COST_GROUP_LABELS, COST_GROUPS, EVENT_METRIC_INFO, fmtRoi, RESULT_LABELS, RESULT_PILL } from "./eventPerformanceDisplay";

const PAGE_SIZE = 10;

/** Why a result is what it is, for the pill's tooltip */
function resultHint(e: EventPerformance) {
  switch (e.result) {
    case "SUCCESSFUL":
      return "Made a profit: ROI above 0%.";
    case "NOT_SUCCESSFUL":
      return "Broke even or lost money.";
    case "TOO_EARLY":
      return e.matures_on ? `Deals are still closing. Judged from ${formatDate(e.matures_on)}.` : "Deals are still closing.";
    case "AWAITING_REVENUE":
      return "The time to judge it has passed, but no revenue is recorded yet.";
    default:
      return "Hasn't started yet.";
  }
}

export function ResultPill({ e }: { e: EventPerformance }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={`inline-flex cursor-default items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${RESULT_PILL[e.result]}`}>
          {RESULT_LABELS[e.result]}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">{resultHint(e)}</TooltipContent>
    </Tooltip>
  );
}

/** The total cost, with the four groups that make it up on hover */
function CostCell({ e }: { e: EventPerformance }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help font-medium tabular-nums text-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
          {fmtMoney(e.cost, e.currency)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="min-w-48 text-xs">
        <dl className="flex flex-col gap-1">
          {COST_GROUPS.map((g) => (
            <div key={g} className="flex justify-between gap-4">
              <dt>{COST_GROUP_LABELS[g]}</dt>
              <dd className="tabular-nums">{fmtMoney(e.cost_breakdown[g] ?? 0, e.currency)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-current/20 pt-1 font-semibold">
            <dt>Total event cost</dt>
            <dd className="tabular-nums">{fmtMoney(e.cost, e.currency)}</dd>
          </div>
        </dl>
        {e.other_currency_lines > 0 && (
          <p className="mt-1.5 opacity-80">
            {e.other_currency_lines} {e.other_currency_lines === 1 ? "cost line is" : "cost lines are"} in another currency and not counted.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function EventName({ e }: { e: EventPerformance }) {
  const place = e.platform && !e.city ? "Online" : (e.city ?? eventPlace(e));
  return (
    <div className="min-w-0">
      <Link
        to={`/events/${e.id}`}
        onClick={(ev) => ev.stopPropagation()}
        className="block truncate font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {e.name}
      </Link>
      <p className="truncate text-xs text-muted-foreground">{dateRange(e.start_date, e.end_date)}</p>
      <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
        {place && (e.platform && !e.city ? <Video className="h-3 w-3 shrink-0" /> : <MapPin className="h-3 w-3 shrink-0" />)}
        <span className="truncate">{[e.brand_name, place].filter(Boolean).join(" · ")}</span>
      </p>
    </div>
  );
}

function Head({ children, info, right, className = "" }: { children: React.ReactNode; info?: string; right?: boolean; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground ${right ? "text-right" : "text-left"} ${className}`}>
      <span className={`inline-flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
        {children}
        {info && <InfoTip text={info} label={String(children)} />}
      </span>
    </th>
  );
}

function Figure({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
      <dd className={`truncate text-sm font-medium tabular-nums ${className || "text-foreground"}`}>{value}</dd>
    </div>
  );
}

const roiTone = (roi: number | null) => (roi === null ? "" : roi > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400");

interface EventPerformanceTableProps {
  events: EventPerformance[];
  /** Shown when there are no events in this tab */
  emptyText: string;
  /** For the export's file name, e.g. "past" */
  exportName: string;
}

/** One row per event (click to open its workspace), with search, export and pages; a card per event on phones */
export default function EventPerformanceTable({ events, emptyText, exportName }: EventPerformanceTableProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      [e.name, e.event_code ?? "", e.brand_name, e.market_name ?? "", e.city ?? "", e.sub_channel_name ?? ""].some((s) => s.toLowerCase().includes(q)),
    );
  }, [events, query]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const first = shown.length ? current * PAGE_SIZE + 1 : 0;
  const last = Math.min((current + 1) * PAGE_SIZE, shown.length);

  const exportCsv = () =>
    downloadCsv(
      `events-${exportName}.csv`,
      [
        "Event",
        "Code",
        "Brand",
        "Market",
        "Event type",
        "City",
        "Start",
        "End",
        "Currency",
        "Total cost",
        ...COST_GROUPS.map((g) => COST_GROUP_LABELS[g]),
        "Visitors",
        "Leads",
        "Demos",
        "Follow-ups",
        "Customers",
        "Cost per visitor",
        "CPL",
        "Cost per demo",
        "Cost per follow-up",
        "CAC",
        "Revenue",
        "Pipeline",
        "ROI %",
        "Result",
      ],
      shown.map((e) => [
        e.name,
        e.event_code,
        e.brand_name,
        e.market_name,
        e.sub_channel_name,
        e.city ?? (e.platform ? "Online" : ""),
        e.start_date,
        e.end_date,
        e.currency,
        e.cost,
        ...COST_GROUPS.map((g) => e.cost_breakdown[g] ?? 0),
        e.visitors,
        e.leads,
        e.demos,
        e.follow_ups,
        e.customers,
        e.cost_per_visitor,
        e.cost_per_lead,
        e.cost_per_demo,
        e.cost_per_follow_up,
        e.cost_per_customer,
        e.revenue,
        e.pipeline,
        e.roi_percent,
        RESULT_LABELS[e.result],
      ]),
    );

  const cell = "px-3 py-3 align-middle";
  const num = `${cell} text-right tabular-nums text-foreground`;

  return (
    <div className={`${DASH_CARD} min-w-0 overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-foreground">Event performance</h3>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(ev) => {
                setQuery(ev.target.value);
                setPage(0);
              }}
              placeholder="Search events"
              aria-label="Search events"
              className="h-9 pl-8"
            />
          </div>
          <Button variant="outline" className="h-9 gap-2" onClick={exportCsv} disabled={shown.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{query ? "No events match your search." : emptyText}</p>
      ) : (
        <>
          {/* Large screens: a table (scrolls sideways inside the card) */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <Head>Event</Head>
                  <Head right info={EVENT_METRIC_INFO.cost}>
                    Total cost
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.visitors}>
                    Visitors
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.leads}>
                    Leads
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.demos}>
                    Demos
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.followUps}>
                    Follow-ups
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.customers}>
                    Customers
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.cpl}>
                    CPL
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.costPerDemo}>
                    Cost per demo
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.cac}>
                    CAC
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.revenue}>
                    Revenue
                  </Head>
                  <Head right info={EVENT_METRIC_INFO.roi}>
                    ROI
                  </Head>
                  <Head info={EVENT_METRIC_INFO.successful}>Result</Head>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((e) => (
                  <tr key={e.id} onClick={() => navigate(`/events/${e.id}`)} className="cursor-pointer transition-colors hover:bg-muted/40">
                    <td className={`${cell} max-w-72`}>
                      <EventName e={e} />
                    </td>
                    <td className={`${cell} text-right`}>
                      <CostCell e={e} />
                    </td>
                    <td className={num}>{fmtCount(e.visitors)}</td>
                    <td className={num}>{fmtCount(e.leads)}</td>
                    <td className={num}>{fmtCount(e.demos)}</td>
                    <td className={num}>{fmtCount(e.follow_ups)}</td>
                    <td className={num}>{fmtCount(e.customers)}</td>
                    <td className={num}>{fmtUnitCost(e.cost_per_lead, e.currency)}</td>
                    <td className={num}>{fmtUnitCost(e.cost_per_demo, e.currency)}</td>
                    <td className={num}>{fmtUnitCost(e.cost_per_customer, e.currency)}</td>
                    <td className={num}>{fmtMoney(e.revenue, e.currency)}</td>
                    <td className={`${num} font-medium ${roiTone(e.roi_percent)}`}>{fmtRoi(e.roi_percent)}</td>
                    <td className={cell}>
                      <ResultPill e={e} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: a card per event */}
          <ul className="flex flex-col divide-y divide-border lg:hidden">
            {pageRows.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <EventName e={e} />
                  <ResultPill e={e} />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Total cost <CostCell e={e} />
                </p>
                <dl className="grid grid-cols-3 gap-3">
                  <Figure label="Visitors" value={fmtCount(e.visitors)} />
                  <Figure label="Leads" value={fmtCount(e.leads)} />
                  <Figure label="Demos" value={fmtCount(e.demos)} />
                  <Figure label="Follow-ups" value={fmtCount(e.follow_ups)} />
                  <Figure label="Customers" value={fmtCount(e.customers)} />
                  <Figure label="CPL" value={fmtUnitCost(e.cost_per_lead, e.currency)} />
                  <Figure label="Cost per demo" value={fmtUnitCost(e.cost_per_demo, e.currency)} />
                  <Figure label="CAC" value={fmtUnitCost(e.cost_per_customer, e.currency)} />
                  <Figure label="Revenue" value={fmtMoney(e.revenue, e.currency)} />
                  <Figure label="ROI" value={fmtRoi(e.roi_percent)} className={roiTone(e.roi_percent)} />
                </dl>
                <Link
                  to={`/events/${e.id}`}
                  className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Open event
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {first}-{last} of {shown.length} {shown.length === 1 ? "event" : "events"}
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
    </div>
  );
}
