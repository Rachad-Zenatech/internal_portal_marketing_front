import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Download, Layers, Loader2, Megaphone, MoreHorizontal, PlayCircle, Plus, Search, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { MAIN_CHANNEL_CODES, OTHER_CHANNELS } from "@/components/AppShell/Navigation";
import { downloadCsv } from "@/components/dashboard/csv";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import KpiCard from "@/components/dashboard/KpiCard";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInitiatives, useInitiativeSummary } from "@/hooks/useInitiatives";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import { getInitiatives } from "@/services/initiativesService";
import type { InitiativeFilters, InitiativeListItem, InitiativeStatus, MoneyAmount, OwnerOption } from "@/types/initiatives";
import { channelStyle } from "./channelStyles";
import { DeleteInitiativeDialog } from "./DeleteInitiativeButton";
import { formatBudget, formatDate, isoToday } from "./format";
import { ATTENTION_LABELS, formatKpiValue } from "./initiativeFields";
import InitiativeFormDialog from "./InitiativeFormDialog";
import InitiativePanel from "./InitiativePanel";
import InitiativesTable from "./InitiativesTable";
import OwnerPicker from "./OwnerPicker";
import { STATUS_LABELS } from "./status";

const PAGE_SIZE = 10;
const ALL = "all";
type ListTab = "all" | "active" | "review";

interface PageFilters {
  brandId: string;
  channelId: string;
  status: string;
  owner: OwnerOption | null;
  from: string;
  to: string;
}

const NO_FILTERS: PageFilters = { brandId: ALL, channelId: ALL, status: ALL, owner: null, from: "", to: "" };

const toDateText = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Quick ranges for the date filter, worked out when picked */
const DATE_PRESETS: { label: string; range: () => [string, string] }[] = [
  {
    label: "This month",
    range: () => {
      const t = new Date();
      return [toDateText(new Date(t.getFullYear(), t.getMonth(), 1)), toDateText(new Date(t.getFullYear(), t.getMonth() + 1, 0))];
    },
  },
  {
    label: "This quarter",
    range: () => {
      const t = new Date();
      const q = Math.floor(t.getMonth() / 3) * 3;
      return [toDateText(new Date(t.getFullYear(), q, 1)), toDateText(new Date(t.getFullYear(), q + 3, 0))];
    },
  },
  {
    label: "This year",
    range: () => {
      const y = new Date().getFullYear();
      return [`${y}-01-01`, `${y}-12-31`];
    },
  },
  {
    label: "Last 90 days",
    range: () => {
      const t = new Date();
      return [toDateText(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 89)), isoToday()];
    },
  },
];

