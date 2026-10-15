import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, CalendarDays, Check, ChevronRight, Clock, Copy, ExternalLink, Globe2, MapPin, Pencil, Presentation, Receipt, Target, TrendingUp, Video, Wallet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDemoSummary } from "@/hooks/useDemos";
import { useInitiative } from "@/hooks/useInitiatives";
import { usePerformance } from "@/hooks/usePerformance";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeListItem } from "@/types/initiatives";
import type { ReferenceItem } from "@/types/referenceData";
import { channelStyle, FUNNEL_STAGE_STYLES } from "./channelStyles";
import { Empty, InitiativeNotLoaded, Section } from "./detailParts";
import { CARD, MUTED } from "./detailStyles";
import { ONLINE_EVENT_SUB_CHANNELS } from "./eventRules";
import { formatBoothSize, formatBudget, formatDate, formatDateRangeShort, formatDuration, formatEventLocation, formatMoney, initials, timelineProgress } from "./format";
import DraftBanner from "./DraftBanner";
import InitiativeFormDialog from "./InitiativeFormDialog";
import { STATUS_LABELS, STATUS_STYLES } from "./status";
import { EARLY_LABELS, RATING_STYLES } from "./performanceRules";
import { useInitiativeNavigation } from "./useInitiativeNavigation";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={`text-xs font-medium ${MUTED}`}>{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-zinc-100">{value || <Empty />}</dd>
    </div>
  );
}

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Icon tile or avatar shown on the left */
  badge: React.ReactNode;
}

function Stat({ label, value, hint, badge }: StatProps) {
  return (
    <Card className={`${CARD} flex-row items-center gap-4 p-4`}>
      {badge}
      <div className="min-w-0">
        <p className={`text-xs font-medium ${MUTED}`}>{label}</p>
        <div className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{value}</div>
        {hint && <p className={`truncate text-xs ${MUTED}`}>{hint}</p>}
      </div>
    </Card>
  );
}

function StatIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable or blocked; the code is still visible to copy by hand
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono">{code}</span>
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={copy} aria-label={copied ? "Copied" : "Copy event code"}>
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </span>
  );
}

