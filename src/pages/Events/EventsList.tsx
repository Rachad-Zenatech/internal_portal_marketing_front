// The Events tab of the Events Overview: every Navan event with its budget, cost, travel and HubSpot results
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Download, Link2, Search } from "lucide-react";
import { downloadCsv } from "@/components/dashboard/csv";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appStorage } from "@/lib/storage";
import type { EventOverviewRow } from "@/types/eventsOverview";
import { DASH, fmtCount, fmtMoney, fmtUnitCost } from "../PaidAds/adsDisplay";
import { formatDay } from "../PaidAds/overviewDisplay";
import { displayStatus, eventRegion, STATUS_PILL, statusLabel } from "./eventPerformanceDisplay";

const PAGE_SIZE = 10;
const COLUMNS_KEY = "events-overview-columns";

type ColumnKey =
  | "brand"
  | "region"
  | "dates"
  | "status"
  | "budget"
  | "cost"
  | "variance"
  | "prior"
  | "demos"
  | "revenue"
  | "travel"
  | "people"
  | "registered"
  | "attended"
  | "leads"
  | "firstTouch"
  | "influenced"
  | "cpc"
  | "mqls"
  | "sqls"
  | "customers"
  | "hubspot"
  | "navan";

interface Column {
  key: ColumnKey;
  label: string;
  info?: string;
  right?: boolean;
  /** Hidden until picked */
  optional?: boolean;
}

const COLUMNS: Column[] = [
  { key: "brand", label: "Brand", optional: true },
  { key: "region", label: "Location" },
  { key: "dates", label: "Dates" },
  { key: "status", label: "Status" },
  { key: "budget", label: "Budget", right: true, info: "Approved budget" },
  { key: "cost", label: "Actual Cost", right: true, info: "Invoiced and paid costs, plus the Navan travel booked" },
  { key: "variance", label: "Variance", right: true, optional: true, info: "Budget less actual cost; negative when over budget" },
  { key: "prior", label: "Prior Year", right: true, optional: true, info: "The cost of the same event a year earlier" },
  { key: "demos", label: "Demos", right: true, optional: true, info: "Demos given at the event (its demo log, or typed in)" },
  { key: "revenue", label: "Revenue", right: true, optional: true, info: "Revenue recorded for the event" },
  { key: "travel", label: "Navan Travel", right: true, info: "Flights, hotels and other travel booked through Navan" },
  { key: "people", label: "Travellers", right: true, info: "People on the event's Navan bookings" },
  { key: "registered", label: "Registered", right: true, optional: true, info: "Registrations on the HubSpot marketing event" },
  { key: "attended", label: "Attended", right: true, info: "Attendees on the HubSpot marketing event" },
  { key: "leads", label: "Leads", right: true, info: "Contacts on the event's HubSpot lists (its campaign's, else a list named like the event). Without lists, the contacts credited to its campaign." },
  { key: "firstTouch", label: "First Touch", right: true, optional: true, info: "Contacts HubSpot credits to the event's campaign as a first touch" },
  { key: "influenced", label: "Influenced", right: true, optional: true, info: "HubSpot contacts the event's campaign influenced" },
  { key: "cpc", label: "Cost / Lead", right: true, info: "Actual cost divided by the HubSpot leads" },
  { key: "mqls", label: "MQLs", right: true, info: "Among the leads, from HubSpot" },
  { key: "sqls", label: "SQLs", right: true, info: "Among the leads, from HubSpot" },
  { key: "customers", label: "Customers", right: true, optional: true },
  { key: "hubspot", label: "HubSpot", info: "The HubSpot campaign / marketing event of this event" },
  { key: "navan", label: "Navan", info: "The Navan trips joined to this event" },
];
const DEFAULT_HIDDEN = COLUMNS.filter((c) => c.optional).map((c) => c.key);

function readHidden(): ColumnKey[] {
  try {
    const saved = JSON.parse(appStorage.getItem(COLUMNS_KEY) ?? "null");
    return Array.isArray(saved) ? saved.filter((k) => COLUMNS.some((c) => c.key === k)) : DEFAULT_HIDDEN;
  } catch {
    return DEFAULT_HIDDEN;
  }
}

