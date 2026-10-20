// The side panel for one campaign: Overview, Performance, Budget & Spend, CRM Outcomes, Campaign Details
import { Link } from "react-router-dom";
import { ExternalLink, MoreHorizontal, Pencil, Plus, SquareArrowOutUpRight } from "lucide-react";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdResults, useAdsCampaignDetail } from "@/hooks/useAds";
import type { AdResult, AdsCampaignDetail } from "@/types/ads";
import { DASH, fmtCount, fmtMoney, fmtPercent, fmtUnitCost, formatPeriod, SOURCE_LABELS } from "./adsDisplay";
import { SpendLeadsChart, SpendLeadsLegend } from "./AdsCharts";
import { CampaignStatusPill, PlatformIcon, UsageBar } from "./AdsPieces";
import { kpiValue } from "./CampaignsTable";
import { attentionText, formatDay, formatRange, HEALTH_DOT, HEALTH_LABELS, OBJECTIVE_LABELS, SOURCE_KIND_LABELS } from "./overviewDisplay";

const LINK_SYSTEMS: Record<string, string> = {
  GOOGLE_ADS: "Google Ads",
  MICROSOFT_ADS: "Microsoft Ads",
  LINKEDIN_ADS: "LinkedIn Ads",
  META_ADS: "Meta Ads",
  HUBSPOT: "HubSpot",
};

const PACE_TEXT: Record<string, { label: string; tone: string }> = {
  AHEAD: { label: "Spending faster than planned", tone: "text-amber-700 dark:text-amber-400" },
  ON_TRACK: { label: "On pace", tone: "text-emerald-700 dark:text-emerald-400" },
  BEHIND: { label: "Spending slower than planned", tone: "text-sky-700 dark:text-sky-400" },
  NOT_STARTED: { label: "Not started yet", tone: "text-muted-foreground" },
};

function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-3">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 truncate text-base font-semibold tabular-nums ${tone ?? "text-foreground"}`}>{value}</dd>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</dl>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 text-sm last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-foreground">{children}</dd>
    </div>
  );
}

function FunnelStep({ label, value, of, max }: { label: string; value: number | null; of?: string; max: number }) {
  const width = value && max ? Math.max((Math.log10(value + 1) / Math.log10(max + 1)) * 100, 4) : 0;
  return (
    <li className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {fmtCount(value)}
          {of && <span className="ml-1.5 text-xs text-muted-foreground">{of}</span>}
        </span>
      </div>
      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary/70" style={{ width: `${width}%` }} />
      </span>
    </li>
  );
}

const rate = (part: number | null, whole: number | null) => (part === null || !whole ? undefined : `${fmtPercent(Math.round((part / whole) * 1000) / 10)}`);

