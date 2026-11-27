import type { ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GoogleMarketingReport, GoogleReportSection } from "@/types/googleReporting";

const CARD = "min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm";
const number = (value: number | undefined) => value === undefined ? "Unavailable" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

function ReportFrame({ title, section, children }: { title: string; section: GoogleReportSection; children: ReactNode }) {
  const usable = section.status === "ok";
  const error = section.status === "error";
  const empty = section.status === "empty";
  const state = empty ? "No matching data for this period." : "Report unavailable.";
  return (
    <article className={CARD}>
      <h3 className="mb-3 font-semibold">{title}</h3>
      {!usable && <p className="text-sm text-muted-foreground" role={error ? "alert" : undefined}>{state}</p>}
      {usable && children}
      {section.message && <p className="mt-3 text-xs text-muted-foreground">{section.message}</p>}
      {section.time_zone && <p className="mt-1 text-xs text-muted-foreground">Reporting time zone: {section.time_zone}</p>}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-xl font-semibold tabular-nums">{value}</dd></div>;
}

function TrafficChart({ rows }: { rows: GoogleReportSection["rows"] }) {
  return (
    <div className="mt-4 h-48" role="img" aria-label="Daily GA4 sessions over the selected period">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={35} />
          <YAxis width={40} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line type="monotone" dataKey="sessions" name="Sessions" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Ga4Card({ section }: { section: GoogleReportSection }) {
  return (
    <ReportFrame title="Website activity (GA4)" section={section}>
      <dl className="grid grid-cols-2 gap-4">
        <Metric label="Sessions" value={number(section.totals.sessions)} />
        <Metric label="Key events" value={number(section.totals.key_events)} />
      </dl>
      <TrafficChart rows={section.rows} />
    </ReportFrame>
  );
}

function SearchCard({ section }: { section: GoogleReportSection }) {
  const ctr = section.totals.ctr === undefined ? "Unavailable" : `${(section.totals.ctr * 100).toFixed(2)}%`;
  return (
    <ReportFrame title="Organic Google Search" section={section}>
      <dl className="grid grid-cols-2 gap-4">
        <Metric label="Clicks" value={number(section.totals.clicks)} />
        <Metric label="Impressions" value={number(section.totals.impressions)} />
        <Metric label="Click-through rate" value={ctr} />
        <Metric label="Average position" value={number(section.totals.position)} />
      </dl>
    </ReportFrame>
  );
}

function AdsCard({ section }: { section: GoogleReportSection }) {
  const spend = section.currency && section.totals.spend !== undefined
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: section.currency }).format(section.totals.spend)
    : number(section.totals.spend);
  return (
    <ReportFrame title="Google Ads" section={section}>
      <dl className="grid grid-cols-2 gap-4">
        <Metric label="Spend" value={spend} />
        <Metric label="Clicks" value={number(section.totals.clicks)} />
        <Metric label="Impressions" value={number(section.totals.impressions)} />
        <Metric label="Conversions" value={number(section.totals.conversions)} />
      </dl>
    </ReportFrame>
  );
}

function QueryRow({ row }: { row: GoogleReportSection["rows"][number] }) {
  const ctr = `${(Number(row.ctr) * 100).toFixed(2)}%`;
  return <tr className="border-t"><td className="p-2">{row.query}</td><td className="p-2 text-right">{row.clicks}</td><td className="p-2 text-right">{row.impressions}</td><td className="p-2 text-right">{ctr}</td><td className="p-2 text-right">{Number(row.position).toFixed(2)}</td></tr>;
}

function SearchQueries({ section }: { section: GoogleReportSection }) {
  if (section.status !== "ok" || !section.rows.length) return null;
  const rows = section.rows.map(row => <QueryRow key={String(row.query)} row={row} />);
  return (
    <article className={CARD}>
      <h3 className="mb-2 font-semibold">Top search queries</h3>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-sm"><caption className="sr-only">Up to 20 queries; these rows are not complete site totals.</caption>
          <thead><tr><th className="p-2 text-left" scope="col">Query</th><th className="p-2 text-right" scope="col">Clicks</th><th className="p-2 text-right" scope="col">Impressions</th><th className="p-2 text-right" scope="col">CTR</th><th className="p-2 text-right" scope="col">Position</th></tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </article>
  );
}

export function GoogleReportCards({ report }: { report: GoogleMarketingReport }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{report.brand.name}: {report.date_from} to {report.date_to}. Fetched {new Date(report.fetched_at).toLocaleString()}.</p>
      <div className="grid gap-4 xl:grid-cols-3"><AdsCard section={report.ads} /><Ga4Card section={report.ga4} /><SearchCard section={report.search_console} /></div>
      <SearchQueries section={report.search_console} />
    </div>
  );
}
