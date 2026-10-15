import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ClipboardList, MapPin, Plus, Presentation, Receipt, Search, Users, Video } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventOverview } from "@/hooks/useEventManagement";
import { useAuth } from "@/lib/AuthContext";
import type { EventOverviewItem, EventTiming } from "@/types/eventManagement";
import { formatMoney } from "../Initiatives/format";
import InitiativeFormDialog from "../Initiatives/InitiativeFormDialog";
import { STATUS_LABELS, STATUS_STYLES } from "../Initiatives/status";
import { dateRange, dateTile, eventPlace, nextStep, TIMING_DOT, TIMING_LABELS, whenText } from "./eventDisplay";

/** Which time window the page is showing */
type View = "ALL" | EventTiming;

const GROUP_ORDER: EventTiming[] = ["NOW", "UPCOMING", "UNSCHEDULED", "PAST"];

const matches = (e: EventOverviewItem, view: View) => view === "ALL" || e.timing === view;

/** A small fact on a card; amber only when it needs doing */
function Fact({ icon: Icon, children, warn = false }: { icon: React.ElementType; children: React.ReactNode; warn?: boolean }) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-xs sm:text-[13px] ${warn ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${warn ? "text-amber-500" : "text-muted-foreground/70"}`} />
      <span className="truncate">{children}</span>
    </span>
  );
}

function CostBar({ e }: { e: EventOverviewItem }) {
  if (!e.budget_amount) return null;
  const percent = (e.expected_cost / e.budget_amount) * 100;
  return (
    <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-muted" title={`${Math.round(percent)}% of the budget`}>
      <span
        className={`block h-full rounded-full ${percent > 100 ? "bg-red-500" : percent >= 90 ? "bg-amber-500" : "bg-foreground/70"}`}
        style={{ width: `${Math.min(Math.max(percent, 3), 100)}%` }}
      />
    </span>
  );
}

function EventCard({ e }: { e: EventOverviewItem }) {
  const tile = dateTile(e.start_date);
  const place = eventPlace(e);
  const step = nextStep(e);
  const happened = e.timing === "NOW" || e.timing === "PAST";
  const money = (value: number) => formatMoney(value, e.currency);

  const team =
    e.staff_count === 0
      ? { text: "No team yet", warn: e.timing === "UPCOMING" }
      : e.staff_missing_details > 0
        ? { text: `${e.staff_count} going · ${e.staff_missing_details} need travel details`, warn: true }
        : { text: `${e.staff_count} going${e.staff_booked ? ` · ${e.staff_booked} booked` : ""}`, warn: false };

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card shadow-xs transition-colors hover:border-foreground/20">
      <Link
        to={`/events/${e.id}`}
        className="flex flex-1 gap-3.5 rounded-t-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4"
      >
        {/* A calendar page: month on top, day below */}
        <div className="flex h-14 w-12 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-center">
          <span className="bg-muted py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground">{tile.month}</span>
          <span className="flex flex-1 items-center justify-center text-lg font-semibold leading-none text-foreground">{tile.day}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TIMING_DOT[e.timing]}`} />
              <span className="truncate">{whenText(e)}</span>
            </div>
            <div className="mt-1 flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-medium text-foreground group-hover:underline group-hover:underline-offset-2">{e.name}</h3>
              <Badge variant="outline" className={`hidden shrink-0 sm:inline-flex ${STATUS_STYLES[e.status as keyof typeof STATUS_STYLES] ?? ""}`}>
                {STATUS_LABELS[e.status as keyof typeof STATUS_LABELS] ?? e.status}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{[e.event_code, e.sub_channel_name, e.brand_name].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Fact icon={CalendarDays}>{dateRange(e.start_date, e.end_date)}</Fact>
            {place && <Fact icon={e.platform && !e.city ? Video : MapPin}>{place}</Fact>}
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-border pt-3 sm:grid-cols-2">
            <Fact icon={Users} warn={team.warn}>
              {team.text}
            </Fact>
            <div className="min-w-0">
              <Fact icon={Receipt} warn={e.cost_lines === 0 && e.timing === "UPCOMING"}>
                {e.cost_lines === 0 ? "No costs yet" : e.budget_amount ? `${money(e.expected_cost)} of ${money(e.budget_amount)}` : money(e.expected_cost)}
              </Fact>
              <CostBar e={e} />
            </div>
            {happened && (
              <Fact icon={Presentation}>
                {e.demos_given} {e.demos_given === 1 ? "demo" : "demos"} given{e.demos_booked ? ` · ${e.demos_booked} booked` : ""}
              </Fact>
            )}
            {happened && (
              <Fact icon={ClipboardList} warn={!e.has_results && e.timing === "PAST"}>
                {e.has_results ? `Results recorded${e.leads ? ` · ${e.leads.toLocaleString()} leads` : ""}` : "Results to collect"}
              </Fact>
            )}
          </div>
        </div>
      </Link>
      <Link
        to={`/events/${e.id}?tab=${step.tab}`}
        className="flex items-center justify-between gap-2 rounded-b-xl border-t border-border px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="truncate">
          <span className="text-muted-foreground">Next · </span>
          {step.text}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}