/** The value a column sorts and exports by */
function sortValue(key: ColumnKey, e: EventOverviewRow): number | string | null {
  switch (key) {
    case "brand":
      return e.brand_name;
    case "region":
      return eventRegion(e);
    case "dates":
      return e.start_date;
    case "status":
      return statusLabel(e);
    case "budget":
      return e.approved_budget;
    case "cost":
      return e.actual_cost;
    case "variance":
      return e.variance;
    case "prior":
      return e.prior_year_cost;
    case "demos":
      return e.demos;
    case "revenue":
      return e.revenue;
    case "travel":
      return e.navan.travel_cost;
    case "people":
      return e.navan.travellers;
    case "registered":
      return e.turnout.registrants;
    case "attended":
      return e.turnout.attended;
    case "leads":
      return e.turnout.leads;
    case "firstTouch":
      return e.turnout.new_contacts;
    case "influenced":
      return e.turnout.influenced_contacts;
    case "cpc":
      return e.hubspot_cost_per_lead;
    case "mqls":
      return e.turnout.mqls;
    case "sqls":
      return e.turnout.sqls;
    case "customers":
      return e.turnout.customers;
    case "navan":
      return e.navan_events.length;
    case "hubspot":
      return e.hubspot.method === "NONE" ? 0 : 1;
  }
}

export function MatchPill({ e }: { e: EventOverviewRow }) {
  const { method, campaign, marketing_event: marketingEvent, picked_none: pickedNone } = e.hubspot;
  if (method === "NONE") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground" title={pickedNone ? "Marked as having no HubSpot match" : "No HubSpot campaign or marketing event matches this event's name"}>
        {pickedNone ? "No match (set)" : "Not matched"}
      </span>
    );
  }
  const what = [campaign && `Campaign: ${campaign.name}`, marketingEvent && `Marketing event: ${marketingEvent.name}`].filter(Boolean).join(" · ");
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300"
      title={`${what} (${method === "CAMPAIGN" ? "this event is the HubSpot campaign" : method === "MANUAL" ? "linked by hand" : "matched by name"})`}
    >
      <Link2 className="h-3 w-3" />
      {campaign && marketingEvent ? "Campaign + event" : campaign ? "Campaign" : "Marketing event"}
    </span>
  );
}

/** Where the event's leads come from, for a tooltip */
export function leadsBasis(e: EventOverviewRow): string {
  switch (e.turnout.leads_basis) {
    case "CAMPAIGN_LISTS":
      return "Contacts on the event's campaign lists";
    case "NAMED_LIST":
      return `Contacts on the HubSpot list "${e.turnout.leads_list_name}" (matched by name)`;
    case "FIRST_TOUCH":
      return "No lists found: contacts credited to the event's campaign as a first touch";
    case "TYPED":
      return "Typed in: HubSpot has no leads for this event";
    default:
      return "No HubSpot leads found for this event";
  }
}

/** A cost or budget taken from the HubSpot campaign (the portal has none) says so on hover */
function hubspotMark(source: "HUBSPOT" | null, what: string, shown: string, currency: string): React.ReactNode {
  return source === "HUBSPOT" ? <span title={`The HubSpot campaign's ${what === "cost" ? "spend" : "budget"}, in ${currency}: the portal has none for this event`}>{shown}*</span> : shown;
}

/** A figure someone typed in (HubSpot had none) says so on hover */
function typedMark(e: EventOverviewRow, field: string, shown: string): React.ReactNode {
  return e.turnout.typed_fields.includes(field) ? <span title="Typed in: HubSpot has nothing for this">{shown}*</span> : shown;
}

/** Whether Navan trips are joined to a HubSpot event */
function NavanPill({ e }: { e: EventOverviewRow }) {
  if (e.source === "NAVAN") return <span className="text-xs text-muted-foreground">Navan only</span>;
  if (e.navan_events.length === 0) return <span className="text-xs text-muted-foreground">No trip</span>;
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300" title={e.navan_events.map((t) => t.name).join(", ")}>
      {e.navan_events.length === 1 ? "1 trip" : `${e.navan_events.length} trips`}
    </span>
  );
}

