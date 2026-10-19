// The Platforms, Budget & Spend and Data Health tabs of the Paid Advertising page
import { AlertTriangle, CircleCheck } from "lucide-react";
import BudgetSpendChart, { BudgetSpendLegend, type BudgetSpendPoint } from "@/components/dashboard/BudgetSpendChart";
import ChartCard, { ChartEmpty } from "@/components/dashboard/ChartCard";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdsDataHealth } from "@/hooks/useAds";
import type { AdsCampaignRow, AdsHealthFilters, AdsOverview } from "@/types/ads";
import { DASH, fmtCount, fmtMoney, fmtPercent, fmtUnitCost } from "./adsDisplay";
import { PlatformBudgetChart, PlatformBudgetLegend } from "./AdsCharts";
import { CampaignStatusPill, PlatformIcon, UsageBar } from "./AdsPieces";
import { CONNECTION_LABELS, formatDay, formatRange, HEALTH_DOT, HEALTH_LABELS, HEALTH_TONE, SOURCE_KIND_LABELS } from "./overviewDisplay";

function TableCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className={`${DASH_CARD} flex min-w-0 flex-col`} aria-label={title}>
      <div className="border-b border-border p-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

const TH = "whitespace-nowrap px-3 py-2.5 font-medium";
const TD = "whitespace-nowrap px-3 py-2.5";

