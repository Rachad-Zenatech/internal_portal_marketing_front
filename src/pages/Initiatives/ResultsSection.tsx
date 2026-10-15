import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOutcomes, useSaveOutcomes } from "@/hooks/usePerformance";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeListItem } from "@/types/initiatives";
import type { OutcomeInput, OutcomeList, Performance } from "@/types/performance";
import type { OutcomeMetric } from "@/types/referenceData";
import { Section } from "./detailParts";
import { MUTED } from "./detailStyles";
import { formatMoney, isoToday } from "./format";
import { EVENT_METRIC_LABELS, formatCount, formatMonthLong, monthStart } from "./performanceRules";

const SOURCE_LABELS: Record<string, string> = { HUBSPOT: "HubSpot", GOOGLE_ADS: "Google Ads", MICROSOFT_ADS: "Microsoft Ads", UPLOAD: "Upload" };

/** Every month from start to end (inclusive), as "YYYY-MM-01" */
function monthsBetween(start: string, end: string) {
  const months: string[] = [];
  const cursor = new Date(`${monthStart(start)}T00:00:00`);
  const last = new Date(`${monthStart(end)}T00:00:00`);
  while (cursor <= last && months.length < 36) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-01`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

interface MonthFormProps {
  initiative: InitiativeListItem;
  month: string;
  metrics: OutcomeMetric[];
  outcomes: OutcomeList;
  canEdit: boolean;
}

/** The results for one month; remounted per month so the fields start from the saved values */
function MonthForm({ initiative, month, metrics, outcomes, canEdit }: MonthFormProps) {
  const save = useSaveOutcomes(initiative.id);
  const isEvent = Boolean(initiative.event_code);
  const forMonth = outcomes.values.filter((v) => v.period_start === month);
  const manual = Object.fromEntries(forMonth.filter((v) => v.source === "MANUAL").map((v) => [v.metric_code, v.value]));
  const other = Object.fromEntries(forMonth.filter((v) => v.source !== "MANUAL").map((v) => [v.metric_code, v]));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(metrics.map((m) => [m.code, manual[m.code] === undefined ? "" : String(manual[m.code])])),
  );
  const [error, setError] = useState<string | null>(null);

  const changes: OutcomeInput[] = metrics
    .filter((m) => !(m.code === "DEMOS" && outcomes.demos_from_log))
    .flatMap((m): OutcomeInput[] => {
      // Metrics can arrive after the form mounted, so a box may not be seeded yet
      const typed = (values[m.code] ?? "").trim();
      const before = manual[m.code];
      if (typed === "") return before === undefined ? [] : [{ metric_code: m.code, value: null }];
      const value = Number(typed);
      return value === before ? [] : [{ metric_code: m.code, value }];
    });

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (changes.some((c) => c.value !== null && (Number.isNaN(c.value) || c.value < 0))) {
      setError("Results must be numbers of 0 or more.");
      return;
    }
    setError(null);
    save.mutate(
      { periodStart: month, values: changes },
      { onSuccess: () => toast.success(`Results saved for ${formatMonthLong(month)}`), onError: (err) => setError(err.message || "Could not save the results.") },
    );
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => {
          const id = `result-${m.code.toLowerCase()}`;
          const label = isEvent ? (EVENT_METRIC_LABELS[m.code] ?? m.name) : m.name;
          const fromLog = m.code === "DEMOS" && outcomes.demos_from_log;
          const synced = other[m.code];
          return (
            <div key={m.code} className="flex flex-col gap-1.5">
              <Label htmlFor={id} className="text-slate-700 dark:text-zinc-300">
                {label}
                {m.unit === "MONEY" && <span className={`ml-1 font-normal ${MUTED}`}>({initiative.currency})</span>}
              </Label>
              {fromLog ? (
                <div className="flex h-9 items-center rounded-md border border-dashed border-slate-200 px-3 text-sm dark:border-zinc-700">
                  <span className="font-medium tabular-nums">{synced ? formatCount(synced.value) : 0}</span>
                  <Link to={`/initiatives/${initiative.id}/demos`} className={`ml-1.5 truncate text-xs underline-offset-2 hover:underline ${MUTED}`}>
                    from the demo log
                  </Link>
                </div>
              ) : (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step={m.unit === "MONEY" ? "any" : 1}
                  inputMode="decimal"
                  value={values[m.code] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [m.code]: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="—"
                />
              )}
              {synced && !fromLog && (
                <p className={`text-xs ${MUTED}`}>
                  {SOURCE_LABELS[synced.source] ?? synced.source}: {m.unit === "MONEY" ? formatMoney(synced.value, synced.currency ?? initiative.currency) : formatCount(synced.value)} (counts instead)
                </p>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {canEdit && (
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs ${MUTED}`}>Leave a box empty to remove a result. Revenue means closed revenue.</p>
          <Button type="submit" size="sm" disabled={changes.length === 0 || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save {formatMonthLong(month)}
          </Button>
        </div>
      )}
    </form>
  );
}

