// Small pieces for the Paid Advertising page: platform icon, status pill, date range picker, progress bar
import { useState } from "react";
import type { DateRange as DayRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AdPlatform, CampaignStatus } from "@/types/ads";
import { PLATFORM_LABELS, PLATFORM_MARK } from "./adsDisplay";
import { isoDate } from "./adsPeriods";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_PILL, formatRange, RANGE_OPTIONS, type RangeKey } from "./overviewDisplay";

/** A small coloured tile with the platform's mark; with its name unless `iconOnly` */
export function PlatformIcon({ platform, iconOnly = false, size = "sm" }: { platform: AdPlatform; iconOnly?: boolean; size?: "sm" | "md" }) {
  const mark = PLATFORM_MARK[platform];
  const tile = size === "md" ? "h-7 w-7 text-xs" : "h-5 w-5 text-[10px]";
  return (
    <span className="inline-flex min-w-0 items-center gap-2" title={PLATFORM_LABELS[platform]}>
      <span className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold leading-none ${tile} ${mark.tile}`} aria-hidden={!iconOnly}>
        {mark.text}
      </span>
      {iconOnly ? <span className="sr-only">{PLATFORM_LABELS[platform]}</span> : <span className="truncate">{PLATFORM_LABELS[platform]}</span>}
    </span>
  );
}

export function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${CAMPAIGN_STATUS_PILL[status]}`}>{CAMPAIGN_STATUS_LABELS[status]}</span>;
}

/** A thin bar: green while there's room, amber from 90%, red when over */
export function UsageBar({ percent, className = "" }: { percent: number | null; className?: string }) {
  const p = percent ?? 0;
  const tone = p > 100 ? "bg-red-500" : p >= 90 ? "bg-amber-500" : "bg-primary";
  return (
    <span className={`block h-1.5 w-full overflow-hidden rounded-full bg-muted ${className}`} role="presentation">
      <span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.min(Math.max(p, p > 0 ? 2 : 0), 100)}%` }} />
    </span>
  );
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "Last 30 days" with the dates under it; presets on the left, a calendar for any other range */
export function DateRangePicker({ rangeKey, from, to, onPreset, onCustom }: { rangeKey: RangeKey; from: string; to: string; onPreset: (key: RangeKey) => void; onCustom: (from: string, to: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayRange | undefined>();
  const label = rangeKey === "custom" ? "Custom range" : (RANGE_OPTIONS.find((o) => o.value === rangeKey)?.label ?? "Last 30 days");
  const today = new Date();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft({ from: parse(from), to: parse(to) });
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-auto min-h-9 justify-start gap-2 bg-card py-1.5 text-left font-normal sm:min-w-56" aria-label={`Date range: ${label}, ${formatRange(from, to)}`}>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">{formatRange(from, to)}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-wrap gap-1 border-b border-border p-2 sm:w-40 sm:flex-col sm:flex-nowrap sm:border-r sm:border-b-0">
            {RANGE_OPTIONS.map((o) => (
              <Button
                key={o.value}
                variant={rangeKey === o.value ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => {
                  onPreset(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 p-2">
            <Calendar mode="range" selected={draft} onSelect={setDraft} numberOfMonths={1} defaultMonth={draft?.to ?? today} disabled={{ after: today }} />
            <div className="flex items-center justify-end gap-2 px-1 pb-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!draft?.from}
                onClick={() => {
                  if (!draft?.from) return;
                  onCustom(isoDate(draft.from), isoDate(draft.to ?? draft.from));
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
