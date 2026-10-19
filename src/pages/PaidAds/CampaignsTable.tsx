// The Campaigns tab: every campaign for the date range, with search, a column picker, selection, CSV export and pages
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Columns3, Download, Plus, Search } from "lucide-react";
import { downloadCsv } from "@/components/dashboard/csv";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { appStorage } from "@/lib/storage";
import type { AdsCampaignRow, AdsPrimaryKpi } from "@/types/ads";
import { DASH, fmtCount, fmtPercent, fmtUnitCost, fmtWholeMoney, PLATFORM_LABELS } from "./adsDisplay";
import { CampaignStatusPill, PlatformIcon } from "./AdsPieces";
import { CAMPAIGN_STATUS_LABELS, formatDay, HEALTH_DOT, HEALTH_LABELS, HEALTH_TONE, OBJECTIVE_LABELS } from "./overviewDisplay";

const PAGE_SIZE = 8;
const COLUMNS_KEY = "paid-ads-columns";

type ColumnKey =
  | "brand"
  | "region"
  | "platform"
  | "objective"
  | "kpi"
  | "budget"
  | "spend"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "conversions"
  | "leads"
  | "cpl"
  | "health"
  | "status";

interface Column {
  key: ColumnKey;
  label: string;
  info?: string;
  right?: boolean;
  optional?: boolean;
}

// In table order; optional ones are hidden until picked
const COLUMNS: Column[] = [
  { key: "brand", label: "Brand" },
  { key: "region", label: "Region", optional: true },
  { key: "platform", label: "Platform" },
  { key: "objective", label: "Objective" },
  { key: "kpi", label: "Primary KPI", optional: true },
  { key: "budget", label: "Budget", right: true, info: "Budget allocated to the date range" },
  { key: "spend", label: "Spend", right: true },
  { key: "impressions", label: "Impressions", right: true, optional: true },
  { key: "clicks", label: "Clicks", right: true, optional: true },
  { key: "ctr", label: "CTR", right: true },
  { key: "cpc", label: "CPC", right: true },
  { key: "conversions", label: "Conversions", right: true, info: "Reported by the ad platform" },
  { key: "leads", label: "Verified Leads", right: true, info: "From HubSpot" },
  { key: "cpl", label: "CPL", right: true },
  { key: "health", label: "Data Health", optional: true },
  { key: "status", label: "Status" },
];

const DEFAULT_HIDDEN = COLUMNS.filter((c) => c.optional).map((c) => c.key);

function readHidden(): ColumnKey[] {
  try {
    const saved = JSON.parse(appStorage.getItem(COLUMNS_KEY) ?? "null");
    return Array.isArray(saved) ? saved.filter((k) => COLUMNS.some((c) => c.key === k)) : DEFAULT_HIDDEN;
  } catch {
    return DEFAULT_HIDDEN;
  }
}

export function kpiValue(unit: AdsPrimaryKpi["unit"], value: number | null, currency: string) {
  if (unit === "MONEY") return fmtUnitCost(value, currency);
  if (unit === "PERCENT") return fmtPercent(value);
  return fmtCount(value);
}

