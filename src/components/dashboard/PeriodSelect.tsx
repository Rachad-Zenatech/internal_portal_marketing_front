import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PeriodSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label?: string;
}

/** A dropdown of periods with a calendar icon, e.g. "Last 30 days" */
export default function PeriodSelect<T extends string>({ value, onChange, options, label = "Period" }: PeriodSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="h-9 w-full gap-2 bg-card sm:w-48" aria-label={label}>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
