// The side panel opened from a row on the initiatives page: the key facts without leaving the list
import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ExternalLink, Pencil, Receipt, TrendingUp, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInitiative, useInitiativeActivity } from "@/hooks/useInitiatives";
import { usePerformance } from "@/hooks/usePerformance";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeListItem } from "@/types/initiatives";
import type { Performance } from "@/types/performance";
import { AdOutcomes } from "../PaidAds/CampaignPanel";
import CostOverview from "./CostOverview";
import { Empty, Section } from "./detailParts";
import { MUTED } from "./detailStyles";
import { formatBudget, formatDate, formatEventLocation, formatMoney, ownerName } from "./format";
import { ATTENTION_LABELS, channelFields, choiceName, DATA_SOURCE_LABELS, formatKpiValue, linkSystemName } from "./initiativeFields";
import { ONLINE_EVENT_SUB_CHANNELS } from "./eventRules";
import ResultsSection from "./ResultsSection";
import { STATUS_LABELS } from "./status";
import { StatusPill } from "./StatusPill";
import WorthItSection from "./WorthItSection";

type PanelTab = "overview" | "budget" | "outcomes" | "evaluation";

function Detail({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <dt className={`text-xs ${MUTED}`}>{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{value || <Empty />}</dd>
    </div>
  );
}

/** "Primary KPI: Cost per lead, $45 target" */
export function kpiText(item: InitiativeListItem) {
  if (!item.primary_kpi) return null;
  return item.kpi_target === null || item.kpi_target === undefined
    ? item.primary_kpi.name
    : `${item.primary_kpi.name}, ${formatKpiValue(item.kpi_target, item.primary_kpi.unit, item.currency)} target`;
}

/** A thin bar for the share of the budget spent; red once it's over */
export function SpendBar({ percent, className = "" }: { percent: number | null | undefined; className?: string }) {
  if (percent === null || percent === undefined) return null;
  const over = percent > 100;
  return (
    <span
      className={`block h-1.5 overflow-hidden rounded-full bg-muted ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Share of the budget spent"
    >
      <span className={`block h-full rounded-full ${over ? "bg-red-500" : percent >= 90 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(Math.max(percent, 2), 100)}%` }} />
    </span>
  );
}

function KeyDetails({ item, onEdit }: { item: InitiativeListItem; onEdit?: () => void }) {
  const { data: reference } = useReferenceData();
  const channelCode = reference?.channels.find((c) => c.id === item.channel_id)?.code;
  const subChannelCode = reference?.sub_channels.find((s) => s.id === item.sub_channel_id)?.code;
  const links = item.links ?? [];
  return (
    <Section
      title="Key Details"
      icon={Activity}
      action={
        onEdit && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Detail label="Brand" value={item.brand_name} />
        <Detail label="Channel" value={[item.channel_name, item.sub_channel_name].filter(Boolean).join(" / ")} />
        <Detail label="Owner" value={ownerName(item)} />
        <Detail label="Status" value={STATUS_LABELS[item.status]} />
        <Detail label="Start date" value={formatDate(item.start_date)} />
        <Detail label="End date" value={formatDate(item.end_date)} />
        <Detail label="Goal" value={item.goal_name} />
        <Detail label="Primary KPI" value={kpiText(item)} />
        {item.event_code && (
          <Detail label="Location" value={formatEventLocation(item.city, item.country_code, ONLINE_EVENT_SUB_CHANNELS.has(subChannelCode ?? ""))} />
        )}
        {channelFields(channelCode).map((field) => {
          const value = item.channel_details?.[field.key];
          return value ? <Detail key={field.key} label={field.label} value={field.kind === "choice" ? choiceName(reference, field.key, value) : value} /> : null;
        })}
        <Detail label="Data source" value={item.data_source ? DATA_SOURCE_LABELS[item.data_source] : null} wide />
        {links.length > 0 && (
          <Detail
            label="Linked campaigns"
            wide
            value={
              <ul className="flex flex-col gap-0.5 font-normal">
                {links.map((l) => (
                  <li key={`${l.system}:${l.external_id}`}>
                    {linkSystemName(reference, l.system)}: <span className="font-mono text-xs">{l.external_id}</span>
                    {l.account_id && <span className={MUTED}> (account {l.account_id})</span>}
                  </li>
                ))}
              </ul>
            }
          />
        )}
      </dl>
    </Section>
  );
}

function FinancialOverview({ item }: { item: InitiativeListItem }) {
  const budget = item.budget_amount;
  const actual = item.actual_spend ?? item.actual_amount;
  const variance = budget === null ? null : budget - actual;
  const percent = item.progress_percent ?? (budget ? (actual / budget) * 100 : null);
  return (
    <Section title="Financial Overview" icon={Wallet}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Detail label="Approved budget" value={budget === null ? null : formatBudget(budget, item.currency)} />
        <Detail label="Actual spend" value={formatMoney(actual, item.currency)} />
        <Detail
          label="Variance"
          value={
            variance === null ? null : (
              <span className={variance < 0 ? "text-red-600 dark:text-red-400" : undefined}>
                {formatMoney(Math.abs(variance), item.currency)} {variance < 0 ? "over budget" : "left"}
              </span>
            )
          }
        />
        <Detail label="% of budget" value={percent === null ? null : `${Math.round(percent)}%`} />
      </dl>
      <SpendBar percent={percent} className="mt-4" />
      {item.has_mixed_currencies && <p className={`mt-2 text-xs ${MUTED}`}>Some costs are in another currency and aren't included.</p>}
    </Section>
  );
}

const OUTCOME_TILES = [
  { code: "LEADS", label: "Leads" },
  { code: "MQLS", label: "Qualified leads" },
  { code: "DEMOS", label: "Demos" },
  { code: "CUSTOMERS", label: "Customers" },
];

function OutcomesSummary({ performance, loading, onMore }: { performance: Performance | undefined; loading: boolean; onMore: () => void }) {
  return (
    <Section
      title="Outcomes"
      icon={Users}
      action={
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onMore}>
          View detailed outcomes
        </Button>
      }
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {OUTCOME_TILES.map((tile) => (
          <div key={tile.code} className="rounded-lg border border-border p-3">
            <dt className={`text-xs ${MUTED}`}>{tile.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {loading ? <Skeleton className="h-6 w-10" /> : (performance?.totals[tile.code] ?? 0).toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/** "5 minutes ago", "yesterday", or the date for anything older than a week */
function timeAgo(at: string) {
  const then = new Date(at);
  const seconds = Math.round((then.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), "day");
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function RecentActivity({ initiativeId }: { initiativeId: string }) {
  const [limit, setLimit] = useState(10);
  const { data, isPending, isError, refetch, isFetching } = useInitiativeActivity(initiativeId, limit);
  const items = data ?? [];
  return (
    <Section
      title="Recent Activity"
      icon={Activity}
      action={
        items.length >= limit &&
        limit < 50 && (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setLimit(50)} disabled={isFetching}>
            View all
          </Button>
        )
      }
    >
      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3">
          <p className={`text-sm ${MUTED}`}>Could not load the activity.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className={`text-sm ${MUTED}`}>No activity yet.</p>
      ) : (
        <ol className="flex flex-col">
          {items.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
              <span className="relative mt-1.5 flex flex-col items-center" aria-hidden>
                <span className="h-2 w-2 rounded-full bg-primary" />
                {index < items.length - 1 && <span className="absolute top-3 h-[calc(100%+0.25rem)] w-px bg-border" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{entry.title}</p>
                {entry.detail && <p className={`text-sm ${MUTED}`}>{entry.detail}</p>}
                <p className={`mt-0.5 text-xs ${MUTED}`}>
                  {[entry.actor_name, timeAgo(entry.at)].filter(Boolean).join(", ")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function PerformanceTab({ item, performance, loading, kind }: { item: InitiativeListItem; performance: Performance | undefined; loading: boolean; kind: "outcomes" | "evaluation" }) {
  const { data: reference } = useReferenceData();
  const channelCode = reference?.channels.find((c) => c.id === item.channel_id)?.code;
  // Paid Search and Paid Social campaigns with a platform (sub-channel) have ad results instead of monthly outcomes
  const isAdCampaign = Boolean(item.sub_channel_id) && (channelCode === "PAID_SEARCH" || channelCode === "PAID_SOCIAL");
  if (kind === "outcomes" && isAdCampaign) return <AdOutcomes initiativeId={item.id} startDate={item.start_date} />;
  if (loading) return <Skeleton className="h-48 w-full" />;
  if (!performance) return <p className={`text-sm ${MUTED}`}>Could not load the performance figures.</p>;
  return kind === "outcomes" ? <ResultsSection initiative={item} performance={performance} /> : <WorthItSection initiative={item} performance={performance} />;
}

interface InitiativePanelProps {
  /** The row that was clicked; its full record is loaded and kept fresh */
  item: InitiativeListItem | null;
  onClose: () => void;
  onEdit?: (item: InitiativeListItem) => void;
}

export default function InitiativePanel({ item: clicked, onClose, onEdit }: InitiativePanelProps) {
  const [tab, setTab] = useState<PanelTab>("overview");
  const { hasPermission } = useAuth();
  const { data: fresh } = useInitiative(clicked?.id);
  // The list row has everything to start with; the full record replaces it once it's in
  const item = clicked ? (fresh && fresh.id === clicked.id ? { ...clicked, ...fresh } : clicked) : null;
  const { data: performance, isPending: performanceLoading } = usePerformance(item?.id);
  const canEdit = hasPermission("INITIATIVES_UPDATE") && Boolean(onEdit);

  return (
    <Sheet
      open={Boolean(clicked)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setTab("overview");
        }
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {item && (
          <>
            <SheetHeader className="gap-2 border-b border-border p-4 pr-12 sm:p-6 sm:pr-14">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg font-semibold">{item.name}</SheetTitle>
                <StatusPill item={item} />
              </div>
              <SheetDescription className={item.description ? undefined : "sr-only"}>{item.description || `${item.channel_name} initiative for ${item.brand_name}`}</SheetDescription>
              {item.needs_attention && (item.attention_reasons ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.attention_reasons.map((reason) => (
                    <Badge key={reason} variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      {ATTENTION_LABELS[reason] ?? reason}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <Link to={`/initiatives/${item.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open full page
                  </Link>
                </Button>
                {canEdit && (
                  <Button size="sm" className="gap-1.5" onClick={() => onEdit?.(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
              </div>
            </SheetHeader>

            <Tabs value={tab} onValueChange={(v) => setTab(v as PanelTab)} className="gap-0">
              <div className="overflow-x-auto border-b border-border px-4 sm:px-6">
                <TabsList variant="line" className="h-10">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="budget">Budget &amp; Expenses</TabsTrigger>
                  <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
                  <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="overview" className="flex flex-col gap-4 p-4 sm:p-6">
                <KeyDetails item={item} onEdit={canEdit ? () => onEdit?.(item) : undefined} />
                <FinancialOverview item={item} />
                <OutcomesSummary performance={performance} loading={performanceLoading} onMore={() => setTab("outcomes")} />
                <RecentActivity initiativeId={item.id} />
              </TabsContent>
              <TabsContent value="budget" className="flex flex-col gap-4 p-4 sm:p-6">
                <CostOverview initiative={item} />
                <Button variant="outline" asChild className="gap-2 self-start">
                  <Link to={`/initiatives/${item.id}/costs`}>
                    <Receipt className="h-4 w-4" />
                    Open the cost sheet
                  </Link>
                </Button>
              </TabsContent>
              <TabsContent value="outcomes" className="flex flex-col gap-4 p-4 sm:p-6">
                <PerformanceTab item={item} performance={performance} loading={performanceLoading} kind="outcomes" />
              </TabsContent>
              <TabsContent value="evaluation" className="flex flex-col gap-4 p-4 sm:p-6">
                <PerformanceTab item={item} performance={performance} loading={performanceLoading} kind="evaluation" />
                <Button variant="outline" asChild className="gap-2 self-start">
                  <Link to={`/initiatives/${item.id}/performance`}>
                    <TrendingUp className="h-4 w-4" />
                    Open the performance page
                  </Link>
                </Button>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
