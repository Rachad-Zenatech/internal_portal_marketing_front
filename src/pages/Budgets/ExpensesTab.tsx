import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import { downloadCsv } from "@/components/dashboard/csv";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetExpenses } from "@/hooks/useBudgets";
import type { SpendStatus } from "@/types/spend";
import { formatMoney } from "../Initiatives/format";
import { SPEND_STATUS_LABELS, SPEND_STATUS_STYLES } from "../Initiatives/spendRules";
import BudgetWeekView, { parseWeekKey, weekForMonth, WeekSwitcher } from "./BudgetWeekView";
import { periodApiDates, periodName, type Period } from "./budgetPeriods";
import { COUNTS_AGAINST_LABELS, countsAgainst, sourceLabel, type CountsAgainst } from "./expenseDisplay";

const ANY = "ANY";
const PAGE_SIZE = 25;

/** Every cost in the period: where it came from, its stage, and what it counts against. Or a calendar week of them. */
export default function ExpensesTab({ period, onOpenBudget }: { period: Period; onOpenBudget: (id: string) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const dates = periodApiDates(period);
  const { data, isLoading, error, refetch, isPlaceholderData } = useBudgetExpenses(dates.from, dates.to);
  const [page, setPage] = useState(0);
  const layout = searchParams.get("layout") === "week" ? "week" : "list";
  const weekKey = parseWeekKey(searchParams.get("week") ?? weekForMonth(period.first));
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setPage(0);
  };
  const query = (searchParams.get("eq") ?? "").trim().toLowerCase();
  const source = searchParams.get("source") ?? "";
  const stage = searchParams.get("stage") ?? "";
  const against = searchParams.get("against") ?? "";

  const lines = useMemo(() => data?.lines ?? [], [data]);
  const shown = useMemo(
    () =>
      lines.filter(
        (l) =>
          (!source || l.source === source) &&
          (!stage || l.status === stage) &&
          (!against || countsAgainst(l) === against) &&
          (!query ||
            [l.description ?? "", l.vendor ?? "", l.initiative_name, l.brand_name, l.market_name, l.channel_name, l.category_name ?? "", l.invoice_ref ?? ""].some((s) =>
              s.toLowerCase().includes(query),
            )),
      ),
    [lines, source, stage, against, query],
  );
  const sources = [...new Set(lines.map((l) => l.source))].sort();
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const exportCsv = () =>
    downloadCsv(
      `expenses-${period.key}.csv`,
      ["Date", "Item", "Vendor", "Initiative", "Brand", "Region", "Channel", "Category", "Source", "Stage", "Amount", "Currency", "Invoice / receipt #", "Counts against", "Reconciled"],
      shown.map((l) => [
        l.incurred_on,
        l.description,
        l.vendor,
        l.initiative_name,
        l.brand_name,
        l.market_name,
        l.channel_name,
        l.category_name,
        sourceLabel(l.source),
        SPEND_STATUS_LABELS[l.status as SpendStatus] ?? l.status,
        l.amount,
        l.currency,
        l.invoice_ref,
        l.budget_label ?? COUNTS_AGAINST_LABELS[countsAgainst(l)],
        l.reconciled_month ? l.reconciled_month.slice(0, 7) : "",
      ]),
    );

  const layoutToggle = (
    <div className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5 text-sm" role="group" aria-label="Layout">
      {(["list", "week"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={layout === v}
          onClick={() => setParam("layout", v === "list" ? null : v)}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${layout === v ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          {v === "list" ? "List" : "Week calendar"}
        </button>
      ))}
    </div>
  );

  if (layout === "week") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {layoutToggle}
          <WeekSwitcher weekKey={weekKey} onChange={(k) => setParam("week", k)} />
        </div>
        <BudgetWeekView weekKey={weekKey} onOpenBudget={onOpenBudget} />
      </div>
    );
  }

  const cell = "px-3 py-2.5 align-middle";
  return (
    <div className="flex flex-col gap-4">
      <FilterBar onClear={source || stage || against || query ? () => ["source", "stage", "against", "eq"].forEach((k) => setParam(k, null)) : undefined}>
        <div className="relative min-w-0 sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchParams.get("eq") ?? ""} onChange={(e) => setParam("eq", e.target.value || null)} placeholder="Search items, vendors, initiatives" aria-label="Search costs" className="h-9 pl-8" />
        </div>
        <FilterSelect label="Source" value={source || ANY} onChange={(v) => setParam("source", v === ANY ? null : v)} options={[{ value: ANY, label: "All sources" }, ...sources.map((s) => ({ value: s, label: sourceLabel(s) }))]} />
        <FilterSelect
          label="Stage"
          value={stage || ANY}
          onChange={(v) => setParam("stage", v === ANY ? null : v)}
          options={[{ value: ANY, label: "All stages" }, ...(Object.keys(SPEND_STATUS_LABELS) as SpendStatus[]).map((s) => ({ value: s, label: SPEND_STATUS_LABELS[s] }))]}
        />
        <FilterSelect
          label="Counts against"
          value={against || ANY}
          onChange={(v) => setParam("against", v === ANY ? null : v)}
          options={[{ value: ANY, label: "Anything" }, ...(Object.keys(COUNTS_AGAINST_LABELS) as CountsAgainst[]).map((c) => ({ value: c, label: COUNTS_AGAINST_LABELS[c] }))]}
        />
      </FilterBar>

      <section className={`${DASH_CARD} min-w-0 overflow-hidden`} aria-labelledby="expenses-title">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="expenses-title" className="text-base font-semibold text-foreground">
              Expenses, {periodName(period)} <span className="text-sm font-normal text-muted-foreground">({shown.length})</span>
            </h2>
            <p className="text-sm text-muted-foreground">Every cost on every initiative, each from one source so nothing is counted twice.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {layoutToggle}
            <Button variant="outline" className="h-9 gap-2" onClick={exportCsv} disabled={shown.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="m-4 h-60" />
        ) : error ? (
          <div className="flex items-center gap-3 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">Could not load the costs.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{lines.length ? "No costs match these filters." : `No costs dated in ${periodName(period)}.`}</p>
        ) : (
          <div className={isPlaceholderData ? "opacity-60" : ""}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    {["Date", "Item", "Initiative", "Brand · Region", "Channel", "Source", "Stage"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium">
                        {h}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-3 py-2.5 text-left font-medium">Counts against</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageRows.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className={`${cell} whitespace-nowrap text-muted-foreground`}>
                        {new Date(`${l.incurred_on}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className={`${cell} max-w-64`}>
                        <span className="block truncate text-foreground" title={l.description ?? undefined}>
                          {l.description ?? l.category_name ?? "-"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{[l.category_name, l.vendor].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className={`${cell} max-w-56`}>
                        <Link to={`/initiatives/${l.initiative_id}/costs`} className="block truncate text-primary underline-offset-2 hover:underline">
                          {l.initiative_name}
                        </Link>
                      </td>
                      <td className={`${cell} whitespace-nowrap text-muted-foreground`}>
                        {l.brand_name} · {l.market_name}
                      </td>
                      <td className={`${cell} whitespace-nowrap text-muted-foreground`}>{l.channel_name}</td>
                      <td className={`${cell} whitespace-nowrap text-muted-foreground`}>{sourceLabel(l.source)}</td>
                      <td className={cell}>
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${SPEND_STATUS_STYLES[l.status as SpendStatus] ?? ""}`}>
                          {SPEND_STATUS_LABELS[l.status as SpendStatus] ?? l.status}
                        </span>
                      </td>
                      <td className={`${cell} text-right font-medium tabular-nums text-foreground`}>{formatMoney(l.amount, l.currency)}</td>
                      <td className={`${cell} max-w-60 text-xs`}>
                        {l.budget_id ? (
                          <button type="button" onClick={() => onOpenBudget(l.budget_id as string)} className="block truncate text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                            {l.budget_label?.split(" · ").slice(1).join(" · ")}
                          </button>
                        ) : (
                          <span className={l.outside_budget ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"}>{COUNTS_AGAINST_LABELS[countsAgainst(l)]}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                Showing {current * PAGE_SIZE + 1}-{Math.min((current + 1) * PAGE_SIZE, shown.length)} of {shown.length}
                {data?.truncated ? " (only the latest costs: choose a shorter period to see them all)" : ""}
              </span>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
                    <ChevronLeft />
                  </Button>
                  <span className="px-2 tabular-nums">
                    {current + 1} / {pages}
                  </span>
                  <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
