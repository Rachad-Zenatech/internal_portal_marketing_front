import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, MapPin, Pencil, Presentation, Receipt, TrendingUp, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventOverview } from "@/hooks/useEventManagement";
import { useInitiative } from "@/hooks/useInitiatives";
import { usePerformance } from "@/hooks/usePerformance";
import { useAuth } from "@/lib/AuthContext";
import type { EventOverviewItem, EventTiming } from "@/types/eventManagement";
import type { InitiativeListItem } from "@/types/initiatives";
import CostSheet from "../Initiatives/CostSheet";
import DemoLog from "../Initiatives/DemoLog";
import { InitiativeNotLoaded } from "../Initiatives/detailParts";
import { CARD, MUTED } from "../Initiatives/detailStyles";
import { formatMoney } from "../Initiatives/format";
import InitiativeFormDialog from "../Initiatives/InitiativeFormDialog";
import ResultsSection from "../Initiatives/ResultsSection";
import { STATUS_LABELS, STATUS_STYLES } from "../Initiatives/status";
import { dateRange, eventPlace, whenText, type WorkspaceTab } from "./eventDisplay";
import StaffSection from "./StaffSection";

const TABS: WorkspaceTab[] = ["team", "costs", "demos", "results"];

/** Where to start: planning before the event, demos during it, results after it */
function defaultTab(timing: EventTiming | undefined): WorkspaceTab {
  if (timing === "NOW") return "demos";
  if (timing === "PAST") return "results";
  return "team";
}

interface StepProps {
  tab: WorkspaceTab;
  icon: React.ElementType;
  title: string;
  status: string;
  done: boolean;
  attention?: boolean;
  active: boolean;
  onSelect: (tab: WorkspaceTab) => void;
}

/** One step of the event's checklist; selecting it opens its tab */
function Step({ tab, icon: Icon, title, status, done, attention, active, onSelect }: StepProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40"
          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
      }`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-violet-600 dark:text-violet-400" : "text-slate-400"}`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-100">
          {title}
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Done" />
          ) : (
            <Circle className={`h-3.5 w-3.5 ${attention ? "text-amber-500" : "text-slate-300 dark:text-zinc-600"}`} aria-label="To do" />
          )}
        </span>
        <span className={`mt-0.5 block truncate text-xs ${attention ? "text-amber-700 dark:text-amber-400" : MUTED}`}>{status}</span>
      </span>
    </button>
  );
}

function ResultsTab({ initiative }: { initiative: InitiativeListItem }) {
  const { data: performance, isLoading } = usePerformance(initiative.id);
  if (isLoading || !performance) return <Skeleton className="h-48 w-full" />;
  return (
    <div className="flex flex-col gap-3">
      <ResultsSection initiative={initiative} performance={performance} />
      <Link
        to={`/initiatives/${initiative.id}/performance`}
        className={`inline-flex w-fit items-center gap-1.5 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300`}
      >
        <TrendingUp className="h-4 w-4" />
        See what each outcome cost and whether it was worth it
      </Link>
    </div>
  );
}

function Checklist({ card, tab, onSelect }: { card: EventOverviewItem | undefined; tab: WorkspaceTab; onSelect: (tab: WorkspaceTab) => void }) {
  if (!card) return null;
  const money = (v: number) => formatMoney(v, card.currency);
  const happened = card.timing === "NOW" || card.timing === "PAST";
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Step
        tab="team"
        icon={Users}
        title="Team & travel"
        active={tab === "team"}
        onSelect={onSelect}
        done={card.staff_count > 0 && card.staff_missing_details === 0}
        attention={card.staff_missing_details > 0 || (card.staff_count === 0 && !happened)}
        status={
          card.staff_count === 0
            ? "No one added yet"
            : card.staff_missing_details > 0
              ? `${card.staff_missing_details} need travel details`
              : `${card.staff_count} going${card.staff_booked ? ` · ${card.staff_booked} booked` : ""}`
        }
      />
      <Step
        tab="costs"
        icon={Receipt}
        title="Costs"
        active={tab === "costs"}
        onSelect={onSelect}
        done={card.cost_lines > 0}
        attention={card.cost_lines === 0}
        status={card.cost_lines === 0 ? "No costs yet" : card.budget_amount ? `${money(card.expected_cost)} of ${money(card.budget_amount)}` : money(card.expected_cost)}
      />
      <Step
        tab="demos"
        icon={Presentation}
        title="Demos"
        active={tab === "demos"}
        onSelect={onSelect}
        done={card.demos_given > 0}
        status={card.demos_given || card.demos_booked ? `${card.demos_given} given${card.demos_booked ? ` · ${card.demos_booked} booked` : ""}` : happened ? "None logged yet" : "Log them at the event"}
      />
      <Step
        tab="results"
        icon={TrendingUp}
        title="Results"
        active={tab === "results"}
        onSelect={onSelect}
        done={card.has_results}
        attention={card.timing === "PAST" && !card.has_results}
        status={card.has_results ? `Recorded${card.leads ? ` · ${card.leads.toLocaleString()} leads` : ""}` : happened ? "Leads and results to record" : "After the event"}
      />
    </div>
  );
}

