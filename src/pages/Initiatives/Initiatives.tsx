import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone, Search } from "lucide-react";
import HelpIcon from "@/components/ui/HelpIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInitiatives } from "@/hooks/useInitiatives";
import { useReferenceData } from "@/hooks/useReferenceData";
import type { InitiativeFilters, InitiativeStatus } from "@/types/initiatives";
import type { ReferenceItem } from "@/types/referenceData";

const PAGE_SIZE = 25;
const ALL = "all";

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<InitiativeStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  ACTIVE: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
};

function formatBudget(amount: number | null, currency: string) {
  if (amount === null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return null;
  // Dates arrive as YYYY-MM-DD; parse as local to avoid a timezone shift
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatDates(start: string | null, end: string | null) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return "—";
}

interface FilterSelectProps {
  label: string;
  value: number | string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

function FilterSelect({ label, value, options, onChange, disabled }: FilterSelectProps) {
  return (
    <Select
      value={value === undefined ? ALL : String(value)}
      onValueChange={(v) => onChange(v === ALL ? undefined : v)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full sm:w-44" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const toOptions = (items: ReferenceItem[]) => items.map((i) => ({ value: String(i.id), label: i.name }));

export default function Initiatives() {
  const [filters, setFilters] = useState<InitiativeFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Wait until typing pauses before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: reference } = useReferenceData();
  const query = { ...filters, search: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data, isLoading, isError, isFetching } = useInitiatives(query);

  // Sub-channel options follow the chosen channel
  const subChannelOptions = useMemo(() => {
    if (!reference) return [];
    if (filters.channel_id === undefined) return toOptions(reference.sub_channels);
    const channel = reference.channels.find((c) => c.id === filters.channel_id);
    const allowed = new Set(channel?.sub_channel_ids ?? []);
    return toOptions(reference.sub_channels.filter((s) => allowed.has(s.id)));
  }, [reference, filters.channel_id]);

  const updateFilter = (key: "channel_id" | "sub_channel_id" | "brand_id" | "status", value: string | undefined) => {
    setPage(0);
    setFilters((prev) => {
      const next: InitiativeFilters = { ...prev };
      if (key === "status") {
        next.status = value as InitiativeStatus | undefined;
      } else {
        next[key] = value === undefined ? undefined : Number(value);
      }
      // A new channel may not include the selected sub-channel
      if (key === "channel_id") next.sub_channel_id = undefined;
      return next;
    });
  };

  const hasFilters = Object.values(filters).some((v) => v !== undefined) || search !== "";
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const firstRow = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRow = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Initiatives</h2>
            <HelpIcon text="Every marketing initiative across all channels, with its budget and status." />
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400">All marketing initiatives across every channel and brand.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Search initiatives..."
            className="pl-8"
          />
        </div>
        <FilterSelect
          label="Channels"
          value={filters.channel_id}
          options={reference ? toOptions(reference.channels) : []}
          onChange={(v) => updateFilter("channel_id", v)}
        />
        <FilterSelect
          label="Sub-channels"
          value={filters.sub_channel_id}
          options={subChannelOptions}
          onChange={(v) => updateFilter("sub_channel_id", v)}
        />
        <FilterSelect
          label="Brands"
          value={filters.brand_id}
          options={reference ? toOptions(reference.brands) : []}
          onChange={(v) => updateFilter("brand_id", v)}
        />
        <FilterSelect
          label="Statuses"
          value={filters.status}
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(v) => updateFilter("status", v)}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setFilters({});
              setSearchInput("");
              setSearch("");
              setPage(0);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm flex flex-col p-0">
        <Table className="m-0 relative" containerClassName="w-full overflow-x-auto">
          <TableHeader>
            <TableRow className="border-t-0">
              <TableHead className="h-12">Initiative</TableHead>
              <TableHead className="h-12">Brand</TableHead>
              <TableHead className="h-12">Channel</TableHead>
              <TableHead className="h-12">Owner</TableHead>
              <TableHead className="h-12">Dates</TableHead>
              <TableHead className="h-12 text-right">Budget</TableHead>
              <TableHead className="h-12">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : undefined}>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading initiatives...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-red-600">Could not load initiatives. Please try again.</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-slate-900 dark:text-zinc-100">
                      {hasFilters ? "No initiatives match these filters" : "No initiatives yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                      {hasFilters ? "Try clearing a filter." : "Initiatives you track will appear here."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-zinc-100">{item.name}</TableCell>
                  <TableCell>{item.brand_name}</TableCell>
                  <TableCell>
                    <div className="text-slate-900 dark:text-zinc-100">{item.channel_name}</div>
                    {item.sub_channel_name && (
                      <div className="text-xs text-slate-500 dark:text-zinc-400">{item.sub_channel_name}</div>
                    )}
                  </TableCell>
                  <TableCell>{item.owner_name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDates(item.start_date, item.end_date)}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{formatBudget(item.budget_amount, item.currency)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLES[item.status]}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-auto flex items-center justify-between border-t border-slate-200 dark:border-zinc-800 px-4 py-3 text-sm text-slate-500 dark:text-zinc-400">
          <span>{total === 0 ? "0 initiatives" : `${firstRow}–${lastRow} of ${total} initiatives`}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={lastRow >= total}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
