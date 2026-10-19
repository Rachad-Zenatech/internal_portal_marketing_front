import type { EventFunnelCounts } from "@/types/eventPerformance";
import { fmtCount } from "../PaidAds/adsDisplay";

const STEPS: { key: keyof EventFunnelCounts; label: string }[] = [
  { key: "attendees", label: "Attendees" },
  { key: "leads", label: "Leads" },
  { key: "qualified_leads", label: "Qualified Leads" },
  { key: "demos", label: "Demos" },
  { key: "customers", label: "Customers" },
];

const fmtPct = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: n >= 10 ? 0 : 1 })}%`;

/** True when no step of the funnel has a number yet */
export function funnelIsEmpty(funnel: EventFunnelCounts | undefined) {
  return !funnel || STEPS.every((s) => !funnel[s.key]);
}

/**
 * Attendees, leads, qualified leads, demos and customers as horizontal bars, each with its share of the attendees.
 * Needs CHART_VARS on a wrapper (ChartCard has it).
 */
export default function EventFunnel({ funnel }: { funnel: EventFunnelCounts }) {
  const attendees = funnel.attendees;
  const max = Math.max(1, ...STEPS.map((s) => funnel[s.key] ?? 0));

  return (
    <ol className="flex flex-col gap-3" aria-label="Event funnel">
      {STEPS.map((s, i) => {
        const count = funnel[s.key];
        const width = count ? Math.max((count / max) * 100, 1.5) : 0;
        const share = i > 0 && count !== null && attendees ? fmtPct((count / attendees) * 100) : null;
        return (
          <li key={s.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium text-foreground">{s.label}</span>
              <span className="shrink-0 text-sm tabular-nums">
                <span className="font-semibold text-foreground">{fmtCount(count)}</span>
                {share && <span className="ml-2 text-xs text-muted-foreground">{share}</span>}
              </span>
            </div>
            <span className="block h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className="block h-full rounded-full bg-(--series-1)" style={{ width: `${width}%`, opacity: 1 - i * 0.13 }} />
            </span>
          </li>
        );
      })}
      {attendees ? <li className="text-xs text-muted-foreground">% of attendees</li> : null}
    </ol>
  );
}