const TARGET_TONE = (on: boolean | null) => (on === null ? "text-muted-foreground" : on ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400");

/** The objective's success figure (vs target), and the primary KPI when it's a different figure */
export function KpiCell({ c }: { c: AdsCampaignRow }) {
  const m = c.success_metric;
  const kpiIsMetric = m.target !== null;
  return (
    <div className="min-w-0 text-xs">
      <p className="whitespace-nowrap">
        <span className="text-muted-foreground">{m.code} </span>
        <span className="font-medium tabular-nums text-foreground">{fmtUnitCost(m.value, c.currency)}</span>
        {m.target !== null && <span className={`tabular-nums ${TARGET_TONE(m.on_target)}`}> vs {fmtUnitCost(m.target, c.currency)}</span>}
      </p>
      {c.primary_kpi && !kpiIsMetric && (
        <p className="whitespace-nowrap text-muted-foreground">
          {c.primary_kpi.name}: <span className="tabular-nums text-foreground">{kpiValue(c.primary_kpi.unit, c.primary_kpi_value, c.currency)}</span>
          {c.kpi_target !== null && <span className={`tabular-nums ${TARGET_TONE(c.primary_kpi_on_target)}`}> vs {kpiValue(c.primary_kpi.unit, c.kpi_target, c.currency)}</span>}
        </p>
      )}
    </div>
  );
}

function HealthCell({ c }: { c: AdsCampaignRow }) {
  const h = c.data_health;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${HEALTH_TONE[h.status]}`} title={h.last_data_date ? `Last data ${formatDay(h.last_data_date)}` : undefined}>
      <span className={`h-2 w-2 rounded-full ${HEALTH_DOT[h.status]}`} />
      {HEALTH_LABELS[h.status]}
    </span>
  );
}

function cell(key: ColumnKey, c: AdsCampaignRow): React.ReactNode {
  const money = (n: number | null) => fmtWholeMoney(n, c.currency);
  switch (key) {
    case "brand":
      return c.brand_name;
    case "region":
      return c.market_name ?? DASH;
    case "platform":
      return <PlatformIcon platform={c.platform} iconOnly />;
    case "objective":
      return c.objective ? (OBJECTIVE_LABELS[c.objective] ?? c.objective) : DASH;
    case "kpi":
      return <KpiCell c={c} />;
    case "budget":
      return money(c.allocated_budget);
    case "spend":
      return money(c.spend);
    case "impressions":
      return fmtCount(c.impressions);
    case "clicks":
      return fmtCount(c.clicks);
    case "ctr":
      return fmtPercent(c.ctr);
    case "cpc":
      return fmtUnitCost(c.cpc, c.currency);
    case "conversions":
      return fmtCount(c.conversions);
    case "leads":
      return fmtCount(c.verified_leads);
    case "cpl":
      return fmtUnitCost(c.cpl, c.currency);
    case "health":
      return <HealthCell c={c} />;
    case "status":
      return <CampaignStatusPill status={c.status} />;
  }
}

function exportRows(rows: AdsCampaignRow[], name: string) {
  downloadCsv(
    `paid-ads-${name}.csv`,
    [
      "Campaign", "Brand", "Region", "Platform", "Objective", "Status", "Start", "End", "Currency", "Allocated budget", "Spend", "Impressions", "Clicks",
      "CTR (%)", "CPC", "Platform conversions", "Verified leads", "CPL", "MQLs", "SQLs", "Success metric", "Success metric value", "Target",
      "Primary KPI", "Primary KPI value", "KPI target", "Campaign budget", "Spent to date", "Data health", "Last data date",
    ],
    rows.map((c) => [
      c.name, c.brand_name, c.market_name, PLATFORM_LABELS[c.platform], c.objective ? OBJECTIVE_LABELS[c.objective] : null, CAMPAIGN_STATUS_LABELS[c.status],
      c.start_date, c.end_date, c.currency, c.allocated_budget, c.spend, c.impressions, c.clicks, c.ctr, c.cpc, c.conversions, c.verified_leads, c.cpl,
      c.mqls, c.sqls, c.success_metric.label, c.success_metric.value, c.success_metric.target, c.primary_kpi?.name, c.primary_kpi_value, c.kpi_target,
      c.budget_amount, c.spend_to_date, HEALTH_LABELS[c.data_health.status], c.data_health.last_data_date,
    ]),
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

interface CampaignsTableProps {
  campaigns: AdsCampaignRow[];
  loading: boolean;
  exportName: string;
  onOpen: (id: string) => void;
  onNew?: () => void;
}

export default function CampaignsTable({ campaigns, loading, exportName, onOpen, onNew }: CampaignsTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState<ColumnKey[]>(readHidden);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleColumn = (key: ColumnKey) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    try {
      appStorage.setItem(COLUMNS_KEY, JSON.stringify(next));
    } catch {
      // Not saved; the choice still applies for now
    }
  };
  const columns = COLUMNS.filter((c) => !hidden.includes(c.key));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? campaigns.filter((c) =>
          [c.name, c.description ?? "", c.brand_name, c.market_name ?? "", PLATFORM_LABELS[c.platform], c.objective ? OBJECTIVE_LABELS[c.objective] : ""].some((s) =>
            s.toLowerCase().includes(q),
          ),
        )
      : campaigns;
    // Most spend first, then the ones without spend by name
    return [...list].sort((a, b) => (b.spend ?? -1) - (a.spend ?? -1) || a.name.localeCompare(b.name));
  }, [campaigns, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const first = filtered.length ? current * PAGE_SIZE + 1 : 0;
  const last = current * PAGE_SIZE + visible.length;

  const allOnPage = visible.length > 0 && visible.every((c) => selected.has(c.initiative_id));
  const someOnPage = visible.some((c) => selected.has(c.initiative_id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (allOnPage) next.delete(c.initiative_id);
        else next.add(c.initiative_id);
      }
      return next;
    });
  const chosen = filtered.filter((c) => selected.has(c.initiative_id));

  return (
    <section className={`${DASH_CARD} flex min-w-0 flex-col`} aria-labelledby="ads-campaigns-title">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="ads-campaigns-title" className="text-base font-semibold text-foreground">
          Campaigns <span className="font-normal text-muted-foreground">({filtered.length} {filtered.length === 1 ? "result" : "results"})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search campaigns"
              aria-label="Search campaigns"
              className="h-9 bg-card pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-2 bg-card">
                <Columns3 className="h-4 w-4" />
                <span className="max-sm:sr-only">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem key={c.key} checked={!hidden.includes(c.key)} onCheckedChange={() => toggleColumn(c.key)} onSelect={(e) => e.preventDefault()}>
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="h-9 gap-2 bg-card" onClick={() => exportRows(chosen.length ? chosen : filtered, exportName)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            {chosen.length ? `Export ${chosen.length} selected` : "Export CSV"}
          </Button>
          {onNew && (
            <Button className="h-9 gap-2" onClick={onNew}>
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          )}
        </div>
      </div>

      {chosen.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2 text-sm">
          <span>
            {chosen.length} {chosen.length === 1 ? "campaign" : "campaigns"} selected
          </span>
          <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }, (_, n) => (
            <div key={n} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{query ? "No campaigns match your search." : "No campaigns for these filters and dates."}</p>
      ) : (
        <>
          {/* Wide screens: the table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="w-10 px-4 py-2.5">
                    <Checkbox checked={allOnPage ? true : someOnPage ? "indeterminate" : false} onCheckedChange={togglePage} aria-label="Select campaigns on this page" />
                  </th>
                  <th className="px-2 py-2.5 font-medium">Campaign</th>
                  {columns.map((c) => (
                    <th key={c.key} className={`whitespace-nowrap px-2 py-2.5 font-medium ${c.right ? "text-right" : ""}`} title={c.info}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.initiative_id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40" onClick={() => onOpen(c.initiative_id)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(c.initiative_id)} onCheckedChange={() => toggle(c.initiative_id)} aria-label={`Select ${c.name}`} />
                    </td>
                    <td className="max-w-64 px-2 py-3">
                      <button
                        type="button"
                        className="block max-w-full truncate text-left font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(c.initiative_id);
                        }}
                      >
                        {c.name}
                      </button>
                      {c.description && <p className="truncate text-xs text-muted-foreground">{c.description}</p>}
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className={`whitespace-nowrap px-2 py-3 ${col.right ? "text-right tabular-nums" : ""}`}>
                        {cell(col.key, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones and tablets: cards */}
          <ul className="flex flex-col divide-y divide-border lg:hidden">
            {visible.map((c) => (
              <li key={c.initiative_id} className="flex gap-3 p-4">
                <Checkbox checked={selected.has(c.initiative_id)} onCheckedChange={() => toggle(c.initiative_id)} aria-label={`Select ${c.name}`} className="mt-1" />
                <button type="button" onClick={() => onOpen(c.initiative_id)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <PlatformIcon platform={c.platform} />
                        <span>{c.brand_name}</span>
                        {c.objective && <span>{OBJECTIVE_LABELS[c.objective] ?? c.objective}</span>}
                      </p>
                    </div>
                    <CampaignStatusPill status={c.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2">
                    <Figure label="Budget" value={fmtWholeMoney(c.allocated_budget, c.currency)} />
                    <Figure label="Spend" value={fmtWholeMoney(c.spend, c.currency)} />
                    <Figure label="CPL" value={fmtUnitCost(c.cpl, c.currency)} />
                    <Figure label="Verified leads" value={fmtCount(c.verified_leads)} />
                    <Figure label="Conversions" value={fmtCount(c.conversions)} />
                    <Figure label="CTR" value={fmtPercent(c.ctr)} />
                  </dl>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {first}-{last} of {filtered.length} {filtered.length === 1 ? "campaign" : "campaigns"}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
                  <ChevronLeft />
                </Button>
                <span className="px-2 tabular-nums">
                  Page {current + 1} of {pages}
                </span>
                <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