function Change({ current, previous, goodWhen = "up" }: { current: number | null; previous: number | null; goodWhen?: "up" | "down" }) {
  if (current === null || previous === null || previous === 0) return <span className="text-muted-foreground">-</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return <span className="text-muted-foreground">0%</span>;
  const good = pct > 0 === (goodWhen === "up");
  return (
    <span className={`tabular-nums ${good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {pct > 0 ? "+" : "-"}
      {Math.round(Math.abs(pct))}%
    </span>
  );
}

// ─── Platforms ───────────────────────────────────────────────────────────────

export function PlatformsTab({ data, loading }: { data: AdsOverview | undefined; loading: boolean }) {
  const rows = data?.by_platform ?? [];
  const currency = data?.currency ?? "USD";
  const money = (n: number | null) => fmtMoney(n, currency);
  const unit = (n: number | null) => fmtUnitCost(n, currency);
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <ChartCard title="Ad Spend vs. Allocated Budget by Platform" subtitle={data ? `${formatRange(data.date_from, data.date_to)}, ${currency}` : undefined} action={<PlatformBudgetLegend />}>
        {loading ? <Skeleton className="h-[320px] w-full rounded-lg" /> : rows.length === 0 ? <ChartEmpty text="No platform results in this date range." height={320} /> : <PlatformBudgetChart rows={rows} currency={currency} height={320} />}
      </ChartCard>
      <TableCard title="By platform" subtitle="Change compares with the previous period of the same length.">
        {loading ? (
          <Skeleton className="m-4 h-40 rounded-lg" />
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No platform results in this date range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className={TH}>Platform</th>
                <th className={`${TH} text-right`}>Campaigns</th>
                <th className={`${TH} text-right`}>Allocated</th>
                <th className={`${TH} text-right`}>Spend</th>
                <th className={`${TH} text-right`}>Spend change</th>
                <th className={`${TH} text-right`}>Impressions</th>
                <th className={`${TH} text-right`}>Clicks</th>
                <th className={`${TH} text-right`}>CTR</th>
                <th className={`${TH} text-right`}>CPC</th>
                <th className={`${TH} text-right`}>Conversions</th>
                <th className={`${TH} text-right`}>Verified leads</th>
                <th className={`${TH} text-right`}>Leads change</th>
                <th className={`${TH} text-right`}>CPL</th>
                <th className={`${TH} text-right`}>CPL change</th>
                <th className={`${TH} text-right`}>MQLs</th>
                <th className={`${TH} text-right`}>SQLs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.platform} className="border-b border-border last:border-b-0">
                  <td className={TD}>
                    <PlatformIcon platform={r.platform} />
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{r.campaign_count}</td>
                  <td className={`${TD} text-right tabular-nums`}>{money(r.allocated_budget)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{money(r.spend)}</td>
                  <td className={`${TD} text-right`}>
                    <Change current={r.spend} previous={r.previous_spend} />
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtCount(r.impressions)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtCount(r.clicks)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtPercent(r.ctr)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{unit(r.cpc)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtCount(r.conversions)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtCount(r.verified_leads)}</td>
                  <td className={`${TD} text-right`}>
                    <Change current={r.verified_leads} previous={r.previous_verified_leads} />
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{unit(r.cpl)}</td>
                  <td className={`${TD} text-right`}>
                    <Change current={r.cpl} previous={r.previous_cpl} goodWhen="down" />
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtCount(r.mqls)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtCount(r.sqls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
    </div>
  );
}

// ─── Budget & Spend ──────────────────────────────────────────────────────────

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const DAY = 86_400_000;

/** Share of the campaign's days gone by on `today` (null without both dates) */
function elapsedPercent(c: AdsCampaignRow, today: string) {
  if (!c.start_date || !c.end_date) return null;
  const total = (parse(c.end_date).getTime() - parse(c.start_date).getTime()) / DAY + 1;
  const gone = Math.min(Math.max((parse(today).getTime() - parse(c.start_date).getTime()) / DAY + 1, 0), total);
  return (gone / total) * 100;
}

function paceOf(used: number | null, elapsed: number | null) {
  if (used === null || elapsed === null) return { label: DASH, tone: "text-muted-foreground" };
  if (elapsed <= 0) return { label: "Not started", tone: "text-muted-foreground" };
  if (used - elapsed > 10) return { label: "Ahead", tone: "text-amber-700 dark:text-amber-400" };
  if (elapsed - used > 10) return { label: "Behind", tone: "text-sky-700 dark:text-sky-400" };
  return { label: "On pace", tone: "text-emerald-700 dark:text-emerald-400" };
}

function UsageRow({ label, allocated, spend, currency }: { label: React.ReactNode; allocated: number | null; spend: number | null; currency: string }) {
  const used = allocated ? ((spend ?? 0) / allocated) * 100 : null;
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className={`${TD} max-w-48`}>{label}</td>
      <td className={`${TD} text-right tabular-nums`}>{fmtMoney(allocated, currency)}</td>
      <td className={`${TD} text-right tabular-nums`}>{fmtMoney(spend, currency)}</td>
      <td className={`${TD} text-right tabular-nums`}>{allocated === null ? DASH : fmtMoney(allocated - (spend ?? 0), currency)}</td>
      <td className={`${TD} w-40`}>
        <div className="flex items-center gap-2">
          <UsageBar percent={used} />
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{used === null ? DASH : `${Math.round(used)}%`}</span>
        </div>
      </td>
    </tr>
  );
}

function UsageHead({ first }: { first: string }) {
  return (
    <thead>
      <tr className="border-b border-border text-left text-xs text-muted-foreground">
        <th className={TH}>{first}</th>
        <th className={`${TH} text-right`}>Allocated</th>
        <th className={`${TH} text-right`}>Spend</th>
        <th className={`${TH} text-right`}>Remaining</th>
        <th className={TH}>Used</th>
      </tr>
    </thead>
  );
}

export function BudgetTab({ data, loading, onOpen }: { data: AdsOverview | undefined; loading: boolean; onOpen: (id: string) => void }) {
  const currency = data?.currency ?? "USD";
  const months: BudgetSpendPoint[] = (data?.by_month ?? []).map((m) => {
    const d = parse(m.month);
    return {
      key: m.month,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      fullLabel: `${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })} (${formatRange(m.start, m.end)})`,
      budget: m.allocated_budget ?? 0,
      spend: m.spend ?? 0,
    };
  });
  const today = data?.today ?? "";
  const pacing = (data?.campaigns ?? [])
    .filter((c) => c.budget_amount && (c.status === "ACTIVE" || c.status === "PAUSED"))
    .map((c) => ({ c, elapsed: elapsedPercent(c, today) }))
    .sort((a, b) => (b.c.budget_used_percent ?? 0) - (b.elapsed ?? 0) - ((a.c.budget_used_percent ?? 0) - (a.elapsed ?? 0)));

  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <ChartCard title="Allocated budget vs. spend by month" subtitle={data ? `${formatRange(data.date_from, data.date_to)}, ${currency}` : undefined} action={<BudgetSpendLegend budgetLabel="Allocated budget" spendLabel="Ad spend" />}>
        {months.every((m) => m.budget === 0 && m.spend === 0) ? <ChartEmpty text="No budget or spend in this date range." /> : <BudgetSpendChart data={months} currency={currency} budgetLabel="Allocated budget" spendLabel="Ad spend" />}
      </ChartCard>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
        <TableCard title="By brand">
          <table className="w-full text-sm">
            <UsageHead first="Brand" />
            <tbody>
              {(data?.by_brand ?? []).map((b) => (
                <UsageRow key={b.brand_id} label={b.brand_name} allocated={b.allocated_budget} spend={b.spend} currency={currency} />
              ))}
            </tbody>
          </table>
        </TableCard>
        <TableCard title="By platform">
          <table className="w-full text-sm">
            <UsageHead first="Platform" />
            <tbody>
              {(data?.by_platform ?? []).map((p) => (
                <UsageRow key={p.platform} label={<PlatformIcon platform={p.platform} />} allocated={p.allocated_budget} spend={p.spend} currency={currency} />
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
      <TableCard title="Pacing" subtitle="Each running campaign's spend so far against the share of its dates gone by. Ahead or behind by more than 10 points is flagged.">
        {pacing.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No active or paused campaigns with a budget.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className={TH}>Campaign</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Budget</th>
                <th className={`${TH} text-right`}>Spent to date</th>
                <th className={`${TH} text-right`}>Budget used</th>
                <th className={`${TH} text-right`}>Time gone by</th>
                <th className={TH}>Pace</th>
              </tr>
            </thead>
            <tbody>
              {pacing.map(({ c, elapsed }) => {
                const pace = paceOf(c.budget_used_percent, elapsed);
                return (
                  <tr key={c.initiative_id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40" onClick={() => onOpen(c.initiative_id)}>
                    <td className={`${TD} max-w-64`}>
                      <span className="flex min-w-0 items-center gap-2">
                        <PlatformIcon platform={c.platform} iconOnly />
                        <span className="truncate font-medium text-foreground">{c.name}</span>
                      </span>
                    </td>
                    <td className={TD}>
                      <CampaignStatusPill status={c.status} />
                    </td>
                    <td className={`${TD} text-right tabular-nums`}>{fmtMoney(c.budget_amount, c.currency)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{fmtMoney(c.spend_to_date, c.currency)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{c.budget_used_percent === null ? DASH : `${Math.round(c.budget_used_percent)}%`}</td>
                    <td className={`${TD} text-right tabular-nums`}>{elapsed === null ? DASH : `${Math.round(elapsed)}%`}</td>
                    <td className={`${TD} text-xs font-medium ${pace.tone}`}>{pace.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableCard>
    </div>
  );
}

// ─── Data Health ─────────────────────────────────────────────────────────────

export function DataHealthTab({ filters, onOpen }: { filters: AdsHealthFilters; onOpen: (id: string) => void }) {
  const health = useAdsDataHealth(filters);
  const platforms = health.data?.platforms ?? [];
  const problems = platforms.flatMap((p) => p.problems.map((x) => ({ ...x, platform: p.platform })));
  if (health.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (health.error)
    return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{health.error.message || "Could not load data health."}</p>;
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <TableCard title="Sources by platform" subtitle={`Results older than ${health.data?.stale_after_days ?? 7} days on a running campaign count as delayed.`}>
        {platforms.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No ad campaigns for these filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className={TH}>Platform</th>
                <th className={TH}>Source</th>
                <th className={TH}>Accounts</th>
                <th className={`${TH} text-right`}>Campaigns</th>
                <th className={TH}>Last data</th>
                <th className={TH}>Missing or late</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p) => (
                <tr key={p.platform} className="border-b border-border last:border-b-0">
                  <td className={TD}>
                    <PlatformIcon platform={p.platform} />
                  </td>
                  <td className={TD}>
                    {p.connection_status ? (
                      <span className={p.connection_status === "CONNECTED" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                        API: {CONNECTION_LABELS[p.connection_status] ?? p.connection_status}
                      </span>
                    ) : p.source ? (
                      SOURCE_KIND_LABELS[p.source]
                    ) : (
                      <span className="text-muted-foreground">No results yet</span>
                    )}
                  </td>
                  <td className={`${TD} max-w-56 truncate text-muted-foreground`} title={[...p.connections.map((c) => c.account_name ?? c.account_id ?? ""), ...p.accounts].join(", ")}>
                    {p.connections.length || p.accounts.length ? [...p.connections.map((c) => c.account_name ?? c.account_id ?? "Connected account"), ...p.accounts].join(", ") : DASH}
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>
                    {p.active_campaign_count} active
                    <span className="text-muted-foreground"> of {p.campaign_count}</span>
                  </td>
                  <td className={TD}>{p.last_data_date ? formatDay(p.last_data_date) : DASH}</td>
                  <td className={TD}>
                    {p.problems.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <CircleCheck className="h-4 w-4" />
                        None
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        {p.problems.length} {p.problems.length === 1 ? "campaign" : "campaigns"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <TableCard title="Campaigns with missing or late data">
        {problems.length === 0 ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <CircleCheck className="h-4 w-4 text-emerald-600" />
            Every running campaign has recent results.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className={TH}>Campaign</th>
                <th className={TH}>Brand</th>
                <th className={TH}>Problem</th>
                <th className={TH}>Last data</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((x) => (
                <tr key={x.initiative_id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40" onClick={() => onOpen(x.initiative_id)}>
                  <td className={`${TD} max-w-72`}>
                    <span className="flex min-w-0 items-center gap-2">
                      <PlatformIcon platform={x.platform} iconOnly />
                      <span className="truncate font-medium text-foreground">{x.name}</span>
                    </span>
                  </td>
                  <td className={TD}>{x.brand_name}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center gap-1.5 ${HEALTH_TONE[x.health]}`}>
                      <span className={`h-2 w-2 rounded-full ${HEALTH_DOT[x.health]}`} />
                      {HEALTH_LABELS[x.health]}
                    </span>
                  </td>
                  <td className={TD}>{x.last_data_date ? formatDay(x.last_data_date) : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
    </div>
  );
}