export default function ResultsSection({ initiative, performance }: { initiative: InitiativeListItem; performance: Performance }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const { data: reference } = useReferenceData();
  const { data: outcomes, isLoading, error, refetch } = useOutcomes(initiative.id);
  const channelCode = reference?.channels.find((c) => c.id === initiative.channel_id)?.code ?? "";

  // Only the results that make sense for the channel (the API refuses the rest); "Other" can record any
  const metrics = useMemo(() => {
    const all = reference?.outcome_metrics ?? [];
    const codes = reference?.result_metrics_by_channel?.[channelCode];
    if (!codes) return all;
    const byCode = new Map(all.map((m) => [m.code, m]));
    return codes.map((c) => byCode.get(c)).filter((m): m is OutcomeMetric => Boolean(m));
  }, [reference, channelCode]);

  // Months to offer: the initiative's own months, any month with results, and this month
  const months = useMemo(() => {
    const own = initiative.start_date ? monthsBetween(initiative.start_date, initiative.end_date ?? initiative.start_date) : [];
    return Array.from(new Set([...own, ...(outcomes?.periods ?? []), monthStart(isoToday())])).sort();
  }, [initiative.start_date, initiative.end_date, outcomes?.periods]);
  const firstMonth = initiative.start_date ? monthStart(initiative.start_date) : monthStart(isoToday());
  const [month, setMonth] = useState(firstMonth);
  const withData = new Set(outcomes?.periods ?? []);

  return (
    <Section title="Results" icon={Users}>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : error || !outcomes ? (
        <div className="flex items-center gap-3">
          <p className={`text-sm ${MUTED}`}>Could not load the results.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Month">
            {months.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonth(m)}
                aria-pressed={m === month}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  m === month
                    ? "border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {formatMonthLong(m)}
                {withData.has(m) && m !== month && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />}
              </button>
            ))}
            <Input
              type="month"
              aria-label="Another month"
              className="h-7 w-40 text-xs"
              onChange={(e) => e.target.value && setMonth(`${e.target.value}-01`)}
            />
          </div>

          <MonthForm
            key={`${month}-${metrics.map((m) => m.code).join(",")}-${outcomes.values.length}-${outcomes.values.map((v) => v.value).join(",")}`}
            initiative={initiative}
            month={month}
            metrics={metrics}
            outcomes={outcomes}
            canEdit={canEdit}
          />

          {performance.has_results && (
            <div className="overflow-x-auto rounded-lg bg-slate-50 px-4 py-3 dark:bg-zinc-800/60">
              <div className={`mb-1 text-xs font-medium ${MUTED}`}>All months</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {metrics
                  .filter((m) => performance.totals[m.code] !== undefined)
                  .map((m) => (
                    <span key={m.code} className="whitespace-nowrap text-slate-700 dark:text-zinc-300">
                      {initiative.event_code ? (EVENT_METRIC_LABELS[m.code] ?? m.name) : m.name}{" "}
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                        {m.unit === "MONEY" ? formatMoney(performance.totals[m.code], performance.currency) : formatCount(performance.totals[m.code])}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
