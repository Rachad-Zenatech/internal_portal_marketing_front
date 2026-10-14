import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, ClipboardList, MapPin, Plus, Presentation, Receipt, Search, Users, Video } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventOverview } from "@/hooks/useEventManagement";
import { useAuth } from "@/lib/AuthContext";
import type { EventOverviewItem, EventTiming } from "@/types/eventManagement";
import { MUTED } from "../Initiatives/detailStyles";
import { formatMoney } from "../Initiatives/format";
import InitiativeFormDialog from "../Initiatives/InitiativeFormDialog";
import { STATUS_LABELS, STATUS_STYLES } from "../Initiatives/status";
import { dateRange, dateTile, eventPlace, nextStep, TIMING_LABELS, TIMING_TILE, whenText } from "./eventDisplay";

/** Which time window the page is showing */
type View = "ALL" | EventTiming;

const GROUP_ORDER: EventTiming[] = ["NOW", "UPCOMING", "UNSCHEDULED", "PAST"];

const matches = (e: EventOverviewItem, view: View) => view === "ALL" || e.timing === view;

// A coloured strip across the top of each card, so "on now", "upcoming" and "past" read at a glance
const STRIP: Record<EventTiming, string> = {
  NOW: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  UPCOMING: "bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
  PAST: "bg-slate-50 text-slate-600 dark:bg-zinc-800/60 dark:text-zinc-300",
  UNSCHEDULED: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

/** A small labelled fact on a card, tinted when it needs attention */
function Fact({ icon: Icon, children, tone = "neutral" }: { icon: React.ElementType; children: React.ReactNode; tone?: "neutral" | "warn" | "good" }) {
  const colours = {
    neutral: "text-slate-600 dark:text-zinc-300",
    warn: "text-amber-700 dark:text-amber-400",
    good: "text-emerald-700 dark:text-emerald-400",
  }[tone];
  const iconColours = { neutral: "text-slate-400", warn: "text-amber-500", good: "text-emerald-500" }[tone];
  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-xs sm:text-[13px] ${colours}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColours}`} />
      <span className="truncate">{children}</span>
    </span>
  );
}

function CostBar({ e }: { e: EventOverviewItem }) {
  if (!e.budget_amount) return null;
  const percent = (e.expected_cost / e.budget_amount) * 100;
  return (
    <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800" title={`${Math.round(percent)}% of the budget`}>
      <span
        className={`block h-full rounded-full ${percent > 100 ? "bg-red-500" : percent >= 90 ? "bg-amber-500" : "bg-gradient-to-r from-violet-500 to-sky-500"}`}
        style={{ width: `${Math.min(Math.max(percent, 3), 100)}%` }}
      />
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
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg dark:border-zinc-800 dark:bg-card dark:hover:border-violet-900">
      <div className={`flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-semibold ${STRIP[e.timing]}`}>
        <span className="uppercase tracking-wide">{TIMING_LABELS[e.timing]}</span>
        <span className="font-medium">{whenText(e)}</span>
      </div>
      <Link to={`/events/${e.id}`} className="flex flex-1 gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 sm:gap-4">
        <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl shadow-sm ${TIMING_TILE[e.timing]}`}>
          <span className="text-[10px] font-semibold tracking-wider">{tile.month}</span>
          <span className="text-xl font-bold leading-none">{tile.day}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-violet-700 dark:text-zinc-100 dark:group-hover:text-violet-300">{e.name}</h3>
              <Badge variant="outline" className={`hidden shrink-0 sm:inline-flex ${STATUS_STYLES[e.status as keyof typeof STATUS_STYLES] ?? ""}`}>
                {STATUS_LABELS[e.status as keyof typeof STATUS_LABELS] ?? e.status}
              </Badge>
            </div>
            <p className={`mt-0.5 truncate text-xs ${MUTED}`}>{[e.event_code, e.sub_channel_name, e.brand_name].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Fact icon={CalendarDays}>{dateRange(e.start_date, e.end_date)}</Fact>
            {place && <Fact icon={e.platform && !e.city ? Video : MapPin}>{place}</Fact>}
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5 sm:grid-cols-2 dark:border-zinc-800">
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
              <Fact icon={ClipboardList} tone={e.has_results ? "good" : e.timing === "PAST" ? "warn" : "neutral"}>
                {e.has_results ? `Results recorded${e.leads ? ` · ${e.leads.toLocaleString()} leads` : ""}` : "Results to collect"}
              </Fact>
            )}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => navigate(`/events/${e.id}?tab=${step.tab}`)}
        className="flex items-center justify-between gap-2 border-t border-slate-100 bg-gradient-to-r from-violet-50/80 to-transparent px-4 py-3 text-left text-sm font-medium text-violet-700 transition-colors hover:from-violet-100 dark:border-zinc-800 dark:from-violet-950/40 dark:text-violet-300 dark:hover:from-violet-950/70"
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

  const chips: { view: View; label: string }[] = [
    { view: "ALL", label: "All" },
    { view: "NOW", label: TIMING_LABELS.NOW },
    { view: "UPCOMING", label: TIMING_LABELS.UPCOMING },
    { view: "PAST", label: TIMING_LABELS.PAST },
    ...(counts.UNSCHEDULED ? [{ view: "UNSCHEDULED" as View, label: TIMING_LABELS.UNSCHEDULED }] : []),
  ];

  return (
    <div className="flex w-full flex-1 flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out sm:gap-6">
      <PageHeader
        icon={CalendarDays}
        tone="violet"
        title="Event Management"
        description="Plan who's going and what they need, keep costs up to date, and capture demos and results — one event at a time."
        actions={
          hasPermission("INITIATIVES_CREATE") && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New event
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-card/80">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code or city" className="pl-8" aria-label="Search events" />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none" role="group" aria-label="Show">
          {chips.map((chip) => (
            <button
              key={chip.view}
              type="button"
              onClick={() => setView(chip.view)}
              aria-pressed={view === chip.view}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                view === chip.view
                  ? "border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-500"
                  : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {chip.label} <span className="ml-0.5 opacity-70">{counts[chip.view as keyof typeof counts] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">Could not load the events.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-10 text-center dark:border-violet-900 dark:bg-violet-950/20">
          <CalendarDays className="h-10 w-10 text-violet-400" />
          <p className="font-semibold text-slate-900 dark:text-zinc-100">{debounced || view !== "ALL" ? "No events match" : "No events yet"}</p>
          <p className={`max-w-md text-sm ${MUTED}`}>
            {debounced || view !== "ALL" ? "Try a different search or filter." : "Add your first event to plan the team, track costs and capture results."}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.timing} className="flex flex-col gap-3" aria-label={TIMING_LABELS[group.timing]}>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${TIMING_TILE[group.timing].split(" ")[0]}`} />
              {TIMING_LABELS[group.timing]} <span className="font-normal normal-case text-slate-400">({group.items.length})</span>
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
