import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Copy, Loader2, Plus, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgetMonth, useBudgetPeriod, useCopyBudgets } from "@/hooks/useBudgets";
import { useAuth } from "@/lib/AuthContext";
import ApprovedBudgetsTab from "./ApprovedBudgetsTab";
import BudgetDetailSheet from "./BudgetDetailSheet";
import BudgetFormDialog, { type BudgetPreset } from "./BudgetFormDialog";
import BudgetsUpload from "./BudgetsUpload";
import BudgetTrackerTab from "./BudgetTrackerTab";
import EventsBudgetSection from "./EventsBudgetSection";
import ExpensesTab from "./ExpensesTab";
import ReconciliationTab from "./ReconciliationTab";
import { addMonths, monthName, monthOnly, thisMonthKey, toApiMonth } from "./budgetDisplay";
import {
  COMPARE_OPTIONS,
  comparePeriod,
  parseCompare,
  parsePeriod,
  PERIOD_KINDS,
  periodApiMonths,
  periodDates,
  periodName,
  periodOf,
  shiftPeriod,
  type Compare,
  type Period,
  type PeriodKind,
} from "./budgetPeriods";

const TABS = [
  { value: "tracker", label: "Budget Tracker" },
  { value: "approved", label: "Approved Budgets" },
  { value: "expenses", label: "Expenses" },
  { value: "reconciliation", label: "Reconciliation" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const contains = (p: Period, monthKey: string) => p.first <= monthKey && monthKey <= p.last;

function PeriodSwitcher({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const today = thisMonthKey();
  // Switching kind keeps this month when it's in the period, otherwise the period's first month
  const anchor = contains(period, today) ? today : period.first;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period.kind} onValueChange={(v) => onChange(periodOf(v as PeriodKind, anchor))}>
        <SelectTrigger className="h-9 w-28 bg-card" aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {PERIOD_KINDS.map((k) => (
            <SelectItem key={k.value} value={k.value}>
              {k.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-xs" role="group" aria-label="Choose period">
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftPeriod(period, -1))} aria-label={`Previous, ${periodName(shiftPeriod(period, -1))}`}>
          <ChevronLeft />
        </Button>
        <span className="min-w-24 px-2 text-center text-sm font-medium text-foreground" aria-live="polite" title={periodDates(period)}>
          {periodName(period)}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftPeriod(period, 1))} aria-label={`Next, ${periodName(shiftPeriod(period, 1))}`}>
          <ChevronRight />
        </Button>
      </div>
      {!contains(period, today) && (
        <Button variant="outline" size="sm" className="h-9 bg-card" onClick={() => onChange(periodOf(period.kind, today))}>
          Today
        </Button>
      )}
    </div>
  );
}

function CompareSelect({ value, onChange }: { value: Compare; onChange: (c: Compare) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Compare to</span>
      <Select value={value} onValueChange={(v) => onChange(v as Compare)}>
        <SelectTrigger className="h-9 w-48 bg-card" aria-label="Compare to">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {COMPARE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export default function BudgetsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const period = parsePeriod(searchParams.get("p"));
  const compareMode = parseCompare(searchParams.get("compare"));
  const compare = comparePeriod(period, compareMode);
  const tabParam = searchParams.get("tab");
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : "tracker";
  const openBudgetId = searchParams.get("budget");

  const range = periodApiMonths(period);
  const periodQuery = useBudgetPeriod(range.from, range.to);
  const compareRange = compare ? periodApiMonths(compare) : null;
  const compareQuery = useBudgetPeriod(compareRange?.from ?? null, compareRange?.to ?? null, Boolean(compare) && tab === "tracker");
  const data = periodQuery.data;

  // New budgets default to this month when it's in the period, otherwise the period's last month
  const today = thisMonthKey();
  const formMonth = contains(period, today) ? today : period.last;
  const monthOnlyPeriod = period.kind === "month";
  const month = useBudgetMonth(toApiMonth(period.first));
  const copy = useCopyBudgets();
  const [form, setForm] = useState<{ open: boolean; preset?: BudgetPreset }>({ open: false });
  const [uploadOpen, setUploadOpen] = useState(false);

  const update = (changes: Record<string, string | null>, push = false) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setSearchParams(next, { replace: !push });
  };
  // The week calendar follows the period, so it's dropped when the period changes
  const setPeriod = (p: Period) => update({ p: p.key, week: null }, true);

  // Opening a budget adds a history step, so the browser's back button closes it
  const openBudget = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("budget", id);
    setSearchParams(next, { state: { budgetOpened: true }, replace: Boolean(openBudgetId) });
  };
  const closeBudget = () => {
    if ((location.state as { budgetOpened?: boolean } | null)?.budgetOpened) {
      navigate(-1);
      return;
    }
    update({ budget: null });
  };

  const previousKey = addMonths(period.first, -1);
  const empty = !periodQuery.isLoading && !periodQuery.error && (data?.budgets.length ?? 0) === 0;
  const canCopy = canEdit && monthOnlyPeriod && empty && Boolean(month.data?.previous_month_has_budgets);
  const copyLastMonth = () =>
    copy.mutate(
      { fromMonth: toApiMonth(previousKey), toMonth: toApiMonth(period.first) },
      {
        onSuccess: (result) =>
          toast.success(
            result.created === 0
              ? `Nothing to copy. ${monthName(period.first)} already has these budgets.`
              : `Copied ${result.created} ${result.created === 1 ? "budget" : "budgets"} from ${monthOnly(previousKey)}`,
            { description: result.created ? "They start as Not committed. Check the amounts and approve each one." : undefined },
          ),
        onError: (err) => toast.error(err.message || "Could not copy last month's budgets."),
      },
    );

  const copyButton = (
    <Button variant="outline" onClick={copyLastMonth} disabled={copy.isPending} className="h-9 gap-2 bg-card">
      {copy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      Copy last month's budgets
    </Button>
  );
  const uploadButton = (
    <Button variant="outline" onClick={() => setUploadOpen(true)} className="h-9 gap-2 bg-card">
      <Upload className="h-4 w-4" />
      Upload spreadsheet
    </Button>
  );
  const addButton = (
    <Button onClick={() => setForm({ open: true })} className="h-9 gap-2">
      <Plus className="h-4 w-4" />
      Add budget
    </Button>
  );

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6">
      <DashboardHeader
        title="Budgets & Expenses"
        subtitle={`${periodDates(period)}. What was approved, what's been spent and committed, and what's left.`}
        actions={
          <>
            <PeriodSwitcher period={period} onChange={setPeriod} />
            <CompareSelect value={compareMode} onChange={(c) => update({ compare: c === "prior_year" ? null : c })} />
            {canCopy && copyButton}
            {canEdit && uploadButton}
            {canEdit && addButton}
          </>
        }
      />

      <div className="-mt-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Budgets & Expenses">
        <div className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => update({ tab: t.value === "tracker" ? null : t.value })}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tab === t.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {periodQuery.error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-300">Could not load the budgets for {periodName(period)}.</p>
          <Button variant="outline" size="sm" onClick={() => periodQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {empty && (tab === "tracker" || tab === "approved") && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No budgets for {periodName(period)} yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {canCopy
                  ? `Copy ${monthOnly(previousKey)}'s budgets and adjust the amounts, or add each budget yourself. Copied budgets start as Not committed until you approve them.`
                  : "Add a budget for each brand and region with money approved, or upload your Budget Tracker spreadsheet to bring several months in at once."}
              </p>
              {canEdit ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  {canCopy && copyButton}
                  {uploadButton}
                  {addButton}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Ask someone who can edit initiatives to add them.</p>
              )}
            </div>
          )}

          {tab === "tracker" && (
            <>
              <BudgetTrackerTab
                period={period}
                compare={compare}
                data={data}
                compareData={compare ? compareQuery.data : undefined}
                loading={periodQuery.isLoading}
                canEdit={canEdit}
                onOpenBudget={openBudget}
                onAddFor={(u) =>
                  setForm({
                    open: true,
                    preset: { brand_id: u.brand_id, market_id: u.market_id, channel_id: u.channel_id, currency: u.currency, expected: u.expected },
                  })
                }
              />
              {monthOnlyPeriod && (
                <section className="flex min-w-0 flex-col gap-3" aria-labelledby="budget-events-title">
                  <div>
                    <h2 id="budget-events-title" className="text-lg font-semibold text-foreground">
                      Events in {monthName(period.first)}
                    </h2>
                    <p className="text-sm text-muted-foreground">Each event's budget, expected costs, what's been spent and travel. Open an event to manage its costs.</p>
                  </div>
                  <EventsBudgetSection monthKey={period.first} monthName={monthName(period.first)} brandName={null} />
                </section>
              )}
            </>
          )}
          {tab === "approved" && <ApprovedBudgetsTab period={period} data={data} loading={periodQuery.isLoading} onOpenBudget={openBudget} actions={null} />}
          {tab === "expenses" && <ExpensesTab period={period} onOpenBudget={openBudget} />}
          {tab === "reconciliation" && <ReconciliationTab period={period} />}
        </>
      )}

      {canEdit && <BudgetsUpload key={period.first.slice(0, 4)} open={uploadOpen} onOpenChange={setUploadOpen} defaultYear={Number(period.first.slice(0, 4))} />}
      {canEdit && <BudgetFormDialog open={form.open} onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))} monthKey={formMonth} preset={form.preset} />}
      <BudgetDetailSheet budgetId={openBudgetId} onClose={closeBudget} onOpenBudget={openBudget} />
    </div>
  );
}
