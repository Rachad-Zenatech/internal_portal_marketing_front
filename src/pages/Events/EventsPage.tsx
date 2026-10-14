import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, Plus, Presentation, Receipt, Search, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventOverview } from "@/hooks/useEventManagement";
import { useAuth } from "@/lib/AuthContext";
import type { EventOverviewItem, EventTiming } from "@/types/eventManagement";
import { CARD, MUTED } from "../Initiatives/detailStyles";
import { formatMoney } from "../Initiatives/format";
import InitiativeFormDialog from "../Initiatives/InitiativeFormDialog";
import { STATUS_LABELS, STATUS_STYLES } from "../Initiatives/status";
import { dateRange, dateTile, eventPlace, nextStep, TIMING_LABELS, TIMING_TILE, whenText } from "./eventDisplay";

const FILTERS: (EventTiming | "ALL")[] = ["ALL", "NOW", "UPCOMING", "PAST"];
const GROUP_ORDER: EventTiming[] = ["NOW", "UPCOMING", "UNSCHEDULED", "PAST"];

/** A small labelled fact on a card, tinted when it needs attention */
function Fact({ icon: Icon, children, tone = "neutral" }: { icon: React.ElementType; children: React.ReactNode; tone?: "neutral" | "warn" | "good" }) {
  const colours = {
    neutral: "text-slate-600 dark:text-zinc-300",
    warn: "text-amber-700 dark:text-amber-400",
    good: "text-emerald-700 dark:text-emerald-400",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${colours}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function CostBar({ e }: { e: EventOverviewItem }) {
  if (!e.budget_amount) return null;
  const percent = (e.expected_cost / e.budget_amount) * 100;
  return (
    <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800" title={`${Math.round(percent)}% of the budget`}>
      <span className={`block h-full rounded-full ${percent > 100 ? "bg-red-500" : "bg-violet-500"}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </span>
  );
}

function EventCard({ e }: { e: EventOverviewItem }) {
  const navigate = useNavigate();
  const tile = dateTile(e.start_date);
  const place = eventPlace(e);
  const step = nextStep(e);
  const happened = e.timing === "NOW" || e.timing === "PAST";
  const money = (value: number) => formatMoney(value, e.currency);

  const team =
    e.staff_count === 0
      ? { text: "No team yet", tone: e.timing === "UPCOMING" ? ("warn" as const) : ("neutral" as const) }
      : e.staff_missing_details > 0
        ? { text: `${e.staff_count} going · ${e.staff_missing_details} need travel details`, tone: "warn" as const }
        : { text: `${e.staff_count} going${e.staff_booked ? ` · ${e.staff_booked} booked` : ""}`, tone: "good" as const };

  return (
    <article className={`${CARD} group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      <Link to={`/events/${e.id}`} className="flex flex-1 gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${TIMING_TILE[e.timing]}`}>
          <span className="text-[10px] font-semibold tracking-wider">{tile.month}</span>
          <span className="text-xl font-bold leading-none">{tile.day}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-semibold text-slate-900 dark:text-zinc-100">{e.name}</h3>
              <Badge variant="outline" className={`shrink-0 ${STATUS_STYLES[e.status as keyof typeof STATUS_STYLES] ?? ""}`}>
                {STATUS_LABELS[e.status as keyof typeof STATUS_LABELS] ?? e.status}
              </Badge>
            </div>
            <p className={`mt-0.5 truncate text-xs ${MUTED}`}>
              {[e.event_code, e.sub_channel_name, e.brand_name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Fact icon={CalendarDays}>
              {dateRange(e.start_date, e.end_date)} · {whenText(e)}
            </Fact>
            {place && <Fact icon={e.platform && !e.city ? Video : MapPin}>{place}</Fact>}
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            <Fact icon={Users} tone={team.tone}>
              {team.text}
            </Fact>
            <div className="min-w-0">
              <Fact icon={Receipt} tone={e.cost_lines === 0 && e.timing === "UPCOMING" ? "warn" : "neutral"}>
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
              <Fact icon={Users} tone={e.has_results ? "good" : e.timing === "PAST" ? "warn" : "neutral"}>
                {e.has_results ? `Results recorded${e.leads ? ` · ${e.leads.toLocaleString()} leads` : ""}` : "Results to collect"}
              </Fact>
            )}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => navigate(`/events/${e.id}?tab=${step.tab}`)}
        className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-left text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-violet-300 dark:hover:bg-violet-950/40"
      >
        <span className="truncate">Next: {step.text}</span>
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </button>
    </article>
  );
}

export default function EventsPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<EventTiming | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: events, isLoading, error, refetch } = useEventOverview(debounced);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: events?.length ?? 0 };
    for (const e of events ?? []) c[e.timing] = (c[e.timing] ?? 0) + 1;
    return c;
  }, [events]);

  const groups = useMemo(() => {
    const shown = (events ?? []).filter((e) => filter === "ALL" || e.timing === filter);
    return GROUP_ORDER.map((timing) => ({ timing, items: shown.filter((e) => e.timing === timing) })).filter((g) => g.items.length > 0);
  }, [events, filter]);

  return (
    <div className="flex w-full flex-1 flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 sm:flex dark:bg-violet-950/50 dark:text-violet-400">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Events</h2>
            <p className={`mt-1 text-sm ${MUTED}`}>Plan the team and their travel, keep costs up to date, and capture demos and results — one event at a time.</p>
          </div>
        </div>
        {hasPermission("INITIATIVES_CREATE") && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2 self-start">
            <Plus className="h-4 w-4" />
            New event
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code or city" className="pl-8" aria-label="Search events" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                filter === f
                  ? "border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {f === "ALL" ? "All" : TIMING_LABELS[f]} <span className="ml-0.5 opacity-60">{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3">
          <p className={`text-sm ${MUTED}`}>Could not load the events.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center gap-3 p-10 text-center`}>
          <CalendarDays className="h-8 w-8 text-slate-400" />
          <p className="font-medium text-slate-900 dark:text-zinc-100">{debounced || filter !== "ALL" ? "No events match" : "No events yet"}</p>
          <p className={`max-w-md text-sm ${MUTED}`}>
            {debounced || filter !== "ALL" ? "Try a different search or filter." : "Add your first event to plan the team, track costs and capture results."}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.timing} className="flex flex-col gap-3" aria-label={TIMING_LABELS[group.timing]}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              {TIMING_LABELS[group.timing]} <span className="font-normal">({group.items.length})</span>
            </h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
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
