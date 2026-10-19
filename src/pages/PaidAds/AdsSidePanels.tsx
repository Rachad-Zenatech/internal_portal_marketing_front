// The right column of the Paid Advertising page: campaigns needing attention, platform performance, budget by brand
import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronRight, CircleCheck } from "lucide-react";
import InfoTip from "@/components/dashboard/InfoTip";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdsAttentionItem, AdsBrandRow, AdsCampaignRow, AdsPlatformRow } from "@/types/ads";
import { fmtCount, fmtUnitCost, fmtWholeMoney, PLATFORM_LABELS } from "./adsDisplay";
import { PlatformIcon, UsageBar } from "./AdsPieces";
import { ATTENTION_INFO, attentionText } from "./overviewDisplay";

function Panel({ title, info, action, children }: { title: string; info?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${DASH_CARD} flex min-w-0 flex-col gap-3 p-4 sm:p-5`} aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
          {title}
          {info && <InfoTip text={info} label={title} />}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SHOWN = 4;

export function AttentionPanel({
  items,
  campaigns,
  currency,
  loading,
  onOpen,
}: {
  items: AdsAttentionItem[];
  campaigns: AdsCampaignRow[];
  currency: string;
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  const [all, setAll] = useState(false);
  const byId = new Map(campaigns.map((c) => [c.initiative_id, c]));
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <Panel
      title="Campaigns Needing Attention"
      info={ATTENTION_INFO}
      action={
        items.length > SHOWN && (
          <button type="button" onClick={() => setAll((v) => !v)} className="shrink-0 text-sm font-medium text-primary underline-offset-2 hover:underline">
            {all ? "Show less" : `View all (${items.length})`}
          </button>
        )
      }
    >
      {loading ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          <CircleCheck className="h-4 w-4 text-emerald-600" />
          Nothing needs attention right now.
        </p>
      ) : (
        <ul className="-mx-1 flex flex-col">
          {shown.map((item, n) => {
            const text = attentionText(item, currency, byId.get(item.initiative_id));
            return (
              <li key={`${item.initiative_id}-${item.kind}-${n}`}>
                <button
                  type="button"
                  onClick={() => onOpen(item.initiative_id)}
                  className="flex w-full min-w-0 items-start gap-3 rounded-lg px-1 py-2 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${item.severity === "HIGH" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`} aria-label={item.severity === "HIGH" ? "Serious" : "Warning"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{text.title}.</span> {text.detail}
                    </span>
                  </span>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1">
                    <PlatformIcon platform={item.platform} iconOnly />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Change({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null || previous === 0) return <span className="text-muted-foreground">-</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return <span className="text-muted-foreground">0%</span>;
  const up = pct > 0;
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      <Arrow className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      {Math.round(Math.abs(pct))}%
    </span>
  );
}

export function PlatformPerformancePanel({ rows, currency, loading }: { rows: AdsPlatformRow[]; currency: string; loading: boolean }) {
  return (
    <Panel title="Platform Performance" info="Spend, verified leads and cost per lead for each platform in the date range. Change compares verified leads with the previous period.">
      {loading ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No platform results in this date range.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[18rem] text-xs">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-1 pb-2 font-medium">Platform</th>
                <th className="px-1 pb-2 text-right font-medium">Spend</th>
                <th className="px-1 pb-2 text-right font-medium">Leads</th>
                <th className="px-1 pb-2 text-right font-medium">CPL</th>
                <th className="px-1 pb-2 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.platform} className="border-t border-border">
                  <td className="max-w-28 px-1 py-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <PlatformIcon platform={r.platform} iconOnly />
                      <span className="truncate text-foreground">{PLATFORM_LABELS[r.platform].replace(/ Ads$/, "")}</span>
                    </span>
                  </td>
                  <td className="px-1 py-2 text-right tabular-nums">{fmtWholeMoney(r.spend, currency)}</td>
                  <td className="px-1 py-2 text-right tabular-nums">{fmtCount(r.verified_leads)}</td>
                  <td className="px-1 py-2 text-right tabular-nums">{fmtUnitCost(r.cpl, currency)}</td>
                  <td className="px-1 py-2 text-right text-xs">
                    <Change current={r.verified_leads} previous={r.previous_verified_leads} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function BrandUtilizationPanel({ rows, currency, loading }: { rows: AdsBrandRow[]; currency: string; loading: boolean }) {
  const withBudget = rows.filter((r) => r.allocated_budget || r.spend);
  return (
    <Panel title="Budget Utilization by Brand" info="Ad spend as a share of the budget allocated to each brand's campaigns in the date range.">
      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : withBudget.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budget or spend in this date range.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {withBudget.map((b) => (
            <li key={b.brand_id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-foreground">{b.brand_name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {b.budget_used_percent === null ? "-" : `${Math.round(b.budget_used_percent)}%`}
                </span>
              </div>
              <UsageBar percent={b.budget_used_percent} className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {fmtWholeMoney(b.spend ?? 0, currency)} of {fmtWholeMoney(b.allocated_budget, currency)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
