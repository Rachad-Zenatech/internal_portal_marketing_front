import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Upload } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import PeriodSelect from "@/components/dashboard/PeriodSelect";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventsOverview } from "@/hooks/useEventsOverview";
import { useInitiatives } from "@/hooks/useInitiatives";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { EventsOverviewFilters } from "@/types/eventsOverview";
import type { InitiativeListItem, InitiativeStatus } from "@/types/initiatives";
import HubSpotSyncStatus from "../HubSpot/HubSpotSyncStatus";
import CostSheetUpload from "../Initiatives/CostSheetUpload";
import { EVENT_STATUS_LABELS } from "../Initiatives/status";
import { DEFAULT_EVENT_PERIOD, EVENT_PERIOD_OPTIONS, eventPeriodRange, parseEventPeriod, type EventPeriodKey } from "./eventPerformanceDisplay";
import EventDetailPanel from "./EventDetailPanel";
import EventsDashboard from "./EventsDashboard";
import EventsList from "./EventsList";
import ImportEventDataDialog from "./ImportEventDataDialog";
import NavanSyncStatus from "./NavanSyncStatus";

const ANY = "ANY";
const STATUSES: InitiativeStatus[] = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"];
// Kept in the URL; "region" is the market, "type" the event type
const FILTER_PARAMS = ["brand", "region", "type", "owner", "status", "currency"];

const TABS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "events", label: "Events" },
] as const;
type Tab = (typeof TABS)[number]["value"];

type UploadTarget = Pick<InitiativeListItem, "id" | "name" | "currency">;

/**
 * The Events Overview: the events Navan has bookings for, matched to what HubSpot has for them. A Dashboard comparing
 * the events, the list of every event, and (from the list) one event in full in a side panel.
 */
