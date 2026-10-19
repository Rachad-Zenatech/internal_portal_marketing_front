// The initiatives list: a table on wide screens, cards below lg
import { Link } from "react-router-dom";
import { AlertTriangle, ExternalLink, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InitiativeListItem } from "@/types/initiatives";
import { channelStyle } from "./channelStyles";
import { formatBudget, formatDateRangeShort, formatMoney } from "./format";
import { formatKpiValue } from "./initiativeFields";
import { SpendBar } from "./InitiativePanel";
import { StatusPill } from "./StatusPill";

export interface RowActions {
  onOpen: (item: InitiativeListItem) => void;
  /** Left out when the user can't edit */
  onEdit?: (item: InitiativeListItem) => void;
  /** Left out when the user can't delete */
  onDelete?: (item: InitiativeListItem) => void;
}

interface InitiativesTableProps extends RowActions {
  items: InitiativeListItem[];
  /** Channel id to code, for the channel icons */
  channelCodes: Map<number, string>;
  selected: Map<string, InitiativeListItem>;
  onToggle: (item: InitiativeListItem, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
  /** Loading, error or empty message instead of rows */
  placeholder?: React.ReactNode;
  dimmed?: boolean;
}

const actualOf = (item: InitiativeListItem) => item.actual_spend ?? item.actual_amount;

function BrandPill({ name }: { name: string }) {
  return (
    <Badge variant="outline" className="whitespace-nowrap border-border bg-muted/60 font-normal text-foreground">
      {name}
    </Badge>
  );
}

function ChannelLabel({ code, name, subName }: { code: string | undefined; name: string; subName: string | null }) {
  const { icon: Icon, tile } = channelStyle(code);
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tile}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <div className="whitespace-nowrap text-foreground">{name}</div>
        {subName && <div className="whitespace-nowrap text-xs text-muted-foreground">{subName}</div>}
      </div>
    </div>
  );
}

