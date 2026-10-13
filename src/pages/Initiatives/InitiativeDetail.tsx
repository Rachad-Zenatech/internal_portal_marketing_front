import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CalendarDays, Check, ChevronRight, Clock, Copy, MapPin, Pencil, Target, TrendingUp, Trophy, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInitiative } from "@/hooks/useInitiatives";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import { ApiError } from "@/services/helper";
import type { InitiativeListItem } from "@/types/initiatives";
import type { ReferenceItem } from "@/types/referenceData";
import { channelStyle, FUNNEL_STAGE_STYLES } from "./channelStyles";
import { ONLINE_EVENT_SUB_CHANNELS } from "./eventRules";
import { formatBudget, formatDate, formatDateRangeShort, formatDuration, formatEventLocation, initials, timelineProgress } from "./format";
import InitiativeFormDialog from "./InitiativeFormDialog";
import { STATUS_LABELS, STATUS_STYLES } from "./status";

const CARD = "rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm";
const MUTED = "text-slate-500 dark:text-zinc-400";

function Empty({ text = "Not set" }: { text?: string }) {
  return <span className="font-normal text-slate-400 dark:text-zinc-500">{text}</span>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={`text-xs font-medium ${MUTED}`}>{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-zinc-100">{value || <Empty />}</dd>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, action, children }: SectionProps) {
  return (
    <Card className={`${CARD} gap-0 p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-zinc-100">
          <Icon className={`h-4 w-4 ${MUTED}`} />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </Card>
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

function StatIcon({ icon: Icon, tone }: { icon: React.ElementType; tone: string }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
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
  const location = formatEventLocation(initiative.city, initiative.country_code, online);
  return (
    <Section title="Event" icon={CalendarDays}>
      <div className="flex items-start gap-3 rounded-lg bg-slate-50/80 p-3 dark:bg-muted">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{location === "—" ? <Empty text="No location yet" /> : location}</p>
          {initiative.venue && <p className={`truncate text-sm ${MUTED}`}>{initiative.venue}</p>}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Detail label="Event code" value={initiative.event_code && <CopyCode code={initiative.event_code} />} />
        <Detail label="Event type" value={initiative.event_type_name} />
        <Detail label="Region" value={initiative.region_name} />
      </dl>
    </Section>
  );
}

const COMING_SOON = [
  {
    icon: Wallet,
    title: "Budget & spend",
    text: "Spend recorded against this initiative's budget.",
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  {
    icon: TrendingUp,
    title: "Results",
    text: "Leads, demos, customers and revenue it brought in.",
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
  },
  {
    icon: Trophy,
    title: "Was it worth it?",
    text: "Cost per outcome, ROI and the performance rating.",
    tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  },
];

function PerformanceSection() {
  return (
    <Section title="Performance" icon={TrendingUp} action={<Badge variant="outline" className={MUTED}>Coming soon</Badge>}>
      <ul className="flex flex-col gap-4">
        {COMING_SOON.map(({ icon: Icon, title, text, tone }) => (
          <li key={title} className="flex gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{title}</p>
              <p className={`text-sm ${MUTED}`}>{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export default function InitiativeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: initiative, isLoading, error } = useInitiative(id);
  const { data: reference } = useReferenceData();
  const { hasPermission } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  // Show the initiative's name in the breadcrumb instead of its id
  useEffect(() => {
    if (!initiative) return;
    document.dispatchEvent(
      new CustomEvent("set-breadcrumb-trail", {
        detail: {
          path: `/initiatives/${initiative.id}`,
          items: [{ title: "Initiatives", path: "/initiatives" }, { title: initiative.name }],
        },
      }),
    );
  }, [initiative]);

  if (isLoading) {
    return <p className="p-8 text-sm text-slate-500">Loading initiative...</p>;
  }

  if (error || !initiative) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col items-start gap-3 p-8">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          {notFound ? "This initiative doesn't exist or was removed." : "Could not load this initiative. Please try again."}
        </p>
        <Button variant="outline" asChild>
          <Link to="/initiatives">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to initiatives
          </Link>
        </Button>
      </div>
    );
  }

  const subChannelCode = reference?.sub_channels.find((s) => s.id === initiative.sub_channel_id)?.code;
  const channel = channelStyle(reference?.channels.find((c) => c.id === initiative.channel_id)?.code);
  const ChannelIcon = channel.icon;
  const hasDates = Boolean(initiative.start_date || initiative.end_date);

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:flex ${channel.tile}`}>
            <ChannelIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">{initiative.name}</h2>
              <Badge variant="outline" className={STATUS_STYLES[initiative.status]}>
                {STATUS_LABELS[initiative.status]}
              </Badge>
              {initiative.event_code && (
                <Badge variant="outline" className="font-mono text-slate-600 dark:text-zinc-300">
                  {initiative.event_code}
                </Badge>
              )}
            </div>
            <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${MUTED}`}>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {initiative.brand_name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${channel.dot}`} />
                {initiative.channel_name}
                {initiative.sub_channel_name && <span className="text-slate-400 dark:text-zinc-500">/ {initiative.sub_channel_name}</span>}
              </span>
            </div>
          </div>
        </div>
        {hasPermission("INITIATIVES_UPDATE") && (
          <Button onClick={() => setEditOpen(true)} className="gap-2 self-start">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          badge={<StatIcon icon={Wallet} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" />}
          label="Budget"
          value={initiative.budget_amount === null ? <Empty /> : formatBudget(initiative.budget_amount, initiative.currency)}
          hint={initiative.budget_amount === null ? undefined : initiative.currency}
        />
        <Stat
          badge={<StatIcon icon={CalendarDays} tone="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" />}
          label="Dates"
          value={hasDates ? formatDateRangeShort(initiative.start_date, initiative.end_date) : <Empty text="Not scheduled" />}
          hint={formatDuration(initiative.start_date, initiative.end_date)}
        />
        <Stat
          badge={<StatIcon icon={Target} tone="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400" />}
          label="Primary KPI"
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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 2xl:grid-cols-4">
        <div className="flex flex-col gap-6 lg:col-span-2 2xl:col-span-3">
          {initiative.event_code && <EventSection initiative={initiative} online={ONLINE_EVENT_SUB_CHANNELS.has(subChannelCode ?? "")} />}
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <GoalSection initiative={initiative} stages={reference?.funnel_stages ?? []} />
            <TimelineSection initiative={initiative} barColour={channel.dot} />
          </div>
        </div>
        <PerformanceSection />
      </div>

      {hasPermission("INITIATIVES_UPDATE") && (
        <InitiativeFormDialog open={editOpen} onOpenChange={setEditOpen} initiative={initiative} />
      )}
    </div>
  );
}