function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const [open, setOpen] = useState(false);
  const label = from || to ? [formatDate(from || null) ?? "Any", formatDate(to || null) ?? "Any"].join(" to ") : "Any time";
  return (
    <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground md:text-sm">Date range</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2 bg-card font-normal md:w-56" aria-label={`Date range: ${label}`}>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-72 flex-col gap-3 p-3">
          <div className="flex flex-wrap gap-1.5">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => {
                  const [f, t] = preset.range();
                  onChange(f, t);
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <DatePicker value={from} max={to || undefined} onChange={(v) => onChange(v, to)} clearable aria-label="From" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <DatePicker value={to} min={from || undefined} onChange={(v) => onChange(from, v)} clearable aria-label="To" />
          </label>
          <p className="text-xs text-muted-foreground">Shows initiatives that run at any time in this range.</p>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => {
                onChange("", "");
                setOpen(false);
              }}
            >
              Clear dates
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function OwnerFilter({ value, onChange }: { value: OwnerOption | null; onChange: (owner: OwnerOption | null) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground md:text-sm">Owner</span>
      <div className="flex min-w-0 items-center gap-1">
        <OwnerPicker value={value} onChange={onChange} placeholder="All owners" className="bg-card md:w-44" />
        {value && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onChange(null)} aria-label="Show every owner">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Pages to offer: the first, the last, and two either side of the current one */
function pageNumbers(current: number, count: number): (number | "gap")[] {
  const pages = new Set([0, count - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < count));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const CSV_HEADER = [
  "Initiative",
  "Description",
  "Brand",
  "Channel",
  "Sub-channel",
  "Owner",
  "Start date",
  "End date",
  "Budget",
  "Currency",
  "Actual spend",
  "% of budget spent",
  "Primary KPI",
  "KPI target",
  "Status",
  "Needs review",
];

function csvRow(item: InitiativeListItem) {
  const actual = item.actual_spend ?? item.actual_amount;
  const percent = item.progress_percent ?? (item.budget_amount ? (actual / item.budget_amount) * 100 : null);
  return [
    item.name,
    item.description,
    item.brand_name,
    item.channel_name,
    item.sub_channel_name,
    item.owner_name,
    item.start_date,
    item.end_date,
    item.budget_amount,
    item.currency,
    actual,
    percent === null ? null : Math.round(percent),
    item.primary_kpi?.name,
    item.primary_kpi && item.kpi_target !== null && item.kpi_target !== undefined ? formatKpiValue(item.kpi_target, item.primary_kpi.unit, item.currency) : null,
    STATUS_LABELS[item.status],
    item.needs_attention ? (item.attention_reasons ?? []).map((r) => ATTENTION_LABELS[r] ?? r).join("; ") || "Yes" : "",
  ];
}

const amountIn = (amounts: MoneyAmount[] | undefined, currency: string) => amounts?.find((a) => a.currency === currency)?.amount ?? 0;

export default function Initiatives() {
  // The channel lives in the URL (?channel=PAID_SEARCH) so sidebar links and back/forward work
  const [searchParams] = useSearchParams();
  const channelCode = searchParams.get("channel");
  const [tab, setTab] = useState<ListTab>("all");
  const [filters, setFilters] = useState<PageFilters>(NO_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Map<string, InitiativeListItem>>(new Map());
  const [budgetCurrency, setBudgetCurrency] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InitiativeListItem | null>(null);
  const [deleting, setDeleting] = useState<InitiativeListItem | null>(null);
  const [panelItem, setPanelItem] = useState<InitiativeListItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("INITIATIVES_CREATE");
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const canDelete = hasPermission("INITIATIVES_DELETE");

  // Wait until typing pauses before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new channel page starts again with no channel filter, from page 1
  useEffect(() => {
    setFilters((prev) => ({ ...prev, channelId: ALL }));
    setPage(0);
    setSelected(new Map());
  }, [channelCode]);

  const { data: reference, isError: referenceFailed, refetch: refetchReference } = useReferenceData();
  const channel = channelCode ? reference?.channels.find((c) => c.code === channelCode) : undefined;
  // "Other channels" in the sidebar: every channel without its own link
  const isOtherChannels = channelCode === OTHER_CHANNELS;
  const otherChannels = useMemo(() => (reference?.channels ?? []).filter((c) => !MAIN_CHANNEL_CODES.includes(c.code)), [reference]);
  // A channel in the URL can't be resolved without the channel list, or may not exist at all
  const referenceMissing = Boolean(channelCode) && !reference && referenceFailed;
  const unknownChannel = Boolean(channelCode) && Boolean(reference) && !channel && !isOtherChannels;
  const channelReady = !channelCode || Boolean(channel) || (isOtherChannels && otherChannels.length > 0);

  // What the cards and the list share; the tab and paging only narrow the list
  const baseQuery: InitiativeFilters = {
    channel_id: channel?.id ?? (filters.channelId !== ALL ? Number(filters.channelId) : undefined),
    channel_ids: isOtherChannels && filters.channelId === ALL ? otherChannels.map((c) => c.id) : undefined,
    brand_id: filters.brandId !== ALL ? Number(filters.brandId) : undefined,
    status: tab === "active" ? "ACTIVE" : filters.status !== ALL ? (filters.status as InitiativeStatus) : undefined,
    owner_user_id: filters.owner?.id,
    from: filters.from || undefined,
    to: filters.to || undefined,
    search: search || undefined,
  };
  const summaryQuery: InitiativeFilters = { ...baseQuery, status: filters.status !== ALL ? (filters.status as InitiativeStatus) : undefined };
  const listQuery: InitiativeFilters = { ...baseQuery, needs_attention: tab === "review" ? true : undefined };
  const { data, isPending: isLoading, isError, isFetching } = useInitiatives({ ...listQuery, limit: PAGE_SIZE, offset: page * PAGE_SIZE }, channelReady);
  const { data: summary, isPending: summaryLoading, isError: summaryFailed } = useInitiativeSummary(summaryQuery, channelReady);

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRow = Math.min(total, (page + 1) * PAGE_SIZE);
  const channelCodes = useMemo(() => new Map(reference?.channels.map((c) => [c.id, c.code])), [reference]);

  const update = (patch: Partial<PageFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  };
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS) || searchInput !== "";
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setSearchInput("");
    setSearch("");
    setPage(0);
  };

  // One currency at a time on the budget card: the one picked, else the largest
  const budgets = summary?.allocated_budget ?? [];
  const shownCurrency =
    budgetCurrency && budgets.some((b) => b.currency === budgetCurrency) ? budgetCurrency : ([...budgets].sort((a, b) => b.amount - a.amount)[0]?.currency ?? "USD");
  const hasPeriod = Boolean(filters.from || filters.to);
  const previous = hasPeriod ? summary?.previous : null;
  const change = (current: number | undefined, prev: number | undefined) => (previous ? { current, previous: prev } : undefined);

  const toggle = (item: InitiativeListItem, checked: boolean) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(item.id, item);
      else next.delete(item.id);
      return next;
    });
  const togglePage = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Map(prev);
      for (const item of items) {
        if (checked) next.set(item.id, item);
        else next.delete(item.id);
      }
      return next;
    });

  const fileName = () => `initiatives-${channel?.code.toLowerCase() ?? (isOtherChannels ? "other-channels" : "all")}-${isoToday()}.csv`;
  const exportSelected = () => downloadCsv(fileName(), CSV_HEADER, [...selected.values()].map(csvRow));
  // Every initiative matching the filters, a page of 200 at a time
  const exportAll = async () => {
    setExporting(true);
    try {
      const rows: InitiativeListItem[] = [];
      for (let offset = 0; ; offset += 200) {
        const batch = await getInitiatives({ ...listQuery, limit: 200, offset });
        rows.push(...batch.items);
        if (batch.items.length === 0 || rows.length >= batch.total) break;
      }
      downloadCsv(fileName(), CSV_HEADER, rows.map(csvRow));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export the initiatives.");
    } finally {
      setExporting(false);
    }
  };

  const HeaderIcon = channel ? channelStyle(channel.code).icon : Megaphone;
  const channelOptions = isOtherChannels ? otherChannels : (reference?.channels ?? []);

  const placeholder = referenceMissing ? (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-red-600">
      Could not load the channels.
      <Button variant="outline" size="sm" onClick={() => refetchReference()}>
        Try again
      </Button>
    </div>
  ) : unknownChannel ? (
    <div className="py-10 text-center">
      <p className="font-medium text-foreground">Unknown channel "{channelCode}"</p>
      <p className="mt-1 text-sm text-muted-foreground">The link may be out of date. Pick a channel from the menu.</p>
    </div>
  ) : isLoading ? (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading initiatives...
    </div>
  ) : isError ? (
    <p className="py-10 text-center text-sm text-red-600">Could not load the initiatives. Refresh the page to try again.</p>
  ) : items.length === 0 ? (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Megaphone className="h-5 w-5" />
      </div>
      <p className="font-medium text-foreground">
        {tab === "review" && !hasFilters ? "Nothing needs review" : hasFilters || tab !== "all" ? "No initiatives match these filters" : "No initiatives yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {tab === "review" && !hasFilters ? "Budgets, tracking and results all look fine." : hasFilters ? "Try clearing a filter." : "Initiatives you track will appear here."}
      </p>
    </div>
  ) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <PageHeader
        icon={HeaderIcon}
        title={channel ? `${channel.name} Initiatives` : isOtherChannels ? "Other Channel Initiatives" : "All Marketing Initiatives"}
        description={
          channel
            ? `View and manage ${channel.name} initiatives across brands.`
            : isOtherChannels
              ? `View and manage initiatives in ${otherChannels.map((c) => c.name).join(", ") || "other channels"}.`
              : "View and manage all marketing activities across brands and channels."
        }
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions" disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void exportAll()} disabled={total === 0}>
                  <Download />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canCreate && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Initiative
              </Button>
            )}
          </>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as ListTab);
          setPage(0);
          // The Active tab is its own status filter
          if (v === "active") setFilters((prev) => ({ ...prev, status: ALL }));
        }}
      >
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-10">
            <TabsTrigger value="all">All Initiatives</TabsTrigger>
            <TabsTrigger value="active">Active Initiatives</TabsTrigger>
            <TabsTrigger value="review">
              Needs Review
              {!!summary?.needs_attention && (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">{summary.needs_attention}</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Initiatives"
          icon={Layers}
          tone="blue"
          value={summaryFailed ? "-" : (summary?.total ?? 0).toLocaleString()}
          hint="Across all marketing channels"
          info="Every initiative that matches the filters."
          change={change(summary?.total, previous?.total)}
          loading={summaryLoading && channelReady}
        />
        <KpiCard
          label="Active Initiatives"
          icon={PlayCircle}
          tone="green"
          value={summaryFailed ? "-" : (summary?.active ?? 0).toLocaleString()}
          hint="Currently running"
          info="Initiatives with the status Active."
          change={change(summary?.active, previous?.active)}
          loading={summaryLoading && channelReady}
        />
        <KpiCard
          label="Total Allocated Budget"
          icon={Wallet}
          tone="violet"
          value={summaryFailed ? "-" : formatBudget(amountIn(budgets, shownCurrency), shownCurrency)}
          hint={hasPeriod ? "Selected reporting period" : "All dates"}
          info="The budgets of the matching initiatives added up, in one currency at a time. Amounts are never converted."
          change={previous ? { current: amountIn(budgets, shownCurrency), previous: amountIn(previous.allocated_budget, shownCurrency) } : undefined}
          loading={summaryLoading && channelReady}
          action={
            budgets.length > 1 && (
              <Select value={shownCurrency} onValueChange={setBudgetCurrency}>
                <SelectTrigger size="sm" className="h-7 w-20 bg-card text-xs" aria-label="Budget currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                  {budgets.map((b) => (
                    <SelectItem key={b.currency} value={b.currency}>
                      {b.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        />
        <KpiCard
          label="Needs Attention"
          icon={AlertTriangle}
          tone="amber"
          value={summaryFailed ? "-" : (summary?.needs_attention ?? 0).toLocaleString()}
          hint="Budget, tracking, or results issues"
          info="Over budget, no budget, nothing tracked after two weeks, no results after it ended, or no start date."
          change={change(summary?.needs_attention, previous?.needs_attention)}
          goodWhen="down"
          loading={summaryLoading && channelReady}
        />
      </div>

      <FilterBar onClear={hasFilters ? clearFilters : undefined}>
        <div className="relative col-span-2 min-w-0 md:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Search initiatives, brands, owners"
            className="bg-card pl-8"
            aria-label="Search initiatives, brands or owners"
          />
        </div>
        <FilterSelect
          label="Brand"
          value={filters.brandId}
          onChange={(v) => update({ brandId: v })}
          options={[{ value: ALL, label: "All brands" }, ...(reference?.brands ?? []).map((b) => ({ value: String(b.id), label: b.name }))]}
        />
        {/* A channel page is already filtered to its channel */}
        {!channel && (
          <FilterSelect
            label="Channel"
            value={filters.channelId}
            onChange={(v) => update({ channelId: v })}
            options={[{ value: ALL, label: isOtherChannels ? "All other channels" : "All channels" }, ...channelOptions.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
        )}
        {tab !== "active" && (
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => update({ status: v })}
            options={[{ value: ALL, label: "All statuses" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
          />
        )}
        <OwnerFilter value={filters.owner} onChange={(owner) => update({ owner })} />
        <DateRangeFilter from={filters.from} to={filters.to} onChange={(from, to) => update({ from, to })} />
      </FilterBar>

      {selected.size > 0 && (
        <div className={`${DASH_CARD} flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm`}>
          <span className="font-medium text-foreground">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportSelected}>
            <Download className="h-4 w-4" />
            Export selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Map())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className={`${DASH_CARD} flex flex-col overflow-hidden`}>
        <InitiativesTable
          items={items}
          channelCodes={channelCodes}
          selected={selected}
          onToggle={toggle}
          onTogglePage={togglePage}
          placeholder={placeholder}
          dimmed={isFetching && !isLoading}
          onOpen={setPanelItem}
          onEdit={canEdit ? setEditing : undefined}
          onDelete={canDelete ? setDeleting : undefined}
        />
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{total === 0 ? "No initiatives" : `Showing ${firstRow}-${lastRow} of ${total} initiatives`}</span>
          {pageCount > 1 && (
            <nav className="flex items-center gap-1" aria-label="Pages">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageNumbers(page, pageCount).map((p, i) =>
                p === "gap" ? (
                  <span key={`gap-${i}`} className="px-1">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p + 1}`}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p + 1}
                  </Button>
                ),
              )}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={lastRow >= total} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          )}
        </div>
      </div>

      <InitiativePanel item={panelItem} onClose={() => setPanelItem(null)} onEdit={canEdit ? setEditing : undefined} />
      {canCreate && <InitiativeFormDialog open={createOpen} onOpenChange={setCreateOpen} defaultChannelCode={channel?.code} />}
      {editing && (
        <InitiativeFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          initiative={editing}
        />
      )}
      {deleting && (
        <DeleteInitiativeDialog
          initiative={deleting}
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          onDeleted={() => {
            setSelected((prev) => {
              const next = new Map(prev);
              next.delete(deleting.id);
              return next;
            });
            if (panelItem?.id === deleting.id) setPanelItem(null);
          }}
        />
      )}
    </div>
  );
}
