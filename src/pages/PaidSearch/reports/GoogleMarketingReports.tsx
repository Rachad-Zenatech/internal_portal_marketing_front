import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGoogleReporting } from "@/hooks/useGoogleReporting";
import { GoogleReportCards } from "./GoogleReportCards";

type ReportingState = ReturnType<typeof useGoogleReporting>;

function ReportControls({ state }: { state: ReportingState }) {
  const { draft, setDraft, brands, valid, load, report } = state;
  const options = brands.data?.map(brand => <option key={brand.code} value={brand.code}>{brand.name}</option>);
  const loading = report.isFetching;
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); load(); }}>
      <label className="grid gap-1 text-sm">Brand<select className="h-9 rounded-md border border-input bg-background px-3" value={draft.brand} onChange={event => setDraft({ ...draft, brand: event.target.value })} disabled={!brands.data} aria-label="Google reporting brand">{options}</select></label>
      <label className="grid gap-1 text-sm">From<Input type="date" value={draft.date_from} onChange={event => setDraft({ ...draft, date_from: event.target.value })} required /></label>
      <label className="grid gap-1 text-sm">To<Input type="date" value={draft.date_to} onChange={event => setDraft({ ...draft, date_to: event.target.value })} required /></label>
      <Button type="submit" disabled={!valid || loading || !brands.data}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />Load reports</Button>
      {!valid && <p className="text-sm text-destructive">Choose a past date range of at most 366 days.</p>}
    </form>
  );
}

function ReportResults({ state }: { state: ReportingState }) {
  const { brands, report } = state;
  const error = brands.error || report.error;
  if (error) return <p role="alert" className="text-sm text-destructive">Could not load Google reports: {error.message}</p>;
  if (brands.isPending || report.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading Google reports...</p>;
  if (!report.data) return <p className="text-sm text-muted-foreground">Choose a brand and load its reports.</p>;
  return <GoogleReportCards report={report.data} />;
}

export default function GoogleMarketingReports() {
  const state = useGoogleReporting();
  return (
    <section aria-label="Google performance and search context" className="space-y-4 rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
      <div><h2 className="text-lg font-semibold">Google performance and search context</h2><p className="text-sm text-muted-foreground">Google Ads shows paid campaign results. GA4 shows overall website activity; Search Console shows organic search, not paid clicks. Results may be cached for up to five minutes.</p></div>
      <ReportControls state={state} />
      <ReportResults state={state} />
      <p className="text-xs text-muted-foreground">Pakistan and the Philippines are excluded from GA4 and Search Console. Google Ads cost has no country exclusions.</p>
    </section>
  );
}
