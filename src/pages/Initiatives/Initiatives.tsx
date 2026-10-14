import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Megaphone, Plus, Search } from "lucide-react";
import HelpIcon from "@/components/ui/HelpIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useInitiatives } from "@/hooks/useInitiatives";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeFilters, InitiativeListItem, InitiativeStatus } from "@/types/initiatives";
import type { ReferenceItem } from "@/types/referenceData";
import { channelStyle } from "./channelStyles";
import { EVENTS_CHANNEL_CODE, ONLINE_EVENT_SUB_CHANNELS } from "./eventRules";
import { formatBudget, formatDates, formatEventLocation, formatMoney, initials } from "./format";
import InitiativeFormDialog from "./InitiativeFormDialog";
import { STATUS_LABELS, STATUS_STYLES } from "./status";

const PAGE_SIZE = 25;
const ALL = "all";

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
      <SelectContent position="popper" className="max-h-72">
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

function ChannelCell({ code, name, subName }: { code: string | undefined; name: string; subName: string | null }) {
  const { icon: Icon, tile } = channelStyle(code);
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tile}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="whitespace-nowrap text-slate-900 dark:text-zinc-100">{name}</div>
        {subName && <div className="whitespace-nowrap text-xs text-slate-500 dark:text-zinc-400">{subName}</div>}
      </div>
    </div>
  );
}

/** Expected cost (estimates included) with a thin bar against the budget: invoiced or paid solid, the rest lighter */
function ExpectedCostCell({ item }: { item: InitiativeListItem }) {
  const { expected_total: expected, actual_amount: actual, budget_amount: budget, currency } = item;
  const hasCosts = expected !== 0 || item.has_mixed_currencies;
  const percent = budget ? (expected / budget) * 100 : null;
  // Widths within the bar: the invoiced or paid part, then the rest of the expected total (both capped at the budget)
  const actualWidth = budget ? Math.min((Math.max(actual, 0) / budget) * 100, 100) : 0;
  const restWidth = percent === null ? 0 : Math.max(Math.min(percent, 100) - actualWidth, 0);
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
        {item.has_mixed_currencies && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} aria-label="Some costs are in another currency">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Some costs are in another currency and aren't included</TooltipContent>
          </Tooltip>
        )}
        {hasCosts ? formatMoney(expected, currency) : <span className="text-slate-400 dark:text-zinc-500">—</span>}
      </span>
      {percent !== null && hasCosts && (
        <span
          className="flex h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800"
          title={`${Math.round(percent)}% of the budget`}
        >
          <span className={`h-full ${percent > 100 ? "bg-red-600 dark:bg-red-400" : "bg-indigo-800 dark:bg-indigo-300"}`} style={{ width: `${actualWidth}%` }} />
          <span
            className={`h-full ${percent > 100 ? "bg-red-300 dark:bg-red-800" : "bg-indigo-400 dark:bg-indigo-700"}`}
            style={{ width: `${restWidth}%` }}
          />
        </span>
      )}
    </div>
  );
}

const toOptions = (items: ReferenceItem[]) => items.map((i) => ({ value: String(i.id), label: i.name }));

