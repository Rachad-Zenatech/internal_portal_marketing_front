import { ArrowDown, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import InfoTip from "./InfoTip";
import { DASH_CARD, TONE_TILE, type Tone } from "./tones";

export interface KpiChange {
  current: number | null | undefined;
  previous: number | null | undefined;
  /** "percent" (default) shows "12%"; "absolute" shows the difference, formatted by formatDiff */
  mode?: "percent" | "absolute";
  formatDiff?: (diff: number) => string;
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone: Tone;
  /** One sentence for the info tooltip */
  info?: string;
  /** Compared with the previous period; leave out to hide the change line */
  change?: KpiChange;
  /** Which way is good: the arrow is green that way and red the other */
  goodWhen?: "up" | "down";
  /** e.g. "vs. previous period" or "vs. last month" */
  changeLabel?: string;
  /** Extra classes for the value, e.g. red when negative */
  valueClassName?: string;
  /** A small line under the value when there's no change line */
  hint?: React.ReactNode;
  /** A small line right under the value, shown with the change line, e.g. "From HubSpot" */
  caption?: React.ReactNode;
  loading?: boolean;
  /** A small control at the top right, e.g. a currency switch */
  action?: React.ReactNode;
}

function ChangeLine({ change, goodWhen, changeLabel }: { change: KpiChange; goodWhen: "up" | "down"; changeLabel: string }) {
  const { current, previous } = change;
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return <p className="truncate text-xs text-muted-foreground">No figure for {changeLabel.replace(/^vs\.\s*/, "")}</p>;
  }
  const diff = current - previous;
  if (diff === 0) return <p className="truncate text-xs text-muted-foreground">No change {changeLabel}</p>;
  const up = diff > 0;
  const good = up === (goodWhen === "up");
  let amount: string;
  if (change.mode === "absolute") {
    amount = change.formatDiff ? change.formatDiff(Math.abs(diff)) : Math.abs(diff).toLocaleString();
  } else {
    if (previous === 0) return <p className="truncate text-xs text-muted-foreground">None in {changeLabel.replace(/^vs\.\s*/, "")}</p>;
    const pct = Math.abs((diff / Math.abs(previous)) * 100);
    amount = `${pct >= 10 ? Math.round(pct) : pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  }
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <p className="flex min-w-0 items-center gap-1 text-xs">
      <span className={`inline-flex shrink-0 items-center gap-0.5 font-medium ${good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
        <Arrow className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">{up ? "Up" : "Down"}</span>
        {amount}
      </span>
      <span className="truncate text-muted-foreground">{changeLabel}</span>
    </p>
  );
}

/** A key figure: tinted icon tile, label, big value and how it changed */
export default function KpiCard({ label, value, icon: Icon, tone, info, change, goodWhen = "up", changeLabel = "vs. previous period", valueClassName, hint, caption, loading, action }: KpiCardProps) {
  return (
    <div className={`${DASH_CARD} flex min-w-0 flex-col gap-2 p-3 sm:gap-3 sm:p-5`}>
      {/* Phones: icon above the label, so two cards fit side by side */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${TONE_TILE[tone]}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <span className="flex min-w-0 items-start gap-1 text-xs font-medium text-muted-foreground sm:items-center sm:text-sm">
          <span className="line-clamp-2 sm:truncate">{label}</span>
          {info && <InfoTip text={info} label={label} />}
        </span>
        {action && <div className="sm:ml-auto">{action}</div>}
      </div>
      <div className="min-w-0">
        {loading ? (
          <Skeleton className="h-7 w-24 sm:h-8 sm:w-28" />
        ) : (
          <p className={`truncate text-lg font-semibold tracking-tight tabular-nums sm:text-2xl ${valueClassName ?? "text-foreground"}`}>{value}</p>
        )}
        {caption && !loading && <p className="mt-0.5 truncate text-xs text-muted-foreground">{caption}</p>}
        <div className="mt-1 min-h-4">
          {!loading && (change ? <ChangeLine change={change} goodWhen={goodWhen} changeLabel={changeLabel} /> : hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null)}
        </div>
      </div>
    </div>
  );
}

/** The row of KPI cards: 2 across on phones, 3 on tablets and laptops, 6 on wide screens */
export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 2xl:grid-cols-6">{children}</div>;
}
