import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DASH_CARD } from "./tones";

interface FilterBarProps {
  children: React.ReactNode;
  /** Shows "Clear filters" when set */
  onClear?: () => void;
}

/**
 * A card with labelled dropdowns in a row and "Clear filters" on the right.
 * On phones the dropdowns fold behind a "Filters" button (two per row when open), so they don't fill the screen.
 */
export function FilterBar({ children, onClear }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const active = Boolean(onClear);
  const clearButton = onClear && (
    <button
      type="button"
      onClick={onClear}
      className="text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Clear filters
    </button>
  );
  return (
    <div className={`${DASH_CARD} flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between`} role="group" aria-label="Filters">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Filters
          {active && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Filters on" />}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {clearButton}
      </div>
      <div className={`${open ? "grid" : "hidden"} min-w-0 grid-cols-2 gap-x-2.5 gap-y-3 md:flex md:flex-wrap md:items-center md:gap-x-5`}>{children}</div>
      {onClear && <div className="hidden shrink-0 md:block">{clearButton}</div>}
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}

/** "Brand  [All brands v]" */
export function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground md:text-sm">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-card md:w-44" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
