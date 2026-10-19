import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, MoreHorizontal, Pencil, Plus, Search, SquareArrowOutUpRight } from "lucide-react";
import InfoTip from "@/components/dashboard/InfoTip";
import { downloadCsv } from "@/components/dashboard/csv";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { AdPlatform, AdResult, AdResultSource, AdResultStatus } from "@/types/ads";
import {
  AD_STATUS_LABELS,
  AD_STATUS_PILL,
  calculateMetrics,
  DASH,
  fmtCount,
  fmtMoney,
  fmtPercent,
  fmtUnitCost,
  formatPeriod,
  PLATFORM_LABELS,
  PLATFORM_STYLES,
  SOURCE_LABELS,
  SOURCE_STYLES,
  spendTone,
} from "./adsDisplay";
import { campaignTiming, firstStart, lastDate, type CampaignTiming } from "./adsPeriods";

// One sentence per figure, for the info tooltips
export const METRIC_INFO = {
  budget: "The budget entered for the campaign's periods.",
  spend: "What the campaign has spent; the bar shows it against the budget.",
  impressions: "Impressions: how many times the ads were shown.",
  clicks: "How many times people clicked the ads.",
  ctr: "CTR (click-through rate): clicks ÷ impressions.",
  cpc: "CPC (cost per click): spend ÷ clicks.",
  conversions: "Conversions recorded by the ad platform.",
  conversionRate: "Conv. rate: conversions ÷ clicks.",
  leads: "Leads: new HubSpot contacts from the campaign.",
  cpl: "CPL (cost per lead): spend ÷ HubSpot contacts.",
  mqls: "MQLs: marketing qualified leads.",
  sqls: "SQLs: sales qualified leads.",
};

// ─── Grouping ────────────────────────────────────────────────────────────────

export interface CampaignGroup {
  initiativeId: string;
  name: string;
  platform: AdPlatform;
  brandName: string;
  marketName: string | null;
  currency: string;
  rows: AdResult[];
  totals: ReturnType<typeof sumRows>;
}

const add = (a: number | null, b: number | null) => (b === null ? a : (a ?? 0) + b);

export function sumRows(rows: AdResult[]) {
  let budget: number | null = null;
  let spend: number | null = null;
  let impressions: number | null = null;
  let clicks: number | null = null;
  let conversions: number | null = null;
  let contacts: number | null = null;
  let mqls: number | null = null;
  let sqls: number | null = null;
  for (const r of rows) {
    budget = add(budget, r.budget_amount);
    spend = add(spend, r.spend);
    impressions = add(impressions, r.impressions);
    clicks = add(clicks, r.clicks);
    conversions = add(conversions, r.conversions);
    contacts = add(contacts, r.hubspot_contacts);
    mqls = add(mqls, r.mqls);
    sqls = add(sqls, r.sqls);
  }
  const base = { budget_amount: budget, spend, impressions, clicks, conversions, hubspot_contacts: contacts };
  return { ...base, mqls, sqls, ...calculateMetrics(base) };
}

/** One group per campaign; rows stay newest period first, then by ad group */
export function groupByCampaign(results: AdResult[]): CampaignGroup[] {
  const groups = new Map<string, CampaignGroup>();
  for (const r of results) {
    let g = groups.get(r.initiative_id);
    if (!g) {
      g = {
        initiativeId: r.initiative_id,
        name: r.campaign_name,
        platform: r.platform,
        brandName: r.brand_name,
        marketName: r.market_name,
        currency: r.currency,
        rows: [],
        totals: sumRows([]),
      };
      groups.set(r.initiative_id, g);
    }
    g.rows.push(r);
  }
  const list = [...groups.values()];
  for (const g of list) {
    g.rows.sort((a, b) => b.period_start.localeCompare(a.period_start) || (a.ad_group ?? "").localeCompare(b.ad_group ?? ""));
    g.totals = sumRows(g.rows);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name) || a.platform.localeCompare(b.platform));
}