function Progress({ item }: { item: InitiativeListItem }) {
  const percent = item.progress_percent ?? (item.budget_amount ? (actualOf(item) / item.budget_amount) * 100 : null);
  if (percent === null) return <span className="text-xs text-muted-foreground">No budget</span>;
  return (
    <div className="flex w-28 flex-col gap-1">
      <SpendBar percent={percent} />
      <span className={`text-xs tabular-nums ${percent > 100 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{Math.round(percent)}% of budget spent</span>
    </div>
  );
}

function Kpi({ item }: { item: InitiativeListItem }) {
  if (!item.primary_kpi) return <span className="text-muted-foreground">N/A</span>;
  return (
    <div className="min-w-0">
      <div className="whitespace-nowrap text-foreground">{item.primary_kpi.name}</div>
      {item.kpi_target !== null && item.kpi_target !== undefined && (
        <div className="whitespace-nowrap text-xs text-muted-foreground">{formatKpiValue(item.kpi_target, item.primary_kpi.unit, item.currency)} target</div>
      )}
    </div>
  );
}

function ActualSpend({ item }: { item: InitiativeListItem }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
      {item.has_mixed_currencies && (
        <span title="Some costs are in another currency and aren't included">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-label="Some costs are in another currency" />
        </span>
      )}
      {formatMoney(actualOf(item), item.currency)}
    </span>
  );
}

function RowMenu({ item, onOpen, onEdit, onDelete }: RowActions & { item: InitiativeListItem }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${item.name}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onOpen(item)}>
          <Eye />
          Open details
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/initiatives/${item.id}`}>
            <ExternalLink />
            Open full page
          </Link>
        </DropdownMenuItem>
        {onEdit && (
          <DropdownMenuItem onSelect={() => onEdit(item)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function InitiativesTable({ items, channelCodes, selected, onToggle, onTogglePage, placeholder, dimmed, ...actions }: InitiativesTableProps) {
  const pageSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const someSelected = items.some((i) => selected.has(i.id));
  const select = (item: InitiativeListItem) => (
    <Checkbox
      checked={selected.has(item.id)}
      onCheckedChange={(checked) => onToggle(item, checked === true)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Select ${item.name}`}
    />
  );
  // Enter or Space on a focused row opens it, like a click
  const openOnKey = (item: InitiativeListItem) => (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      actions.onOpen(item);
    }
  };

  return (
    <div className={dimmed ? "opacity-60 transition-opacity" : undefined}>
      {/* Wide screens: the table */}
      <div className="hidden lg:block">
        <Table className="m-0" containerClassName="w-full overflow-x-auto">
          <TableHeader>
            <TableRow className="border-t-0">
              <TableHead className="h-11 w-10 pl-4">
                <Checkbox
                  checked={pageSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => onTogglePage(checked === true)}
                  aria-label="Select every initiative on this page"
                  disabled={items.length === 0}
                />
              </TableHead>
              <TableHead className="h-11 min-w-56">Initiative Name</TableHead>
              <TableHead className="h-11">Brand</TableHead>
              <TableHead className="h-11">Channel</TableHead>
              <TableHead className="h-11">Dates</TableHead>
              <TableHead className="h-11 text-right">Budget</TableHead>
              <TableHead className="h-11 text-right">Actual Spend</TableHead>
              <TableHead className="h-11">Progress</TableHead>
              <TableHead className="h-11">Primary KPI</TableHead>
              <TableHead className="h-11">Status</TableHead>
              <TableHead className="h-11 w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placeholder ? (
              <TableRow>
                <TableCell colSpan={11}>{placeholder}</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  aria-label={`${item.name}, open details`}
                  data-state={selected.has(item.id) ? "selected" : undefined}
                  onClick={() => actions.onOpen(item)}
                  onKeyDown={openOnKey(item)}
                >
                  <TableCell className="pl-4">{select(item)}</TableCell>
                  <TableCell className="max-w-80">
                    <div className="truncate font-medium text-foreground">{item.name}</div>
                    {(item.description || item.event_code) && (
                      <div className="truncate text-xs text-muted-foreground">{item.description || item.event_code}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <BrandPill name={item.brand_name} />
                  </TableCell>
                  <TableCell>
                    <ChannelLabel code={channelCodes.get(item.channel_id)} name={item.channel_name} subName={item.sub_channel_name} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateRangeShort(item.start_date, item.end_date)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatBudget(item.budget_amount, item.currency)}</TableCell>
                  <TableCell className="text-right">
                    <ActualSpend item={item} />
                  </TableCell>
                  <TableCell>
                    <Progress item={item} />
                  </TableCell>
                  <TableCell>
                    <Kpi item={item} />
                  </TableCell>
                  <TableCell>
                    <StatusPill item={item} />
                  </TableCell>
                  <TableCell>
                    <RowMenu item={item} {...actions} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Phones and tablets: one card per initiative */}
      <div className="lg:hidden">
        {placeholder ? (
          <div className="p-4">{placeholder}</div>
        ) : (
          <>
            <label className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm text-muted-foreground">
              <Checkbox checked={pageSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={(checked) => onTogglePage(checked === true)} />
              Select all on this page
            </label>
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => actions.onOpen(item)}
                    onKeyDown={openOnKey(item)}
                    className="flex gap-3 px-4 py-3 text-left hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <div className="pt-0.5">{select(item)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.name}</p>
                          {item.description && <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <StatusPill item={item} />
                          <RowMenu item={item} {...actions} />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                        <BrandPill name={item.brand_name} />
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${channelStyle(channelCodes.get(item.channel_id)).dot}`} />
                          {item.sub_channel_name ? `${item.channel_name} / ${item.sub_channel_name}` : item.channel_name}
                        </span>
                        <span>{formatDateRangeShort(item.start_date, item.end_date)}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Budget</p>
                          <p className="tabular-nums">{formatBudget(item.budget_amount, item.currency)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Actual spend</p>
                          <ActualSpend item={item} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <Progress item={item} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Primary KPI</p>
                          <Kpi item={item} />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
