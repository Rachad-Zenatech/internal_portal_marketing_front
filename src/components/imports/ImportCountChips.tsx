import type { ImportCounts } from "@/types/imports";
import type { ImportRowFilter } from "./importStatus";

interface ImportCountChipsProps {
  counts: ImportCounts;
  value: ImportRowFilter;
  onChange: (value: ImportRowFilter) => void;
}

/** Ready 22 · Warnings 2 · Duplicates 1 · Problems 3 — each one filters the preview */
export default function ImportCountChips({ counts, value, onChange }: ImportCountChipsProps) {
  const chips: { key: ImportRowFilter; label: string; count: number; dot: string }[] = [
    { key: "ALL", label: "All rows", count: counts.total, dot: "bg-slate-400" },
    // The API's "ready" includes rows with warnings; they're shown apart here
    { key: "READY", label: "Ready", count: counts.ready - counts.warnings, dot: "bg-green-500" },
    { key: "READY_WITH_WARNINGS", label: "Warnings", count: counts.warnings, dot: "bg-amber-500" },
    { key: "DUPLICATE", label: "Duplicates", count: counts.duplicates, dot: "bg-orange-500" },
    { key: "INVALID", label: "Problems", count: counts.invalid, dot: "bg-red-500" },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter rows">
      {chips.map((chip) => {
        const active = value === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={active}
            disabled={chip.count === 0 && chip.key !== "ALL" && !active}
            onClick={() => onChange(active && chip.key !== "ALL" ? "ALL" : chip.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-50 ${
              active
                ? "border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50/80 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {chip.key !== "ALL" && <span className={`h-2 w-2 rounded-full ${chip.dot}`} aria-hidden="true" />}
            {chip.label} <span className="tabular-nums opacity-70">{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}
