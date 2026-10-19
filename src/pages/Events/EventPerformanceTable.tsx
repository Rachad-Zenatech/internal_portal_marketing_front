import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, MoreHorizontal, Search, Upload } from "lucide-react";
import InfoTip from "@/components/dashboard/InfoTip";
import { downloadCsv } from "@/components/dashboard/csv";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { countryName } from "@/lib/countries";
import type { CostCategory, EventPerformance } from "@/types/eventPerformance";
import { fmtCount, fmtMoney, fmtUnitCost } from "../PaidAds/adsDisplay";
import { dateRange } from "./eventDisplay";
import {
  COST_CATEGORIES,
  COST_CATEGORY_INFO,
  COST_CATEGORY_LABELS,
  displayStatus,
  EVENT_METRIC_INFO,
  eventRegion,
  fmtRoi,
  STATUS_PILL,
  statusLabel,
} from "./eventPerformanceDisplay";

const PAGE_SIZE = 10;

// ─── Small pieces ────────────────────────────────────────────────────────────

export function StatusPill({ e }: { e: EventPerformance }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_PILL[displayStatus(e)]}`}>{statusLabel(e)}</span>
  );
}

function EventName({ e }: { e: EventPerformance }) {
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
    </div>
  );
}

/** Actual cost - approved budget: above zero (over budget) in red */
function VarianceValue({ e }: { e: EventPerformance }) {
  if (e.variance === null) return <span className="text-muted-foreground">-</span>;
  return (
    <span className={e.variance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
      {e.variance > 0 ? "+" : ""}
      {fmtMoney(e.variance, e.currency)}
    </span>
  );
}

const roiTone = (roi: number | null) => (roi === null ? "" : roi > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400");

// ─── Columns ─────────────────────────────────────────────────────────────────

interface Column {
  key: string;
  label: string;
  info?: string;
  /** Numbers line up on the right */
  numeric?: boolean;
  render: (e: EventPerformance) => React.ReactNode;
  /** The value in the CSV export */
  csv: (e: EventPerformance) => string | number | null;
}

type Formatted = Pick<Column, "render" | "csv" | "numeric">;
const money = (pick: (e: EventPerformance) => number | null): Formatted => ({ numeric: true, render: (e) => fmtMoney(pick(e), e.currency), csv: pick });
const count = (pick: (e: EventPerformance) => number | null): Formatted => ({ numeric: true, render: (e) => fmtCount(pick(e)), csv: pick });
// An empty category shows "-" so the costs that are there stand out
const categoryColumn = (c: CostCategory): Column => ({
  key: `cat_${c}`,
  label: COST_CATEGORY_LABELS[c],
  info: COST_CATEGORY_INFO[c],
  ...money((e) => e.cost_categories?.[c] || null),
  csv: (e) => e.cost_categories?.[c] ?? 0,
});

const COLUMNS: Record<string, Column> = Object.fromEntries(
  (
    [
      { key: "brand", label: "Brand", render: (e) => e.brand_name, csv: (e) => e.brand_name },
      { key: "region", label: "Region", render: (e) => eventRegion(e) ?? "-", csv: (e) => eventRegion(e) },
      { key: "type", label: "Event Type", render: (e) => e.event_type_name ?? "-", csv: (e) => e.event_type_name },
      { key: "owner", label: "Owner", render: (e) => e.owner_name ?? "-", csv: (e) => e.owner_name },
      { key: "budget", label: "Approved Budget", info: EVENT_METRIC_INFO.budget, ...money((e) => e.approved_budget) },
      { key: "actual", label: "Actual Cost", info: EVENT_METRIC_INFO.actual, ...money((e) => e.actual_cost) },
      { key: "prior", label: "Prior Year Cost", info: EVENT_METRIC_INFO.priorYearCost, ...money((e) => e.prior_year_cost) },
      { key: "variance", label: "Variance", info: EVENT_METRIC_INFO.variance, numeric: true, render: (e) => <VarianceValue e={e} />, csv: (e) => e.variance },
      { key: "attendees", label: "Attendees", info: EVENT_METRIC_INFO.attendees, ...count((e) => e.attendees) },
      { key: "leads", label: "Leads", info: EVENT_METRIC_INFO.leads, ...count((e) => e.leads) },
      { key: "qualified", label: "Qualified Leads", info: EVENT_METRIC_INFO.qualifiedLeads, ...count((e) => e.qualified_leads) },
      { key: "demos", label: "Demos", info: EVENT_METRIC_INFO.demos, ...count((e) => e.demos) },
      { key: "customers", label: "Customers", info: EVENT_METRIC_INFO.customers, ...count((e) => e.customers) },
      { key: "cpl", label: "Cost / Lead", info: EVENT_METRIC_INFO.cpl, numeric: true, render: (e) => fmtUnitCost(e.cost_per_lead, e.currency), csv: (e) => e.cost_per_lead },
      { key: "revenue", label: "Revenue", info: EVENT_METRIC_INFO.revenue, ...money((e) => e.revenue) },
      {
        key: "roi",
        label: "ROI",
        info: EVENT_METRIC_INFO.roi,
        numeric: true,
        render: (e) => <span className={`font-medium ${roiTone(e.roi_percent)}`}>{fmtRoi(e.roi_percent)}</span>,
        csv: (e) => e.roi_percent,
      },
      ...COST_CATEGORIES.map(categoryColumn),
      { key: "status", label: "Status", info: EVENT_METRIC_INFO.status, render: (e) => <StatusPill e={e} />, csv: (e) => statusLabel(e) },
    ] satisfies Column[]
  ).map((c) => [c.key, c]),
);

export type EventTableView = "overview" | "comparison" | "costs" | "outcomes";

export const TABLE_VIEWS: { value: EventTableView; label: string; columns: string[] }[] = [
  { value: "overview", label: "Overview", columns: ["region", "actual", "variance", "status"] },
  {
    value: "comparison",
    label: "Event Comparison",
    columns: ["brand", "region", "budget", "actual", "prior", "variance", "leads", "qualified", "demos", "customers", "cpl", "status"],
  },
  { value: "costs", label: "Cost Breakdown", columns: [...COST_CATEGORIES.map((c) => `cat_${c}`), "actual", "status"] },
  { value: "outcomes", label: "Outcomes", columns: ["attendees", "leads", "qualified", "demos", "customers", "revenue", "cpl", "roi", "status"] },
];

function Head({ column }: { column: Column }) {
  return (
    <th className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground ${column.numeric ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1 ${column.numeric ? "flex-row-reverse" : ""}`}>
        {column.label}
        {column.info && <InfoTip text={column.info} label={column.label} />}
      </span>
    </th>
  );
}