/** Splits campaigns into running now, upcoming and finished, each in a useful order */
export function splitByTiming(groups: CampaignGroup[], today: string): Record<CampaignTiming, CampaignGroup[]> {
  const out: Record<CampaignTiming, CampaignGroup[]> = { running: [], upcoming: [], finished: [] };
  for (const g of groups) out[campaignTiming(g.rows, today)].push(g);
  out.running.sort((a, b) => firstStart(a.rows).localeCompare(firstStart(b.rows)) || a.name.localeCompare(b.name));
  out.upcoming.sort((a, b) => firstStart(a.rows).localeCompare(firstStart(b.rows)) || a.name.localeCompare(b.name));
  out.finished.sort((a, b) => lastDate(b.rows).localeCompare(lastDate(a.rows)) || a.name.localeCompare(b.name));
  return out;
}

// ─── Small pieces ────────────────────────────────────────────────────────────

export function PlatformBadge({ platform }: { platform: AdPlatform }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${PLATFORM_STYLES[platform].badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PLATFORM_STYLES[platform].dot}`} />
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

function StatusPill({ status }: { status: AdResultStatus }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${AD_STATUS_PILL[status]}`}>{AD_STATUS_LABELS[status]}</span>;
}

function SourceTag({ source }: { source: AdResultSource }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium ${SOURCE_STYLES[source]}`}>{SOURCE_LABELS[source]}</span>;
}

function ReportLink({ url, label }: { url: string | null; label: string }) {
  if (!url) return <span className="text-xs text-muted-foreground/60">{DASH}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Open the Data Studio report for ${label} in a new tab`}
      title="Open the Data Studio report"
    >
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

