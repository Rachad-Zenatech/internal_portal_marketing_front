import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, MapPin, Pencil, Presentation, Receipt, TrendingUp, Users, Video } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventOverview } from "@/hooks/useEventManagement";
import { useInitiative } from "@/hooks/useInitiatives";
import { usePerformance } from "@/hooks/usePerformance";
import { useAuth } from "@/lib/AuthContext";
import type { EventOverviewItem, EventTiming } from "@/types/eventManagement";
import type { InitiativeListItem } from "@/types/initiatives";
import CostSheet from "../Initiatives/CostSheet";
import DeleteInitiativeButton from "../Initiatives/DeleteInitiativeButton";
import DemoLog from "../Initiatives/DemoLog";
import { InitiativeNotLoaded } from "../Initiatives/detailParts";
import { CARD, MUTED } from "../Initiatives/detailStyles";
import { formatMoney } from "../Initiatives/format";
import DraftBanner from "../Initiatives/DraftBanner";
import InitiativeFormDialog from "../Initiatives/InitiativeFormDialog";
import ResultsSection from "../Initiatives/ResultsSection";
import { EVENT_STATUS_LABELS, STATUS_STYLES } from "../Initiatives/status";
import { dateRange, eventPlace, TIMING_DOT, whenText, type WorkspaceTab } from "./eventDisplay";
import StaffSection from "./StaffSection";
import CostSources from "./CostSources";
import TravelBudgetUsage from "./TravelBudget";

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

/** One step of the event's checklist, which is also its tab: selecting it shows that part of the event below */
function Step({ tab, icon: Icon, title, status, done, attention, active, onSelect }: StepProps) {
  return (
    <button
      type="button"
      role="tab"
      id={`event-tab-${tab}`}
      aria-selected={active}
      aria-controls="event-tab-panel"
      onClick={() => onSelect(tab)}
      className={`flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "border-foreground shadow-xs" : "border-border hover:border-foreground/30"
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-foreground" : "text-muted-foreground"}`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-1.5 text-sm font-medium text-foreground">
          {title}
          {done ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Done" />
          ) : (
            <Circle className={`h-3.5 w-3.5 shrink-0 ${attention ? "text-amber-500" : "text-muted-foreground/40"}`} aria-label="To do" />
          )}
        </span>
        <span className={`mt-0.5 block truncate text-xs ${attention ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>{status}</span>
      </span>
    </button>
  );
}

function ResultsTab({ initiative }: { initiative: InitiativeListItem }) {
  const { data: performance, isLoading, error, refetch } = usePerformance(initiative.id);
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error || !performance) {
    return (
      <div className="flex items-center gap-3">
        <p className={`text-sm ${MUTED}`}>Could not load the results.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ResultsSection initiative={initiative} performance={performance} />
      <Link
        to={`/initiatives/${initiative.id}/performance`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground underline-offset-2 hover:underline"
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
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" role="tablist" aria-label="Event">
      <Step
        tab="team"
        icon={Users}
        title="Team"
        active={tab === "team"}
        onSelect={onSelect}
        done={card.staff_count > 0}
        attention={card.staff_count === 0 && !happened}
        status={card.staff_count === 0 ? "No one added yet" : `${card.staff_count} going`}
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
        detail: { path: `/events/${initiative.id}`, items: [{ title: "Events Overview", path: "/events" }, { title: initiative.name }] },
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
    <div className="flex w-full flex-1 flex-col gap-5 animate-in fade-in duration-300">
      <PageHeader
        icon={CalendarDays}
        title={initiative.name}
        eyebrow={
          <Link to="/events" className={`inline-flex items-center gap-1.5 hover:text-foreground ${MUTED}`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Events Overview
          </Link>
        }
        actions={
          <>
            <DeleteInitiativeButton initiative={initiative} backTo="/events" />
            {hasPermission("INITIATIVES_UPDATE") && (
              <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit event
              </Button>
            )}
            <Button className="gap-2" asChild>
              <Link to={`/initiatives/${initiative.id}/performance`}>
                <TrendingUp className="h-4 w-4" />
                Performance
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {card && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${TIMING_DOT[card.timing]}`} />
                {whenText(card)}
              </span>
            )}
            <Badge variant="outline" className={STATUS_STYLES[initiative.status]}>
              {EVENT_STATUS_LABELS[initiative.status]}
            </Badge>
            <Badge variant="outline" className="font-mono text-muted-foreground">
              {initiative.event_code}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {dateRange(initiative.start_date, initiative.end_date)}
            </span>
            {place && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {online ? <Video className="h-4 w-4 shrink-0" /> : <MapPin className="h-4 w-4 shrink-0" />}
                <span className="truncate">{initiative.venue && !online ? `${initiative.venue}, ${place}` : place}</span>
              </span>
            )}
            <span>
              {initiative.brand_name}
              {initiative.sub_channel_name && ` · ${initiative.sub_channel_name}`}
            </span>
            {initiative.travel_budget_amount !== null && (
              <TravelBudgetUsage budget={initiative.travel_budget_amount} used={card?.travel_spent} currency={initiative.currency} />
            )}
          </div>
        </div>
      </PageHeader>

      {initiative.status === "DRAFT" && (
        <DraftBanner noun="event" onFinish={hasPermission("INITIATIVES_UPDATE") ? () => setEditOpen(true) : undefined} />
      )}

      <Checklist card={card} tab={tab} onSelect={selectTab} />

      <section id="event-tab-panel" role="tabpanel" aria-labelledby={`event-tab-${tab}`} className="min-w-0">
        {tab === "team" && <StaffSection event={initiative} />}
        {tab === "costs" && (
          <div className="flex flex-col gap-4">
            <Card className={`${CARD} gap-0 p-4 sm:p-5`}>
              <CostSources initiative={initiative} />
            </Card>
            <Card className={`${CARD} gap-0 p-4 sm:p-5`}>
              <CostSheet initiative={initiative} />
            </Card>
          </div>
        )}
        {tab === "demos" && <DemoLog initiative={initiative} />}
        {tab === "results" && <ResultsTab initiative={initiative} />}
      </section>

      {hasPermission("INITIATIVES_UPDATE") && <InitiativeFormDialog open={editOpen} onOpenChange={setEditOpen} initiative={initiative} />}
    </div>
  );
}
