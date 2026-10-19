import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { DASH_CARD, TONE_TILE, type Tone } from "./tones";

export interface InsightStat {
  label: string;
  value: React.ReactNode;
}

interface InsightCardProps {
  icon: React.ElementType;
  tone: Tone;
  /** Small label, e.g. "Best platform" */
  label: string;
  /** The bold name, e.g. "Google Ads"; leave out when there isn't enough data */
  title?: React.ReactNode;
  /** Up to 3 small figures */
  stats?: InsightStat[];
  /** Amber border and tint, for something that needs a look */
  warning?: boolean;
  /** Shown instead of the title and figures */
  emptyText?: string;
  /** Makes the card a link (to) or a button (onClick), with a chevron */
  to?: string;
  onClick?: () => void;
}

/** One finding worth knowing: icon, label, a name and 3 small figures */
export default function InsightCard({ icon: Icon, tone, label, title, stats = [], warning, emptyText = "Not enough data yet", to, onClick }: InsightCardProps) {
  const empty = title === undefined || title === null;
  const clickable = !empty && (to || onClick);
  const body = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_TILE[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {empty ? (
          <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            <p className="mt-0.5 truncate text-base font-semibold text-foreground">{title}</p>
            {stats.length > 0 && (
              <dl className="mt-2 grid grid-cols-3 gap-2">
                {stats.map((s) => (
                  <div key={s.label} className="min-w-0">
                    <dt className="truncate text-[11px] text-muted-foreground">{s.label}</dt>
                    <dd className="truncate text-sm font-medium tabular-nums text-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        )}
      </div>
      {clickable && <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const cls = `${DASH_CARD} flex w-full min-w-0 items-start gap-3 p-4 text-left sm:p-5 ${
    warning && !empty ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20" : ""
  } ${clickable ? "transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`;
  if (clickable && to) {
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  }
  if (clickable && onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}