/** Spend with a small bar against the budget: green while there's room, amber from 90%, red when over */
function SpendBar({ spend, percent, currency }: { spend: number | null; percent: number | null; currency: string }) {
  const tone = spendTone(percent);
  return (
    <div className="min-w-28">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium tabular-nums text-foreground">{fmtMoney(spend, currency)}</span>
        {percent !== null && <span className={`text-xs font-medium tabular-nums ${tone.text}`}>{Math.round(percent)}%</span>}
      </div>
      {percent !== null && (
        <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted" title={`${Math.round(percent)}% of the budget spent`}>
          {/* A small visible sliver once anything is spent; nothing at all when nothing is */}
          <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${spend ? Math.min(Math.max(percent, 3), 100) : 0}%` }} />
        </span>
      )}
    </div>
  );
}

function Head({ children, info, right, className = "" }: { children: React.ReactNode; info?: string; right?: boolean; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground ${right ? "text-right" : "text-left"} ${className}`}>
      <span className={`inline-flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
        {children}
        {info && <InfoTip text={info} label={String(children)} />}
      </span>
    </th>
  );
}

const rowLabel = (r: AdResult) => `${r.campaign_name}${r.ad_group ? ` ${r.ad_group}` : ""}, ${formatPeriod(r.period_start, r.period_end)}`;

// ─── Row actions ─────────────────────────────────────────────────────────────

interface Actions {
  /** Opens the edit dialog for a result; not set when the user can't edit */
  onEdit?: (result: AdResult) => void;
  /** Opens the add dialog for a campaign */
  onAdd?: (initiativeId: string) => void;
}

function RowMenu({ group, onEdit, onAdd }: { group: CampaignGroup } & Actions) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()} aria-label={`Actions for ${group.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {onEdit && group.rows[0] && (
          <DropdownMenuItem onSelect={() => onEdit(group.rows[0])}>
            <Pencil />
            Edit latest result
          </DropdownMenuItem>
        )}
        {onAdd && (
          <DropdownMenuItem onSelect={() => onAdd(group.initiativeId)}>
            <Plus />
            Add result for this campaign
          </DropdownMenuItem>
        )}
        {(onEdit || onAdd) && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={() => navigate(`/initiatives/${group.initiativeId}`)}>
          <SquareArrowOutUpRight />
          Open campaign page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Expanded rows: each period and ad group ─────────────────────────────────

function PeriodRows({ group, onEdit }: { group: CampaignGroup; onEdit?: (r: AdResult) => void }) {
  const cell = "px-3 py-2 align-middle";
  const num = `${cell} text-right tabular-nums text-foreground`;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1320px] text-sm">
        <thead className="bg-muted/40">
          <tr>
            <Head>Period</Head>
            <Head>Ad group</Head>
            <Head right>Budget</Head>
            <Head className="w-36">Spend</Head>
            <Head right info={METRIC_INFO.impressions}>
              Impr.
            </Head>
            <Head right>Clicks</Head>
            <Head right info={METRIC_INFO.ctr}>
              CTR
            </Head>
            <Head right info={METRIC_INFO.cpc}>
              CPC
            </Head>
            <Head right info={METRIC_INFO.conversions}>
              Conv.
            </Head>
            <Head right info={METRIC_INFO.conversionRate}>
              Conv. rate
            </Head>
            <Head right info={METRIC_INFO.leads}>
              HS contacts
            </Head>
            <Head right info={METRIC_INFO.cpl}>
              CPL
            </Head>
            <Head right info={METRIC_INFO.mqls}>
              MQLs
            </Head>
            <Head right info={METRIC_INFO.sqls}>
              SQLs
            </Head>
            <Head>Status</Head>
            <Head>Source</Head>
            <Head>Report</Head>
            {onEdit && <Head>
              <span className="sr-only">Edit</span>
            </Head>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {group.rows.map((r) => (
            <tr key={r.id} className={r.status === "ENDED" ? "text-muted-foreground" : ""}>
              <td className={`${cell} whitespace-nowrap font-medium text-foreground`}>{formatPeriod(r.period_start, r.period_end)}</td>
              <td className={`${cell} max-w-48 truncate ${r.ad_group ? "text-foreground" : "text-muted-foreground"}`} title={r.ad_group ?? undefined}>
                {r.ad_group ?? "Whole campaign"}
              </td>
              <td className={num}>{fmtMoney(r.budget_amount, r.currency)}</td>
              <td className={cell}>
                <SpendBar spend={r.spend} percent={r.budget_used_percent} currency={r.currency} />
              </td>
              <td className={num}>{fmtCount(r.impressions)}</td>
              <td className={num}>{fmtCount(r.clicks)}</td>
              <td className={num}>{fmtPercent(r.ctr)}</td>
              <td className={num}>{fmtUnitCost(r.cpc, r.currency)}</td>
              <td className={num}>{fmtCount(r.conversions)}</td>
              <td className={num}>{fmtPercent(r.conversion_rate)}</td>
              <td className={num}>{fmtCount(r.hubspot_contacts)}</td>
              <td className={num}>{fmtUnitCost(r.cpl, r.currency)}</td>
              <td className={num}>{fmtCount(r.mqls)}</td>
              <td className={num}>{fmtCount(r.sqls)}</td>
              <td className={cell}>
                <StatusPill status={r.status} />
              </td>
              <td className={cell}>
                <SourceTag source={r.source} />
              </td>
              <td className={`${cell} py-1`}>
                <ReportLink url={r.report_url} label={rowLabel(r)} />
              </td>
              {onEdit && (
                <td className={`${cell} py-1`}>
                  <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)} aria-label={`Edit ${rowLabel(r)}`}>
                    <Pencil />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

/** A period on a phone: one small card */
function PeriodCard({ r, onEdit }: { r: AdResult; onEdit?: (r: AdResult) => void }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{formatPeriod(r.period_start, r.period_end)}</p>
          <p className="truncate text-xs text-muted-foreground">{r.ad_group ?? "Whole campaign"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <StatusPill status={r.status} />
          <ReportLink url={r.report_url} label={rowLabel(r)} />
          {onEdit && (
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)} aria-label={`Edit ${rowLabel(r)}`}>
              <Pencil />
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Budget {fmtMoney(r.budget_amount, r.currency)}</p>
      <SpendBar spend={r.spend} percent={r.budget_used_percent} currency={r.currency} />
      <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
        <Figure label="Impressions" value={fmtCount(r.impressions)} />
        <Figure label="Clicks" value={fmtCount(r.clicks)} />
        <Figure label="CTR" value={fmtPercent(r.ctr)} />
        <Figure label="CPC" value={fmtUnitCost(r.cpc, r.currency)} />
        <Figure label="Conv." value={fmtCount(r.conversions)} />
        <Figure label="Conv. rate" value={fmtPercent(r.conversion_rate)} />
        <Figure label="HS contacts" value={fmtCount(r.hubspot_contacts)} />
        <Figure label="CPL" value={fmtUnitCost(r.cpl, r.currency)} />
        <Figure label="MQLs / SQLs" value={`${fmtCount(r.mqls)} / ${fmtCount(r.sqls)}`} />
      </dl>
      <SourceTag source={r.source} />
    </div>
  );
}

// ─── Campaign performance table ──────────────────────────────────────────────

const PAGE_SIZE = 10;

function CampaignName({ group }: { group: CampaignGroup }) {
  return (
    <div className="min-w-0">
      <Link
        to={`/initiatives/${group.initiativeId}`}
        onClick={(e) => e.stopPropagation()}
        className="block truncate font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {group.name}
      </Link>
      <p className="truncate text-xs text-muted-foreground">
        {group.brandName} · {group.marketName ?? "No market"}
      </p>
    </div>
  );
}

interface CampaignTableProps extends Actions {
  groups: CampaignGroup[];
  /** Shown when there are no campaigns in this tab */
  emptyText: string;
  /** For the export's file name, e.g. "running-now" */
  exportName: string;
}

/** Campaign performance: one row per campaign (click to see its periods and ad groups), search, export and pages */
export function CampaignTable({ groups, emptyText, exportName, onEdit, onAdd }: CampaignTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => [g.name, g.brandName, g.marketName ?? "", PLATFORM_LABELS[g.platform]].some((s) => s.toLowerCase().includes(q)));
  }, [groups, query]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const first = shown.length ? current * PAGE_SIZE + 1 : 0;
  const last = Math.min((current + 1) * PAGE_SIZE, shown.length);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportCsv = () =>
    downloadCsv(
      `campaigns-${exportName}.csv`,
      ["Campaign", "Platform", "Brand", "Market", "Currency", "Budget", "Spend", "Impressions", "Clicks", "CTR %", "CPC", "Conversions", "HubSpot contacts", "CPL", "MQLs", "SQLs", "Status", "First period start", "Last date"],
      shown.map((g) => {
        const t = g.totals;
        return [
          g.name,
          PLATFORM_LABELS[g.platform],
          g.brandName,
          g.marketName ?? "",
          g.currency,
          t.budget_amount,
          t.spend,
          t.impressions,
          t.clicks,
          t.ctr,
          t.cpc,
          t.conversions,
          t.hubspot_contacts,
          t.cpl,
          t.mqls,
          t.sqls,
          g.rows[0] ? AD_STATUS_LABELS[g.rows[0].status] : "",
          firstStart(g.rows),
          lastDate(g.rows),
        ];
      }),
    );

  const cell = "px-3 py-3 align-middle";
  const num = `${cell} text-right tabular-nums text-foreground`;

  return (
    <div className={`${DASH_CARD} min-w-0 overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-foreground">Campaign performance</h3>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search campaigns"
              aria-label="Search campaigns"
              className="h-9 pl-8"
            />
          </div>
          <Button variant="outline" className="h-9 gap-2" onClick={exportCsv} disabled={shown.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{query ? "No campaigns match your search." : emptyText}</p>
      ) : (
        <>
          {/* Tablets and wider: a table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <Head className="w-8">
                    <span className="sr-only">Show periods</span>
                  </Head>
                  <Head>Campaign</Head>
                  <Head>Platform</Head>
                  <Head right info={METRIC_INFO.budget}>
                    Budget
                  </Head>
                  <Head className="w-40" info={METRIC_INFO.spend}>
                    Spend
                  </Head>
                  <Head right info={METRIC_INFO.impressions}>
                    Impressions
                  </Head>
                  <Head right info={METRIC_INFO.clicks}>
                    Clicks
                  </Head>
                  <Head right info={METRIC_INFO.leads}>
                    Leads
                  </Head>
                  <Head right info={METRIC_INFO.cpl}>
                    CPL
                  </Head>
                  <Head>Status</Head>
                  <Head>
                    <span className="sr-only">Actions</span>
                  </Head>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((g) => {
                  const t = g.totals;
                  const isOpen = open.has(g.initiativeId);
                  const used = t.budget_amount ? ((t.spend ?? 0) / t.budget_amount) * 100 : null;
                  return (
                    <Fragment key={g.initiativeId}>
                      <tr onClick={() => toggle(g.initiativeId)} className={`cursor-pointer transition-colors hover:bg-muted/40 ${isOpen ? "bg-muted/30" : ""}`}>
                        <td className={`${cell} pr-0`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(g.initiativeId);
                            }}
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Hide" : "Show"} the periods for ${g.name}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                          </button>
                        </td>
                        <td className={`${cell} max-w-72`}>
                          <CampaignName group={g} />
                        </td>
                        <td className={cell}>
                          <PlatformBadge platform={g.platform} />
                        </td>
                        <td className={num}>{fmtMoney(t.budget_amount, g.currency)}</td>
                        <td className={cell}>
                          <SpendBar spend={t.spend} percent={used} currency={g.currency} />
                        </td>
                        <td className={num}>{fmtCount(t.impressions)}</td>
                        <td className={num}>{fmtCount(t.clicks)}</td>
                        <td className={num}>{fmtCount(t.hubspot_contacts)}</td>
                        <td className={num}>{fmtUnitCost(t.cpl, g.currency)}</td>
                        <td className={cell}>{g.rows[0] && <StatusPill status={g.rows[0].status} />}</td>
                        <td className={`${cell} py-1 text-right`}>
                          <RowMenu group={g} onEdit={onEdit} onAdd={onAdd} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={11} className="bg-muted/20 p-0">
                            <div className="border-l-4 border-l-primary/30 py-1">
                              <PeriodRows group={g} onEdit={onEdit} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phones: a card per campaign */}
          <ul className="flex flex-col divide-y divide-border lg:hidden">
            {pageRows.map((g) => {
              const t = g.totals;
              const isOpen = open.has(g.initiativeId);
              const used = t.budget_amount ? ((t.spend ?? 0) / t.budget_amount) * 100 : null;
              return (
                <li key={g.initiativeId} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <CampaignName group={g} />
                    <RowMenu group={g} onEdit={onEdit} onAdd={onAdd} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformBadge platform={g.platform} />
                    {g.rows[0] && <StatusPill status={g.rows[0].status} />}
                    <span className="text-xs text-muted-foreground">Budget {fmtMoney(t.budget_amount, g.currency)}</span>
                  </div>
                  <SpendBar spend={t.spend} percent={used} currency={g.currency} />
                  <dl className="grid grid-cols-3 gap-3">
                    <Figure label="Clicks" value={fmtCount(t.clicks)} />
                    <Figure label="Leads" value={fmtCount(t.hubspot_contacts)} />
                    <Figure label="CPL" value={fmtUnitCost(t.cpl, g.currency)} />
                  </dl>
                  <button
                    type="button"
                    onClick={() => toggle(g.initiativeId)}
                    aria-expanded={isOpen}
                    className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    {isOpen ? "Hide periods" : `Show ${g.rows.length} ${g.rows.length === 1 ? "period" : "periods"}`}
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-2">
                      {g.rows.map((r) => (
                        <PeriodCard key={r.id} r={r} onEdit={onEdit} />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {first}–{last} of {shown.length} {shown.length === 1 ? "campaign" : "campaigns"}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
                  <ChevronLeft />
                </Button>
                <span className="px-2 tabular-nums">
                  {current + 1} / {pages}
                </span>
                <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