function GoalSection({ initiative, stages }: { initiative: InitiativeListItem; stages: ReferenceItem[] }) {
  return (
    <Section title="Goal" icon={Target}>
      {/* The whole funnel, with this initiative's stage highlighted */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {stages.map((stage, index) => {
          const current = stage.id === initiative.funnel_stage_id;
          return (
            <li key={stage.id} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-zinc-600" />}
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  current
                    ? `${FUNNEL_STAGE_STYLES[stage.code] ?? "border-blue-500 bg-blue-500 text-white"} shadow-sm`
                    : "border-slate-200 text-slate-500 dark:border-zinc-700 dark:text-zinc-400"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {stage.name}
              </span>
            </li>
          );
        })}
      </ol>

      <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-zinc-800">
        <div>
          <dt className={`text-xs font-medium ${MUTED}`}>Goal</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100">
            {initiative.goal_name ?? <Empty text={initiative.funnel_stage_id ? "No goal yet" : "Choose a funnel stage first"} />}
          </dd>
        </div>
        <div>
          <dt className={`text-xs font-medium ${MUTED}`}>Measured by</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100">{initiative.primary_kpi_name ?? <Empty text="No KPI yet" />}</dd>
        </div>
      </dl>
    </Section>
  );
}

function TimelineSection({ initiative, barColour }: { initiative: InitiativeListItem; barColour: string }) {
  const progress = timelineProgress(initiative.start_date, initiative.end_date);
  return (
    <Section
      title="Timeline"
      icon={Clock}
      action={
        <Badge variant="outline" className={STATUS_STYLES[initiative.status]}>
          {STATUS_LABELS[initiative.status]}
        </Badge>
      }
    >
      {progress ? (
        <>
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{progress.label}</p>
          {progress.percent !== null ? (
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800"
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={`h-full rounded-full ${barColour}`} style={{ width: `${Math.max(progress.percent, 2)}%` }} />
            </div>
          ) : (
            // Open-ended: a faded bar instead of a percentage
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
              <div className={`h-full w-full rounded-full opacity-30 ${barColour}`} />
            </div>
          )}
          <div className={`mt-2 flex justify-between gap-4 text-xs ${MUTED}`}>
            <span>{formatDate(initiative.start_date) ?? "No start date"}</span>
            <span>{formatDate(initiative.end_date) ?? "No end date"}</span>
          </div>
        </>
      ) : (
        <p className="text-sm">
          <Empty text="No dates yet. Add a start and end date to track progress." />
        </p>
      )}
    </Section>
  );
}

function EventSection({ initiative, online }: { initiative: InitiativeListItem; online: boolean }) {
  const location = formatEventLocation(initiative.city, initiative.country_code, false);
  const place = [initiative.venue, location === "-" ? null : location].filter(Boolean).join(" · ");
  return (
    <Section title="Event" icon={CalendarDays}>
      {online ? (
        <div className="flex items-start gap-3 rounded-lg bg-slate-50/80 p-3 dark:bg-muted">
          <Video className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{initiative.platform ? `Online · ${initiative.platform}` : "Online"}</p>
            {initiative.event_url ? (
              // The API only accepts http(s) links, so this can't run script
              <a
                href={initiative.event_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                <span className="truncate">{initiative.event_url}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-sm">
                <Empty text="No event link yet" />
              </p>
            )}
            {place && <p className={`truncate text-sm ${MUTED}`}>Hosted from {place}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg bg-slate-50/80 p-3 dark:bg-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{location === "-" ? <Empty text="No location yet" /> : location}</p>
            {initiative.venue && <p className={`truncate text-sm ${MUTED}`}>{initiative.venue}</p>}
          </div>
        </div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Detail label="Event code" value={initiative.event_code && <CopyCode code={initiative.event_code} />} />
        <Detail label="Event type" value={initiative.event_type_name} />
        <Detail label="Region" value={initiative.region_name} />
        {!online && <Detail label="Booth size" value={initiative.booth_size_sqm !== null && formatBoothSize(initiative.booth_size_sqm)} />}
      </dl>
    </Section>
  );
}

interface SubPageLinkProps {
  to: string;
  title: string;
  icon: React.ElementType;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

/** A card that opens one of the initiative's own pages (Costs, Performance) */
function SubPageLink({ to, title, icon: Icon, badge, children }: SubPageLinkProps) {
  return (
    <Link
      to={to}
      className={`${CARD} group flex items-center gap-4 p-4 transition-colors hover:border-foreground/30 sm:p-5`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-zinc-100">{title}</span>
          {badge}
        </div>
        <div className={`mt-0.5 text-sm ${MUTED}`}>{children}</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** The suggested rating and why, e.g. "Low · It broke even (ROI 0%) — not a success…" */
function PerformanceSnapshot({ initiativeId }: { initiativeId: string }) {
  const { data: performance, isLoading } = usePerformance(initiativeId);
  if (isLoading) return <>Loading…</>;
  if (!performance) return <>Was it worth it? See results, cost per outcome and the rating.</>;
  // Upcoming → early read on the KPI → final verdict, the same stages as the Performance page
  const { stage, rating, early_read: early } = performance;
  const shown =
    stage === "UPCOMING"
      ? { badge: "Upcoming", tone: RATING_STYLES.TEST, text: "The verdict comes after it ends." }
      : stage === "EARLY" && early
        ? { badge: `Early read: ${EARLY_LABELS[early.code]}`, tone: RATING_STYLES[early.code], text: early.reason }
        : { badge: rating.name, tone: RATING_STYLES[rating.code], text: rating.reason };
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <Badge variant="outline" className={shown.tone}>
          {shown.badge}
        </Badge>
        {performance.latest_decision && <span className="text-xs">Decided: {performance.latest_decision.name}</span>}
      </span>
      <span className="line-clamp-2">{shown.text}</span>
    </span>
  );
}

/** "20 demos given · $1,000 per demo · 2 became customers · 3 booked" */
function DemosSnapshot({ initiativeId }: { initiativeId: string }) {
  const { data: summary, isLoading } = useDemoSummary(initiativeId);
  if (isLoading) return <>Loading demos…</>;
  if (!summary || (summary.total === 0 && summary.upcoming === 0)) {
    return <>No demos logged yet. Log each one as it happens to see what each demo cost and which led to customers.</>;
  }
  if (summary.total === 0) {
    // Only bookings so far: they count once they happen
    return <>{summary.upcoming} {summary.upcoming === 1 ? "demo" : "demos"} booked; none given yet.</>;
  }
  return (
    <>
      <span className="font-medium text-slate-900 dark:text-zinc-100">
        {summary.total} {summary.total === 1 ? "demo" : "demos"} given
      </span>
      {summary.cost_per_demo !== null && <> · {formatMoney(summary.cost_per_demo, summary.currency)} per demo</>}
      {" · "}
      {summary.funnel.customers} became {summary.funnel.customers === 1 ? "a customer" : "customers"}
      {summary.upcoming > 0 && <> · {summary.upcoming} booked</>}
    </>
  );
}

function CostsSnapshot({ initiative }: { initiative: InitiativeListItem }) {
  const { expected_total: expected, actual_amount: actual, budget_amount: budget, currency } = initiative;
  if (expected === 0 && !initiative.has_mixed_currencies) {
    return <>No costs yet. Add estimates, orders and invoices as they come in.</>;
  }
  const percent = budget ? Math.round((expected / budget) * 100) : null;
  return (
    <>
      <span className="font-medium text-slate-900 dark:text-zinc-100">{formatMoney(expected, currency)}</span> expected
      {percent !== null && <> · {percent}% of budget</>} · {formatMoney(actual, currency)} invoiced
      {percent !== null && (
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
          <span
            className={`block h-full rounded-full ${percent > 100 ? "bg-red-500" : "bg-amber-500"}`}
            style={{ width: `${Math.min(Math.max(percent, 2), 100)}%` }}
          />
        </span>
      )}
    </>
  );
}

export default function InitiativeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: initiative, isLoading, error } = useInitiative(id);
  const { data: reference } = useReferenceData();
  const { hasPermission } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  // Initiatives › Events › Facility Expo 2026, with the channel highlighted in the sidebar
  useInitiativeNavigation(initiative);

  if (isLoading) {
    return <p className="p-8 text-sm text-slate-500">Loading initiative...</p>;
  }

  if (error || !initiative) {
    return <InitiativeNotLoaded error={error} />;
  }

  const subChannelCode = reference?.sub_channels.find((s) => s.id === initiative.sub_channel_id)?.code;
  const channel = channelStyle(reference?.channels.find((c) => c.id === initiative.channel_id)?.code);
  const ChannelIcon = channel.icon;
  const hasDates = Boolean(initiative.start_date || initiative.end_date);

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <PageHeader
        icon={ChannelIcon}
        title={initiative.name}
        actions={
          hasPermission("INITIATIVES_UPDATE") && (
            <Button onClick={() => setEditOpen(true)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={STATUS_STYLES[initiative.status]}>
              {STATUS_LABELS[initiative.status]}
            </Badge>
            {initiative.event_code && (
              <Badge variant="outline" className="font-mono text-muted-foreground">
                {initiative.event_code}
              </Badge>
            )}
          </div>
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${MUTED}`}>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {initiative.brand_name}
            </span>
            {initiative.market_name && (
              <span className="inline-flex items-center gap-1.5" title="Market">
                <Globe2 className="h-4 w-4" />
                {initiative.market_name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${channel.dot}`} />
              {initiative.channel_name}
              {initiative.sub_channel_name && <span className="text-muted-foreground/70">/ {initiative.sub_channel_name}</span>}
            </span>
          </div>
        </div>
      </PageHeader>

      {initiative.status === "DRAFT" && (
        <DraftBanner noun={initiative.event_code ? "event" : "initiative"} onFinish={hasPermission("INITIATIVES_UPDATE") ? () => setEditOpen(true) : undefined} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          badge={<StatIcon icon={Wallet} />}
          label="Budget"
          value={initiative.budget_amount === null ? <Empty /> : formatBudget(initiative.budget_amount, initiative.currency)}
          hint={initiative.budget_amount === null ? undefined : initiative.currency}
        />
        <Stat
          badge={<StatIcon icon={CalendarDays} />}
          label="Dates"
          value={hasDates ? formatDateRangeShort(initiative.start_date, initiative.end_date) : <Empty text="Not scheduled" />}
          hint={formatDuration(initiative.start_date, initiative.end_date)}
        />
        <Stat
          badge={<StatIcon icon={Target} />}
          label="Main KPI"
          value={initiative.primary_kpi_name ?? <Empty />}
          hint={initiative.goal_name}
        />
        <Stat
          badge={
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {initials(initiative.owner_name)}
            </div>
          }
          label="Owner"
          value={initiative.owner_name ?? <Empty text="Unassigned" />}
        />
      </div>

      {/* Costs, performance and (for events) demos each have their own page, so this one stays an overview */}
      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${initiative.event_code ? "xl:grid-cols-3" : ""}`}>
        <SubPageLink
          to={`/initiatives/${initiative.id}/costs`}
          title="Costs"
          icon={Receipt}
        >
          <CostsSnapshot initiative={initiative} />
        </SubPageLink>
        <SubPageLink
          to={`/initiatives/${initiative.id}/performance`}
          title="Performance"
          icon={TrendingUp}
        >
          <PerformanceSnapshot initiativeId={initiative.id} />
        </SubPageLink>
        {initiative.event_code && (
          <SubPageLink
            to={`/initiatives/${initiative.id}/demos`}
            title="Demos"
            icon={Presentation}
          >
            <DemosSnapshot initiativeId={initiative.id} />
          </SubPageLink>
        )}
      </div>

      {initiative.event_code ? (
        // Event beside Goal + Timeline, so neither column leaves a gap
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <EventSection initiative={initiative} online={ONLINE_EVENT_SUB_CHANNELS.has(subChannelCode ?? "")} />
          <div className="flex flex-col gap-6">
            <GoalSection initiative={initiative} stages={reference?.funnel_stages ?? []} />
            <TimelineSection initiative={initiative} barColour={channel.dot} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <GoalSection initiative={initiative} stages={reference?.funnel_stages ?? []} />
          <TimelineSection initiative={initiative} barColour={channel.dot} />
        </div>
      )}

      {hasPermission("INITIATIVES_UPDATE") && (
        <InitiativeFormDialog open={editOpen} onOpenChange={setEditOpen} initiative={initiative} />
      )}
    </div>
  );
}