export default function EventsPage() {
  const { hasPermission } = useAuth();
  const canImport = hasPermission("INITIATIVES_UPDATE");
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reference } = useReferenceData();
  const [importOpen, setImportOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState<UploadTarget | null>(null);

  // Everything picked is kept in the URL, so a view can be shared or bookmarked
  const tabParam = searchParams.get("tab");
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : "dashboard";
  const period = parseEventPeriod(searchParams.get("period"));
  const brand = searchParams.get("brand") ?? "";
  const region = searchParams.get("region") ?? "";
  const eventType = searchParams.get("type") ?? "";
  const owner = searchParams.get("owner") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const status = STATUSES.includes(statusParam as InitiativeStatus) ? statusParam : "";
  const currencyParam = searchParams.get("currency") ?? "";
  const openEvent = searchParams.get("event");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    FILTER_PARAMS.forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };
  // Opening an event adds a history step, so the browser's back button closes it
  const openPanel = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("event", id);
    setSearchParams(next, { replace: Boolean(openEvent) });
  };
  const closePanel = () => setParam("event", null);

  const filters = useMemo<EventsOverviewFilters>(() => {
    const f: EventsOverviewFilters = { ...(eventPeriodRange(period) ?? {}) };
    if (brand) f.brand_id = Number(brand);
    if (region) f.market_id = Number(region);
    if (eventType) f.event_type_id = Number(eventType);
    if (owner) f.owner_user_id = owner;
    if (status) f.status = status;
    return f;
  }, [period, brand, region, eventType, owner, status]);
  const overview = useEventsOverview(filters);
  const data = overview.data;
  const loading = overview.isLoading;

  // Every event, for the owner filter and the event to import data for
  const eventsChannel = reference?.channels.find((c) => c.code === "EVENTS");
  const allEvents = useInitiatives({ channel_id: eventsChannel?.id, limit: 200 }, Boolean(eventsChannel));

  // Money is never added across currencies: the dashboard shows one currency at a time (the one with the most cost first)
  const currencies = useMemo(
    () => [...(data?.totals ?? [])].sort((a, b) => (b.actual_spend ?? 0) - (a.actual_spend ?? 0) || b.event_count - a.event_count).map((t) => t.currency),
    [data],
  );
  const currency = currencies.includes(currencyParam) ? currencyParam : (currencies[0] ?? "USD");
  const periodLabel = EVENT_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";

  const filtered = FILTER_PARAMS.some((k) => searchParams.get(k));
  const nothing = !loading && !overview.error && (data?.events.length ?? 0) === 0;

  const brandOptions = [{ value: ANY, label: "All brands" }, ...(reference?.brands ?? []).map((b) => ({ value: String(b.id), label: b.name }))];
  const regionOptions = [{ value: ANY, label: "All regions" }, ...(reference?.markets ?? []).map((m) => ({ value: String(m.id), label: m.name }))];
  const typeOptions = [{ value: ANY, label: "All types" }, ...(reference?.event_types ?? []).map((t) => ({ value: String(t.id), label: t.name }))];
  const owners = new Map<string, string>();
  for (const e of allEvents.data?.items ?? []) if (e.owner_user_id) owners.set(e.owner_user_id, e.owner_name ?? "Unknown");
  if (owner && !owners.has(owner)) owners.set(owner, "Selected owner");
  const ownerOptions = [{ value: ANY, label: "All owners" }, ...[...owners].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => ({ value: id, label: name }))];
  const statusOptions = [{ value: ANY, label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: EVENT_STATUS_LABELS[s] }))];

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <DashboardHeader
        title="Events Overview"
        subtitle="Events from HubSpot with their leads and results, plus the Navan travel booked for them, their cost and budget."
        actions={
          <>
            <NavanSyncStatus />
            <HubSpotSyncStatus />
            <PeriodSelect<EventPeriodKey> value={period} onChange={(p) => setParam("period", p === DEFAULT_EVENT_PERIOD ? null : p)} options={EVENT_PERIOD_OPTIONS} />
            {canImport && (
              <Button onClick={() => setImportOpen(true)} className="h-9 gap-2">
                <Upload className="h-4 w-4" />
                Import Event Data
              </Button>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setParam("tab", v === "dashboard" ? null : v)} className="min-w-0 gap-0">
        <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
          <TabsList className="h-9">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="px-3">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <FilterBar onClear={filtered ? clearFilters : undefined}>
        <FilterSelect label="Brand" value={brand || ANY} onChange={(v) => setParam("brand", v === ANY ? null : v)} options={brandOptions} />
        <FilterSelect label="Region" value={region || ANY} onChange={(v) => setParam("region", v === ANY ? null : v)} options={regionOptions} />
        <FilterSelect label="Event Type" value={eventType || ANY} onChange={(v) => setParam("type", v === ANY ? null : v)} options={typeOptions} />
        <FilterSelect label="Owner" value={owner || ANY} onChange={(v) => setParam("owner", v === ANY ? null : v)} options={ownerOptions} />
        <FilterSelect label="Event Status" value={status || ANY} onChange={(v) => setParam("status", v === ANY ? null : v)} options={statusOptions} />
        {currencies.length > 1 && (
          <FilterSelect label="Currency" value={currency} onChange={(v) => setParam("currency", v === currencies[0] ? null : v)} options={currencies.map((c) => ({ value: c, label: c }))} />
        )}
      </FilterBar>

      {overview.error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">{overview.error.message || "Could not load the events."}</p>
          <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
            Try again
          </Button>
        </div>
      ) : nothing ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">No events in this period.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Try a longer period{filtered ? " or clear the filters above" : ""}. Drafts and events without dates aren't shown here.
          </p>
        </div>
      ) : (
        <div className={`min-w-0 transition-opacity ${overview.isPlaceholderData ? "opacity-60" : ""}`}>
          {tab === "dashboard" ? (
            <EventsDashboard data={data} loading={loading} currency={currency} periodLabel={periodLabel} />
          ) : (
            <EventsList events={data?.events ?? []} loading={loading} onOpen={openPanel} />
          )}
        </div>
      )}

      <EventDetailPanel eventId={openEvent} onClose={closePanel} />

      {canImport && (
        <>
          <ImportEventDataDialog open={importOpen} onOpenChange={setImportOpen} events={allEvents.data?.items ?? []} loading={allEvents.isLoading} onPick={setUploadFor} />
          {uploadFor && <CostSheetUpload open onOpenChange={(open) => !open && setUploadFor(null)} initiative={uploadFor} />}
        </>
      )}
    </div>
  );
}