export default function EventsPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [view, setView] = useState<View>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: events, isLoading, error, refetch } = useEventOverview(debounced);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const all = useMemo(() => events ?? [], [events]);
  const counts = useMemo(
    () => ({
      ALL: all.length,
      NOW: all.filter((e) => e.timing === "NOW").length,
      UPCOMING: all.filter((e) => e.timing === "UPCOMING").length,
      PAST: all.filter((e) => e.timing === "PAST").length,
      UNSCHEDULED: all.filter((e) => e.timing === "UNSCHEDULED").length,
    }),
    [all],
  );

  const groups = useMemo(() => {
    const shown = all.filter((e) => matches(e, view));
    return GROUP_ORDER.map((timing) => ({ timing, items: shown.filter((e) => e.timing === timing) })).filter((g) => g.items.length > 0);
  }, [all, view]);

  const tabs: { view: View; label: string }[] = [
    { view: "ALL", label: "All" },
    { view: "NOW", label: TIMING_LABELS.NOW },
    { view: "UPCOMING", label: TIMING_LABELS.UPCOMING },
    { view: "PAST", label: TIMING_LABELS.PAST },
    ...(counts.UNSCHEDULED ? [{ view: "UNSCHEDULED" as View, label: TIMING_LABELS.UNSCHEDULED }] : []),
  ];

  return (
    <div className="flex w-full flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <PageHeader
        icon={CalendarDays}
        title="Event Management"
        description="For each event, plan who's going, keep costs up to date, and record demos and results."
        actions={
          hasPermission("INITIATIVES_CREATE") && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New event
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Segmented control, scrolls sideways on phones */}
        <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
          <div className="inline-flex gap-0.5 rounded-lg bg-muted p-1" role="group" aria-label="Show">
            {tabs.map((tab) => (
              <button
                key={tab.view}
                type="button"
                onClick={() => setView(tab.view)}
                aria-pressed={view === tab.view}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === tab.view ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="text-xs tabular-nums text-muted-foreground">{counts[tab.view]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code or city" className="bg-card pl-8" aria-label="Search events" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">Could not load the events.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">{debounced || view !== "ALL" ? "No events match" : "No events yet"}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {debounced || view !== "ALL" ? "Try a different search or filter." : "Add your first event to plan the team, track costs and capture results."}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.timing} className="flex flex-col gap-3" aria-label={TIMING_LABELS[group.timing]}>
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className={`h-2 w-2 rounded-full ${TIMING_DOT[group.timing]}`} />
              {TIMING_LABELS[group.timing]}
              <span className="text-muted-foreground">{group.items.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {group.items.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          </section>
        ))
      )}

      {hasPermission("INITIATIVES_CREATE") && <InitiativeFormDialog open={createOpen} onOpenChange={setCreateOpen} defaultChannelCode="EVENTS" />}
    </div>
  );
}