function RowMenu({ e, onImport }: { e: EventPerformance; onImport?: (e: EventPerformance) => void }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${e.name}`} onClick={(ev) => ev.stopPropagation()}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
        <DropdownMenuItem onSelect={() => navigate(`/events/${e.id}`)} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Open event
        </DropdownMenuItem>
        {onImport && (
          <DropdownMenuItem onSelect={() => onImport(e)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload cost sheet
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

interface EventPerformanceTableProps {
  events: EventPerformance[];
  view: EventTableView;
  onViewChange: (view: EventTableView) => void;
  /** Shown when there are no events */
  emptyText: string;
  /** Upload a cost sheet for an event (row menu); left out when the person can't */
  onImport?: (e: EventPerformance) => void;
}

/** Tabs for the views, then one row per event (click to open it) with the view's columns, search, CSV export of what's shown, and pages; a card per event below lg */
export default function EventPerformanceTable({ events, view, onViewChange, emptyText, onImport }: EventPerformanceTableProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const columns = (TABLE_VIEWS.find((v) => v.value === view)?.columns ?? []).map((k) => COLUMNS[k]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      [e.name, e.event_code, e.brand_name, e.market_name, e.city, countryName(e.country_code), e.event_type_name, e.owner_name].some((s) => s?.toLowerCase().includes(q)),
    );
  }, [events, query]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const first = shown.length ? current * PAGE_SIZE + 1 : 0;
  const last = Math.min((current + 1) * PAGE_SIZE, shown.length);

  const exportCsv = () =>
    downloadCsv(
      `events-${view}.csv`,
      ["Event", "Code", "Start", "End", "Currency", ...columns.map((c) => c.label)],
      shown.map((e) => [e.name, e.event_code, e.start_date, e.end_date, e.currency, ...columns.map((c) => c.csv(e))]),
    );

  const cell = "px-3 py-3 align-middle";

  return (
    <div className={`${DASH_CARD} min-w-0 overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={view} onValueChange={(v) => onViewChange(v as EventTableView)} className="min-w-0">
          <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
            <TabsList className="h-9">
              {TABLE_VIEWS.map((v) => (
                <TabsTrigger key={v.value} value={v.value} className="px-3">
                  {v.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <div className="flex flex-wrap gap-2">
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
            Export
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{query ? "No events match your search." : emptyText}</p>
      ) : (
        <>
          {/* Large screens: a table (scrolls sideways inside the card when there are many columns) */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm" style={{ minWidth: 280 + columns.length * 115 }}>
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Event</th>
                  {columns.map((c) => (
                    <Head key={c.key} column={c} />
                  ))}
                  <th className="w-10 px-2 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((e) => (
                  <tr key={e.id} onClick={() => navigate(`/events/${e.id}`)} className="cursor-pointer transition-colors hover:bg-muted/40">
                    <td className={`${cell} max-w-72`}>
                      <EventName e={e} />
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className={`${cell} ${c.numeric ? "text-right tabular-nums" : ""} whitespace-nowrap text-foreground`}>
                        {c.render(e)}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-right align-middle">
                      <RowMenu e={e} onImport={onImport} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones and tablets: a card per event with the view's figures */}
          <ul className="flex flex-col divide-y divide-border lg:hidden">
            {pageRows.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <EventName e={e} />
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusPill e={e} />
                    <RowMenu e={e} onImport={onImport} />
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {columns
                    .filter((c) => c.key !== "status")
                    .map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="truncate text-[11px] text-muted-foreground">{c.label}</dt>
                        <dd className="truncate text-sm font-medium tabular-nums text-foreground">{c.render(e)}</dd>
                      </div>
                    ))}
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
              Showing {first}-{last} of {shown.length} {shown.length === 1 ? "event" : "events"}, each in its own currency
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