function cell(key: ColumnKey, e: EventOverviewRow): React.ReactNode {
  const money = (n: number | null) => fmtMoney(n, e.currency);
  switch (key) {
    case "brand":
      return e.brand_name;
    case "region":
      return eventRegion(e) ?? DASH;
    case "dates":
      return e.end_date && e.end_date !== e.start_date ? `${formatDay(e.start_date)} - ${formatDay(e.end_date)}` : formatDay(e.start_date);
    case "status":
      return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_PILL[displayStatus(e)]}`}>{statusLabel(e)}</span>;
    case "budget":
      return hubspotMark(e.budget_source, "budget", money(e.approved_budget), e.currency);
    case "cost":
      return e.actual_cost ? hubspotMark(e.cost_source, "cost", money(e.actual_cost), e.currency) : DASH;
    case "variance":
      return e.variance === null ? DASH : <span className={e.variance < 0 ? "text-red-600 dark:text-red-400" : undefined}>{money(e.variance)}</span>;
    case "prior":
      return money(e.prior_year_cost);
    case "demos":
      return fmtCount(e.demos);
    case "revenue":
      return money(e.revenue);
    case "travel":
      return e.navan.travel_cost ? money(e.navan.travel_cost) : DASH;
    case "people":
      return e.navan.travellers ? fmtCount(e.navan.travellers) : DASH;
    case "registered":
      return fmtCount(e.turnout.registrants);
    case "attended":
      return typedMark(e, "attended", fmtCount(e.turnout.attended));
    case "leads":
      return <span title={leadsBasis(e)}>{fmtCount(e.turnout.leads)}</span>;
    case "firstTouch":
      return fmtCount(e.turnout.new_contacts);
    case "influenced":
      return fmtCount(e.turnout.influenced_contacts);
    case "cpc":
      return fmtUnitCost(e.hubspot_cost_per_lead, e.currency);
    case "mqls":
      return typedMark(e, "mqls", fmtCount(e.turnout.mqls));
    case "sqls":
      return fmtCount(e.turnout.sqls);
    case "customers":
      return typedMark(e, "customers", fmtCount(e.turnout.customers));
    case "navan":
      return <NavanPill e={e} />;
    case "hubspot":
      return <MatchPill e={e} />;
  }
}

type MatchFilter = "ALL" | "MATCHED" | "UNMATCHED";
type BudgetFilter = "ALL" | "OVER" | "NONE";

function exportRows(rows: EventOverviewRow[]) {
  downloadCsv(
    "events-overview.csv",
    [
      "Event", "Code", "Brand", "Region", "City", "Country", "Type", "Owner", "Start", "End", "Status", "Currency", "Approved budget", "Actual cost",
      "Variance", "Prior year cost", "Demos", "Revenue", "Navan travel", "Travel budget", "Navan estimate", "Travellers", "Bookings", "Registered", "Attended", "No-shows",
      "Leads", "Leads from", "First-touch contacts", "Influenced contacts", "Sessions", "Cost per lead", "MQLs", "SQLs", "Opportunities", "Customers", "HubSpot campaign",
      "HubSpot marketing event", "HubSpot match",
    ],
    rows.map((e) => [
      e.name, e.event_code, e.brand_name, e.market_name, e.city, e.country_code, e.event_type_name, e.owner_name, e.start_date, e.end_date, statusLabel(e),
      e.currency, e.approved_budget, e.actual_cost, e.variance, e.prior_year_cost, e.demos, e.revenue, e.navan.travel_cost, e.navan.travel_budget, e.navan.navan_estimate,
      e.navan.travellers, e.navan.bookings, e.turnout.registrants, e.turnout.attended, e.turnout.no_shows, e.turnout.leads, e.turnout.leads_basis, e.turnout.new_contacts,
      e.turnout.influenced_contacts, e.turnout.sessions, e.hubspot_cost_per_lead, e.turnout.mqls, e.turnout.sqls, e.turnout.opportunities, e.turnout.customers,
      e.hubspot.campaign?.name, e.hubspot.marketing_event?.name, e.hubspot.method,
    ]),
  );
}

interface EventsListProps {
  events: EventOverviewRow[];
  loading: boolean;
  onOpen: (id: string) => void;
}

export default function EventsList({ events, loading, onOpen }: EventsListProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [match, setMatch] = useState<MatchFilter>("ALL");
  const [budget, setBudget] = useState<BudgetFilter>("ALL");
  const [hidden, setHidden] = useState<ColumnKey[]>(readHidden);
  const [sort, setSort] = useState<{ key: ColumnKey; dir: "asc" | "desc" }>({ key: "dates", dir: "desc" });

  const toggleColumn = (key: ColumnKey) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    try {
      appStorage.setItem(COLUMNS_KEY, JSON.stringify(next));
    } catch {
      // Not saved; the choice still applies for now
    }
  };
  const columns = COLUMNS.filter((c) => !hidden.includes(c.key));
  const sortBy = (key: ColumnKey) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" }));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = events.filter((e) => {
      if (q && ![e.name, e.event_code ?? "", e.brand_name, e.market_name ?? "", e.city ?? "", e.owner_name ?? "", e.hubspot.campaign?.name ?? "", e.hubspot.marketing_event?.name ?? ""].some((s) => s.toLowerCase().includes(q))) return false;
      if (match === "MATCHED" && e.hubspot.method === "NONE") return false;
      if (match === "UNMATCHED" && e.hubspot.method !== "NONE") return false;
      if (budget === "OVER" && !(e.approved_budget && e.actual_cost > e.approved_budget)) return false;
      if (budget === "NONE" && e.approved_budget) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const x = sortValue(sort.key, a);
      const y = sortValue(sort.key, b);
      // Events without a value go last, whichever way it sorts
      if (x === null && y === null) return a.name.localeCompare(b.name);
      if (x === null) return 1;
      if (y === null) return -1;
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return (sort.dir === "asc" ? order : -order) || a.name.localeCompare(b.name);
    });
    return list;
  }, [events, query, match, budget, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const first = filtered.length ? current * PAGE_SIZE + 1 : 0;
  const last = current * PAGE_SIZE + visible.length;
  const narrowed = Boolean(query) || match !== "ALL" || budget !== "ALL";

  return (
    <section className={`${DASH_CARD} flex min-w-0 flex-col`} aria-labelledby="events-list-title">
      <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
        <h2 id="events-list-title" className="text-base font-semibold text-foreground">
          Events <span className="font-normal text-muted-foreground">({filtered.length} {filtered.length === 1 ? "result" : "results"})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search events"
              aria-label="Search events"
              className="h-9 bg-card pl-8"
            />
          </div>
          <Select
            value={match}
            onValueChange={(v) => {
              setMatch(v as MatchFilter);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-40 bg-card" aria-label="Filter by HubSpot match">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any HubSpot match</SelectItem>
              <SelectItem value="MATCHED">Matched</SelectItem>
              <SelectItem value="UNMATCHED">Not matched</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={budget}
            onValueChange={(v) => {
              setBudget(v as BudgetFilter);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-36 bg-card" aria-label="Filter by budget">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any budget</SelectItem>
              <SelectItem value="OVER">Over budget</SelectItem>
              <SelectItem value="NONE">No budget set</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-2 bg-card">
                <Columns3 className="h-4 w-4" />
                <span className="max-sm:sr-only">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem key={c.key} checked={!hidden.includes(c.key)} onCheckedChange={() => toggleColumn(c.key)} onSelect={(ev) => ev.preventDefault()}>
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="h-9 gap-2 bg-card" onClick={() => exportRows(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }, (_, n) => (
            <div key={n} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{narrowed ? "No events match your search and filters." : "No events for these filters and dates."}</p>
      ) : (
        <>
          {/* Wide screens: the table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Event</th>
                  {columns.map((c) => (
                    <th key={c.key} className={`whitespace-nowrap px-2 py-2.5 font-medium ${c.right ? "text-right" : ""}`} title={c.info} aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                      <button type="button" onClick={() => sortBy(c.key)} className={`inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${c.right ? "flex-row-reverse" : ""}`}>
                        {c.label}
                        {sort.key === c.key && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e.id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40" onClick={() => onOpen(e.id)}>
                    <td className="max-w-64 px-4 py-3">
                      <button
                        type="button"
                        className="block max-w-full truncate text-left font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onOpen(e.id);
                        }}
                      >
                        {e.name}
                      </button>
                      <p className="truncate text-xs text-muted-foreground">{[e.event_code, e.event_type_name].filter(Boolean).join(" · ")}</p>
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className={`whitespace-nowrap px-2 py-3 ${c.right ? "text-right tabular-nums" : ""}`}>
                        {cell(c.key, e)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones and tablets: cards */}
          <ul className="flex flex-col divide-y divide-border lg:hidden">
            {visible.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onOpen(e.id)} className="w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{e.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[e.brand_name, eventRegion(e), formatDay(e.start_date)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {cell("status", e)}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2">
                    {[
                      ["Budget", fmtMoney(e.approved_budget, e.currency)],
                      ["Actual cost", e.actual_cost ? fmtMoney(e.actual_cost, e.currency) : DASH],
                      ["Navan travel", e.navan.travel_cost ? fmtMoney(e.navan.travel_cost, e.currency) : DASH],
                      ["Travellers", e.navan.travellers ? fmtCount(e.navan.travellers) : DASH],
                      ["Attended", fmtCount(e.turnout.attended)],
                      ["Leads", fmtCount(e.turnout.leads)],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-[11px] text-muted-foreground">{label}</dt>
                        <dd className="truncate text-sm font-medium tabular-nums text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3">
                    <MatchPill e={e} />
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {first}-{last} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 tabular-nums">
                {current + 1} / {pages}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