export default function Initiatives() {
  // The channel lives in the URL (?channel=PAID_SEARCH) so sidebar links and back/forward work
  const [searchParams, setSearchParams] = useSearchParams();
  const channelCode = searchParams.get("channel");
  const [filters, setFilters] = useState<Omit<InitiativeFilters, "channel_id">>({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canCreate = hasPermission("INITIATIVES_CREATE");

  // Wait until typing pauses before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new channel may not include the selected sub-channel; start again from page 1
  useEffect(() => {
    setFilters((prev) => ({ ...prev, sub_channel_id: undefined }));
    setPage(0);
  }, [channelCode]);

  const { data: reference } = useReferenceData();
  const channel = channelCode ? reference?.channels.find((c) => c.code === channelCode) : undefined;
  const query = { ...filters, channel_id: channel?.id, search: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  // With a channel in the URL, wait for the channel list so the unfiltered list doesn't flash first
  const { data, isPending: isLoading, isError, isFetching } = useInitiatives(query, !channelCode || Boolean(reference));

  // Sub-channel options follow the chosen channel
  const subChannelOptions = useMemo(() => {
    if (!reference) return [];
    if (!channel) return toOptions(reference.sub_channels);
    const allowed = new Set(channel.sub_channel_ids);
    return toOptions(reference.sub_channels.filter((s) => allowed.has(s.id)));
  }, [reference, channel]);

  const setChannel = (id: string | undefined) => {
    const code = reference?.channels.find((c) => String(c.id) === id)?.code;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (code) next.set("channel", code);
      else next.delete("channel");
      return next;
    });
  };

  const updateFilter = (key: "sub_channel_id" | "brand_id" | "status", value: string | undefined) => {
    setPage(0);
    setFilters((prev) => {
      const next = { ...prev };
      if (key === "status") {
        next.status = value as InitiativeStatus | undefined;
      } else {
        next[key] = value === undefined ? undefined : Number(value);
      }
      return next;
    });
  };

  const hasFilters = Object.values(filters).some((v) => v !== undefined) || search !== "" || Boolean(channelCode);
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const firstRow = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRow = Math.min(total, (page + 1) * PAGE_SIZE);

  // The Events channel gets Code and Location columns
  const isEventsView = channelCode === EVENTS_CHANNEL_CODE;
  const columnCount = isEventsView ? 10 : 8;
  const subChannelCodes = useMemo(() => new Map(reference?.sub_channels.map((s) => [s.id, s.code])), [reference]);
  const channelCodes = useMemo(() => new Map(reference?.channels.map((c) => [c.id, c.code])), [reference]);
  const header = channel ? channelStyle(channel.code) : { icon: Megaphone, tile: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" };
  const HeaderIcon = header.icon;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:flex ${header.tile}`}>
            <HeaderIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                {channel ? `${channel.name} initiatives` : "Initiatives"}
              </h2>
              <HelpIcon text="Every marketing initiative across all channels, with its budget and status." />
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {channel ? `Initiatives in the ${channel.name} channel, across every brand.` : "All marketing initiatives across every channel and brand."}
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New initiative
          </Button>
        )}
      </div>

      {canCreate && <InitiativeFormDialog open={createOpen} onOpenChange={setCreateOpen} />}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name or event code"
            className="pl-8"
          />
        </div>
        <FilterSelect
          label="Channels"
          value={channel?.id}
          options={reference ? toOptions(reference.channels) : []}
          onChange={setChannel}
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
              setChannel(undefined);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm flex flex-col p-0">
        <TooltipProvider delayDuration={150}>
          <Table className="m-0 relative" containerClassName="w-full overflow-x-auto">
            <TableHeader>
              <TableRow className="border-t-0">
                <TableHead className="h-12">Initiative</TableHead>
                {isEventsView && <TableHead className="h-12">Code</TableHead>}
                {isEventsView && <TableHead className="h-12">Location</TableHead>}
                <TableHead className="hidden h-12 md:table-cell">Brand</TableHead>
                <TableHead className="h-12">Channel</TableHead>
                <TableHead className="hidden h-12 lg:table-cell">Owner</TableHead>
                <TableHead className="hidden h-12 sm:table-cell">Dates</TableHead>
                <TableHead className="h-12 text-right">Budget</TableHead>
                <TableHead className="hidden h-12 text-right sm:table-cell">Expected cost</TableHead>
                <TableHead className="h-12">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : undefined}>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center py-8 text-slate-500">Loading initiatives...</TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center py-8 text-red-600">Could not load initiatives. Please try again.</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="py-12">
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
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/initiatives/${item.id}`)}>
                    <TableCell className="font-medium text-slate-900 dark:text-zinc-100">
                      {/* Real link for keyboard and screen-reader users; the row click covers the mouse */}
                      <Link to={`/initiatives/${item.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {item.name}
                      </Link>
                      <div className="text-xs font-normal text-slate-500 md:hidden dark:text-zinc-400">{item.brand_name}</div>
                    </TableCell>
                    {isEventsView && (
                      <TableCell className="whitespace-nowrap font-mono text-xs text-slate-600 dark:text-zinc-300">{item.event_code ?? "—"}</TableCell>
                    )}
                    {isEventsView && (
                      <TableCell>
                        {formatEventLocation(
                          item.city,
                          item.country_code,
                          ONLINE_EVENT_SUB_CHANNELS.has(subChannelCodes.get(item.sub_channel_id ?? -1) ?? ""),
                        )}
                      </TableCell>
                    )}
                    <TableCell className="hidden md:table-cell">{item.brand_name}</TableCell>
                    <TableCell>
                      <ChannelCell code={channelCodes.get(item.channel_id)} name={item.channel_name} subName={item.sub_channel_name} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {item.owner_name ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900">
                            {initials(item.owner_name)}
                          </span>
                          {item.owner_name}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatDates(item.start_date, item.end_date)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{formatBudget(item.budget_amount, item.currency)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <ExpectedCostCell item={item} />
                    </TableCell>
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
        </TooltipProvider>

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