function Overview({ d }: { d: AdsCampaignDetail }) {
  const c = d.campaign;
  const money = (n: number | null) => fmtMoney(n, c.currency);
  const unit = (n: number | null) => fmtUnitCost(n, c.currency);
  const m = c.success_metric;
  return (
    <div className="flex flex-col gap-4">
      {c.attention.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          {c.attention.map((a) => {
            const t = attentionText(a, c.currency, c);
            return (
              <li key={a.kind} className="text-amber-900 dark:text-amber-200">
                <span className="font-medium">{t.title}.</span> {t.detail}
              </li>
            );
          })}
        </ul>
      )}
      <Grid>
        <Stat label="Spend" value={money(c.spend)} />
        <Stat label="Impressions" value={fmtCount(c.impressions)} />
        <Stat label="Clicks" value={fmtCount(c.clicks)} />
        <Stat label="CTR" value={fmtPercent(c.ctr)} />
        <Stat label="CPC" value={unit(c.cpc)} />
        <Stat label="Conversions" value={fmtCount(c.conversions)} hint="Platform-reported" />
      </Grid>
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Success metric for {c.objective ? (OBJECTIVE_LABELS[c.objective] ?? c.objective).toLowerCase() : "this campaign"}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium text-foreground">{m.label}</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">{unit(m.value)}</span>
          {m.target !== null && (
            <span className={m.on_target ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
              {m.on_target ? "On target" : "Above target"} ({unit(m.target)})
            </span>
          )}
        </p>
        {m.code === "CPE" && <p className="mt-1 text-xs text-muted-foreground">Counted per click, as engagements aren't imported yet.</p>}
        {c.roas !== null && <p className="mt-1 text-xs text-muted-foreground">Return on ad spend since it started: {c.roas.toFixed(2)}x</p>}
        {c.primary_kpi && (
          <p className="mt-2 border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">Primary KPI: </span>
            <span className="text-foreground">{c.primary_kpi.name} </span>
            <span className="font-medium tabular-nums text-foreground">{kpiValue(c.primary_kpi.unit, c.primary_kpi_value, c.currency)}</span>
            {c.kpi_target !== null && (
              <span className={c.primary_kpi_on_target === null ? "text-muted-foreground" : c.primary_kpi_on_target ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                {" "}
                vs target {kpiValue(c.primary_kpi.unit, c.kpi_target, c.currency)}
              </span>
            )}
            <span className="block text-xs text-muted-foreground">{c.primary_kpi.unit === "COUNT" ? "Since the campaign started." : "For the selected dates."}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Performance({ d }: { d: AdsCampaignDetail }) {
  const f = d.funnel;
  const max = Math.max(f.impressions ?? 0, f.clicks ?? 0, 1);
  const empty = d.trend.every((p) => p.spend === 0 && p.verified_leads === 0);
  return (
    <div className="flex flex-col gap-4">
      <ChartCard title="Spend and verified leads" subtitle={`${formatRange(d.date_from, d.date_to)}, ${d.currency}`} action={<SpendLeadsLegend />} className="p-3 sm:p-4">
        {empty ? <ChartEmpty text="No results in these dates." height={200} /> : <SpendLeadsChart points={d.trend} bucket={d.bucket} currency={d.currency} height={200} />}
      </ChartCard>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-sm font-medium text-foreground">Ad platform</p>
          <ul className="flex flex-col gap-2.5">
            <FunnelStep label="Impressions" value={f.impressions} max={max} />
            <FunnelStep label="Clicks" value={f.clicks} of={rate(f.clicks, f.impressions)} max={max} />
            <FunnelStep label="Conversions" value={f.conversions} of={rate(f.conversions, f.clicks)} max={max} />
          </ul>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-sm font-medium text-foreground">HubSpot</p>
          <ul className="flex flex-col gap-2.5">
            <FunnelStep label="Verified leads" value={f.verified_leads} of={rate(f.verified_leads, f.clicks)} max={max} />
            <FunnelStep label="MQLs" value={f.mqls} of={rate(f.mqls, f.verified_leads)} max={max} />
            <FunnelStep label="SQLs" value={f.sqls} of={rate(f.sqls, f.mqls)} max={max} />
          </ul>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Platform conversions and verified leads are counted separately and never added together. Percentages are of the step before.</p>
    </div>
  );
}

function ResultsList({ initiativeId, onEdit }: { initiativeId: string; onEdit?: (r: AdResult) => void }) {
  const results = useAdResults({ initiative_id: initiativeId });
  const rows = results.data?.results ?? [];
  if (results.isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No results entered yet.</p>;
  return (
    <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate text-foreground">
              {formatPeriod(r.period_start, r.period_end)}
              {r.ad_group && <span className="text-muted-foreground"> {r.ad_group}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {fmtMoney(r.spend, r.currency)} spend, {fmtCount(r.hubspot_contacts)} leads, {SOURCE_LABELS[r.source].toLowerCase()}
            </p>
          </div>
          {onEdit && (
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)} aria-label={`Edit ${formatPeriod(r.period_start, r.period_end)}`}>
              <Pencil />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function BudgetSpend({ d, onEdit, onAdd }: { d: AdsCampaignDetail; onEdit?: (r: AdResult) => void; onAdd?: () => void }) {
  const c = d.campaign;
  const b = d.budget;
  const money = (n: number | null) => fmtMoney(n, c.currency);
  const pace = b.status ? PACE_TEXT[b.status] : null;
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Stat label="Allocated" value={money(b.budget_amount)} hint="Whole campaign" />
        <Stat label="Spent" value={money(b.spent)} hint="Since it started" />
        <Stat label="Remaining" value={money(b.remaining)} tone={b.remaining !== null && b.remaining < 0 ? "text-red-600 dark:text-red-400" : undefined} />
      </Grid>
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium text-foreground">Pace</span>
          {pace && <span className={`text-xs font-medium ${pace.tone}`}>{pace.label}</span>}
        </div>
        <div className="mt-3 flex flex-col gap-2 text-xs">
          <div>
            <div className="flex justify-between text-muted-foreground">
              <span>Budget spent</span>
              <span className="tabular-nums">{b.budget_used_percent === null ? DASH : `${Math.round(b.budget_used_percent)}%`}</span>
            </div>
            <UsageBar percent={b.budget_used_percent} className="mt-1" />
          </div>
          <div>
            <div className="flex justify-between text-muted-foreground">
              <span>Time gone by</span>
              <span className="tabular-nums">
                {b.time_elapsed_percent === null ? DASH : `${Math.round(b.time_elapsed_percent)}%`}
                {b.days_total !== null && ` (${b.days_elapsed} of ${b.days_total} days)`}
              </span>
            </div>
            <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-slate-400" style={{ width: `${Math.min(b.time_elapsed_percent ?? 0, 100)}%` }} />
            </span>
          </div>
        </div>
        {b.time_elapsed_percent === null && <p className="mt-2 text-xs text-muted-foreground">Add start and end dates to the campaign to see its pace.</p>}
      </div>
      <Grid>
        <Stat label="Allocated in these dates" value={money(c.allocated_budget)} />
        <Stat label="Spend in these dates" value={money(c.spend)} />
        <Stat label="Cost per lead" value={fmtUnitCost(c.cpl, c.currency)} hint={d.platform_cpl !== null ? `Platform average ${fmtUnitCost(d.platform_cpl, c.currency)}` : undefined} />
      </Grid>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Results by period</p>
          {onAdd && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />
              Add result
            </Button>
          )}
        </div>
        <ResultsList initiativeId={c.initiative_id} onEdit={onEdit} />
      </div>
    </div>
  );
}

function Crm({ d }: { d: AdsCampaignDetail }) {
  const crm = d.crm;
  const money = (n: number | null) => fmtMoney(n, d.currency);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">Since the campaign started. Leads, MQLs and SQLs come from HubSpot through the campaign's results; customers and revenue as Sales recorded them.</p>
      <Grid>
        <Stat label="Verified leads" value={fmtCount(crm.verified_leads)} hint={crm.cost_per_lead !== null ? `${fmtUnitCost(crm.cost_per_lead, d.currency)} each` : undefined} />
        <Stat label="MQLs" value={fmtCount(crm.mqls)} />
        <Stat
          label="SQLs"
          value={fmtCount(crm.sqls)}
          hint={crm.demos !== null ? `${fmtCount(crm.demos)} demos` : crm.cost_per_sql !== null ? `${fmtUnitCost(crm.cost_per_sql, d.currency)} per SQL` : undefined}
        />
        <Stat label="Customers" value={fmtCount(crm.customers)} />
        <Stat label="Revenue" value={crm.revenue === null ? "Not recorded" : money(crm.revenue)} />
        <Stat label="Return on ad spend" value={crm.roas === null ? DASH : `${crm.roas.toFixed(2)}x`} hint={crm.spend !== null ? `On ${money(crm.spend)} spend` : undefined} />
      </Grid>
    </div>
  );
}

function Details({ d }: { d: AdsCampaignDetail }) {
  const c = d.campaign;
  const date = (v: string | null) => (v ? formatDay(v) : "Not set");
  return (
    <dl className="rounded-lg border border-border px-3">
      <Row label="Status">
        <CampaignStatusPill status={c.status} />
      </Row>
      <Row label="Dates">
        {date(c.start_date)} to {date(c.end_date)}
      </Row>
      <Row label="Platform">
        <PlatformIcon platform={c.platform} />
      </Row>
      <Row label="Platform campaign ID">
        {d.links.length === 0 ? (
          <span className="text-muted-foreground">Not linked</span>
        ) : (
          d.links.map((l) => (
            <span key={`${l.system}-${l.external_id}`} className="block">
              <span className="text-muted-foreground">{LINK_SYSTEMS[l.system] ?? l.system}: </span>
              <span className="font-mono text-xs">{l.external_id}</span>
            </span>
          ))
        )}
      </Row>
      {c.ad_account_id && <Row label="Ad account">{c.ad_account_id}</Row>}
      <Row label="Brand">{c.brand_name}</Row>
      <Row label="Region">{c.market_name ?? "Not set"}</Row>
      <Row label="Objective">{c.objective ? (OBJECTIVE_LABELS[c.objective] ?? c.objective) : "Not set"}</Row>
      <Row label="Owner">{c.owner_name ?? "Not set"}</Row>
      <Row label="Data">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${HEALTH_DOT[c.data_health.status]}`} />
          {HEALTH_LABELS[c.data_health.status]}
          {c.data_health.source && <span className="text-muted-foreground">, {SOURCE_KIND_LABELS[c.data_health.source].toLowerCase()}</span>}
        </span>
        {c.data_health.last_data_date && <span className="block text-xs text-muted-foreground">Last data {formatDay(c.data_health.last_data_date)}</span>}
      </Row>
      <Row label="Initiative">
        <Link to={`/initiatives/${c.initiative_id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
          Open initiative
          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
        </Link>
      </Row>
      <Row label="Report">
        {c.report_url ? (
          <a href={c.report_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
            Open report
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-muted-foreground">No report link</span>
        )}
      </Row>
    </dl>
  );
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * An ad campaign's results since it started, for the Outcomes tab of the Marketing Initiatives panel: the platform's
 * figures (spend, impressions, clicks, conversions), the spend and leads chart, HubSpot's leads, MQLs and SQLs, and
 * the results by week. Read only: results come from the ad platform sync, uploads or Paid Advertising.
 */
export function AdOutcomes({ initiativeId, startDate }: { initiativeId: string; startDate: string | null }) {
  const today = new Date();
  const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const to = isoDay(today);
  const range = { from: startDate && startDate <= to ? startDate : isoDay(yearAgo), to };
  const detail = useAdsCampaignDetail(initiativeId, range);
  const d = detail.data;
  if (detail.error) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        Could not load the ad results.
        <Button variant="outline" size="sm" onClick={() => detail.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!d) return <Skeleton className="h-80 w-full rounded-lg" />;
  const c = d.campaign;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {startDate && startDate <= to ? "Since the campaign started" : "Last 12 months"} ({formatRange(range.from, range.to)}), {c.currency}
        </p>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to={`/paid-ads?campaign=${initiativeId}`}>
            <SquareArrowOutUpRight className="h-3.5 w-3.5" />
            Open in Paid Advertising
          </Link>
        </Button>
      </div>
      <Grid>
        <Stat label="Spend" value={fmtMoney(c.spend, c.currency)} />
        <Stat label="Impressions" value={fmtCount(c.impressions)} />
        <Stat label="Clicks" value={fmtCount(c.clicks)} />
        <Stat label="CTR" value={fmtPercent(c.ctr)} />
        <Stat label="CPC" value={fmtUnitCost(c.cpc, c.currency)} />
        <Stat label="Conversions" value={fmtCount(c.conversions)} hint="Platform-reported" />
      </Grid>
      <Performance d={d} />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">Sales outcomes</p>
        <Crm d={d} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">Results by week</p>
        <ResultsList initiativeId={initiativeId} />
      </div>
    </div>
  );
}

interface CampaignPanelProps {
  initiativeId: string | null;
  range: { from: string; to: string };
  onClose: () => void;
  onEditResult?: (r: AdResult) => void;
  onAddResult?: (initiativeId: string) => void;
}

export default function CampaignPanel({ initiativeId, range, onClose, onEditResult, onAddResult }: CampaignPanelProps) {
  const detail = useAdsCampaignDetail(initiativeId, range);
  const d = detail.data;
  const c = d?.campaign;
  return (
    <Sheet open={Boolean(initiativeId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:lg:max-w-2xl">
        <SheetHeader className="gap-2 border-b border-border p-4 pr-12">
          {c ? (
            <>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg leading-snug">{c.name}</SheetTitle>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <PlatformIcon platform={c.platform} />
                    <span>{c.brand_name}</span>
                    <CampaignStatusPill status={c.status} />
                  </SheetDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon-sm" aria-label="Campaign actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onAddResult && (
                      <DropdownMenuItem onClick={() => onAddResult(c.initiative_id)}>
                        <Plus />
                        Add result
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to={`/initiatives/${c.initiative_id}`}>
                        <SquareArrowOutUpRight />
                        Open initiative
                      </Link>
                    </DropdownMenuItem>
                    {c.report_url && (
                      <DropdownMenuItem asChild>
                        <a href={c.report_url} target="_blank" rel="noreferrer noopener">
                          <ExternalLink />
                          Open report
                        </a>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              <p className="text-xs text-muted-foreground">
                Figures for {formatRange(range.from, range.to)}, {c.currency}
              </p>
            </>
          ) : (
            <>
              <SheetTitle className="sr-only">Campaign</SheetTitle>
              <SheetDescription className="sr-only">Campaign details</SheetDescription>
              {detail.isLoading && <Skeleton className="h-12 w-3/4" />}
            </>
          )}
        </SheetHeader>
        <div className="p-4">
          {detail.error ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {detail.error.message || "Could not load the campaign."}
              <Button variant="outline" size="sm" onClick={() => detail.refetch()}>
                Try again
              </Button>
            </div>
          ) : !d ? (
            <Skeleton className="h-80 w-full rounded-lg" />
          ) : (
            <Tabs defaultValue="overview" className="min-w-0 gap-4">
              <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
                <TabsList className="h-9">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="budget">Budget & Spend</TabsTrigger>
                  <TabsTrigger value="crm">CRM Outcomes</TabsTrigger>
                  <TabsTrigger value="details">Campaign Details</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="overview">
                <Overview d={d} />
              </TabsContent>
              <TabsContent value="performance">
                <Performance d={d} />
              </TabsContent>
              <TabsContent value="budget">
                <BudgetSpend d={d} onEdit={onEditResult} onAdd={onAddResult ? () => onAddResult(d.campaign.initiative_id) : undefined} />
              </TabsContent>
              <TabsContent value="crm">
                <Crm d={d} />
              </TabsContent>
              <TabsContent value="details">
                <Details d={d} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