export default function EventWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { data: initiative, isLoading, error } = useInitiative(id);
  const { data: events } = useEventOverview("");
  const card = events?.find((e) => e.id === id);
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);
  const requested = params.get("tab") as WorkspaceTab | null;
  const tab: WorkspaceTab = requested && TABS.includes(requested) ? requested : defaultTab(card?.timing);
  const selectTab = (next: WorkspaceTab) => setParams((prev) => ({ ...Object.fromEntries(prev), tab: next }), { replace: true });

  // Events › Facility Expo 2026
  useEffect(() => {
    if (!initiative) return;
    document.dispatchEvent(
      new CustomEvent("set-breadcrumb-trail", {
        detail: { path: `/events/${initiative.id}`, items: [{ title: "Events", path: "/events" }, { title: initiative.name }] },
      }),
    );
  }, [initiative]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !initiative) return <InitiativeNotLoaded error={error} />;
  if (!initiative.event_code) {
    return (
      <div className="flex flex-col items-start gap-3 p-8">
        <p className="text-sm text-slate-600 dark:text-zinc-400">This initiative isn't an event.</p>
        <Button variant="outline" asChild>
          <Link to={`/initiatives/${initiative.id}`}>Open it as an initiative</Link>
        </Button>
      </div>
    );
  }

  const place = eventPlace(initiative);
  const online = Boolean(initiative.platform && !initiative.city);

  return (
    <div className="flex w-full flex-1 flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <Link to="/events" className={`inline-flex w-fit items-center gap-1.5 text-sm hover:text-slate-900 dark:hover:text-zinc-100 ${MUTED}`}>
        <ArrowLeft className="h-4 w-4" />
        All events
      </Link>

      <Card className={`${CARD} flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">{initiative.name}</h2>
            <Badge variant="outline" className={STATUS_STYLES[initiative.status]}>
              {STATUS_LABELS[initiative.status]}
            </Badge>
            <Badge variant="outline" className="font-mono text-slate-600 dark:text-zinc-300">
              {initiative.event_code}
            </Badge>
          </div>
          <div className={`mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm ${MUTED}`}>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {dateRange(initiative.start_date, initiative.end_date)}
              {card && ` · ${whenText(card)}`}
            </span>
            {place && (
              <span className="inline-flex items-center gap-1.5">
                {online ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                {initiative.venue && !online ? `${initiative.venue}, ${place}` : place}
              </span>
            )}
            <span>
              {initiative.brand_name}
              {initiative.sub_channel_name && ` · ${initiative.sub_channel_name}`}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {hasPermission("INITIATIVES_UPDATE") && (
            <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit event
            </Button>
          )}
          <Button variant="outline" className="gap-2" asChild>
            <Link to={`/initiatives/${initiative.id}/performance`}>
              <TrendingUp className="h-4 w-4" />
              Performance
            </Link>
          </Button>
        </div>
      </Card>

      <Checklist card={card} tab={tab} onSelect={selectTab} />

      <Tabs value={tab} onValueChange={(v) => selectTab(v as WorkspaceTab)} className="flex flex-col gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="h-4 w-4" /> Team & travel
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-1.5">
            <Receipt className="h-4 w-4" /> Costs
          </TabsTrigger>
          <TabsTrigger value="demos" className="gap-1.5">
            <Presentation className="h-4 w-4" /> Demos
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <TrendingUp className="h-4 w-4" /> Results
          </TabsTrigger>
        </TabsList>
        <TabsContent value="team">
          <StaffSection event={initiative} />
        </TabsContent>
        <TabsContent value="costs">
          <Card className={`${CARD} gap-0 p-5`}>
            <CostSheet initiative={initiative} />
          </Card>
        </TabsContent>
        <TabsContent value="demos">
          <DemoLog initiative={initiative} />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab initiative={initiative} />
        </TabsContent>
      </Tabs>

      {hasPermission("INITIATIVES_UPDATE") && <InitiativeFormDialog open={editOpen} onOpenChange={setEditOpen} initiative={initiative} />}
    </div>
  );
}
