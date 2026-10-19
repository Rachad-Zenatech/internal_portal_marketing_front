import InfoTip from "./InfoTip";
import { CHART_VARS, DASH_CARD } from "./tones";

interface ChartCardProps {
  title: string;
  /** A small line under the title */
  subtitle?: React.ReactNode;
  info?: string;
  /** Top right: a legend or a small control */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** A white card around a chart, with its title and legend at the top */
export default function ChartCard({ title, subtitle, info, action, children, className = "" }: ChartCardProps) {
  return (
    <section className={`${DASH_CARD} ${CHART_VARS} flex min-w-0 flex-col gap-4 p-4 sm:p-5 ${className}`} aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            {title}
            {info && <InfoTip text={info} label={title} />}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

/** A legend entry: coloured swatch and name */
export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

/** "Nothing to show yet" inside a chart card */
export function ChartEmpty({ text, height = 260 }: { text: string; height?: number }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground" style={{ height }}>
      {text}
    </div>
  );
}
