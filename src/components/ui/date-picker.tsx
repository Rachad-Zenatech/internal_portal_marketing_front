import * as React from "react";
import { CalendarDays, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** "2026-10-15" ↔ a local Date (no time zone shift) */
function parseIsoDate(value: string | undefined): Date | undefined {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

interface DatePickerProps {
  id?: string;
  /** "YYYY-MM-DD", or "" for no date */
  value: string;
  /** Called with "YYYY-MM-DD", or "" when cleared */
  onChange: (value: string) => void;
  /** Earliest / latest date allowed, "YYYY-MM-DD" */
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Offer a Clear button (for optional dates) */
  clearable?: boolean;
  className?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-label"?: string;
  "aria-describedby"?: string;
  autoFocus?: boolean;
}

/** A date field that opens a calendar, in place of the browser's own date picker. Works in "YYYY-MM-DD" strings. */
function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  disabled,
  clearable = false,
  className,
  autoFocus,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseIsoDate(value);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);
  const today = startOfToday();
  const todayAllowed = (!minDate || today >= minDate) && (!maxDate || today <= maxDate);

  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];
  // Year dropdown: a few years either side of the date shown
  const anchor = selected ?? minDate ?? today;
  const startMonth = new Date(Math.min(anchor.getFullYear(), today.getFullYear()) - 5, 0);
  const endMonth = new Date(Math.max(anchor.getFullYear(), today.getFullYear()) + 5, 11);

  const pick = (date: Date | undefined) => {
    onChange(date ? toIsoDate(date) : "");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={aria["aria-invalid"]}
          aria-label={aria["aria-label"]}
          aria-describedby={aria["aria-describedby"]}
          className={cn(
            "flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            "data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/50",
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn("flex-1 truncate", !selected && "text-muted-foreground")}>
            {selected
              ? selected.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={pick}
          defaultMonth={selected ?? minDate ?? (maxDate && today > maxDate ? maxDate : today)}
          disabled={disabledDays}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          autoFocus
          className="p-3 [--cell-size:--spacing(9)]"
        />
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
          <Button type="button" variant="ghost" size="sm" disabled={!todayAllowed} onClick={() => pick(today)}>
            Today
          </Button>
          {clearable && value && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => pick(undefined)}>
              <X className="size-3.5" aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
