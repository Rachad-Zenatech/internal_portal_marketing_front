import { Fragment, useState } from "react";
import { AlertCircle, Download, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmBar from "@/components/imports/ConfirmBar";
import FileDropZone from "@/components/imports/FileDropZone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConfirmBudgetImport, useUndoBudgetImport, useUploadBudgetSheet } from "@/hooks/useBudgets";
import { downloadBudgetTemplate } from "@/services/budgetService";
import { ApiError } from "@/services/helper";
import type { BudgetImportPreview, BudgetImportRow, BudgetImportRowStatus } from "@/types/budgets";
import { formatMoney } from "../Initiatives/format";
import { ALL_CHANNELS, BUDGET_STATUS_LABELS, CURRENCIES, fromApiMonth, monthName, STATUS_PILL } from "./budgetDisplay";

const NOUN: [string, string] = ["budget", "budgets"];
const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

type RowFilter = BudgetImportRowStatus | "ALL";
const STATUSES: BudgetImportRowStatus[] = ["NEW", "UPDATE", "UNCHANGED", "INVALID"];

const ROW_LABELS: Record<BudgetImportRowStatus, string> = {
  NEW: "New",
  UPDATE: "Update",
  UNCHANGED: "Unchanged",
  INVALID: "Problem",
};

const ROW_STYLES: Record<BudgetImportRowStatus, string> = {
  NEW: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  UPDATE: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  UNCHANGED: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  INVALID: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

const ROW_DOTS: Record<BudgetImportRowStatus, string> = {
  NEW: "bg-green-500",
  UPDATE: "bg-sky-500",
  UNCHANGED: "bg-gray-400",
  INVALID: "bg-red-500",
};

/** Problem rows stand out; the rest stay plain */
const ROW_TINTS: Record<BudgetImportRowStatus, string> = {
  NEW: "",
  UPDATE: "",
  UNCHANGED: "opacity-70",
  INVALID: "bg-red-50/60 dark:bg-red-950/20",
};

const MESSAGE_TEXT: Record<BudgetImportRowStatus, string> = {
  NEW: "text-muted-foreground",
  UPDATE: "text-sky-700 dark:text-sky-300",
  UNCHANGED: "text-muted-foreground",
  INVALID: "text-red-700 dark:text-red-400",
};

const COUNT_KEYS: Record<BudgetImportRowStatus, keyof BudgetImportPreview["counts"]> = {
  NEW: "new",
  UPDATE: "update",
  UNCHANGED: "unchanged",
  INVALID: "invalid",
};

function CountChips({ preview, value, onChange }: { preview: BudgetImportPreview; value: RowFilter; onChange: (v: RowFilter) => void }) {
  const chips: { key: RowFilter; label: string; count: number }[] = [
    { key: "ALL", label: "All rows", count: preview.rows.length },
    ...STATUSES.map((s) => ({ key: s, label: s === "INVALID" ? "Problems" : ROW_LABELS[s], count: preview.counts[COUNT_KEYS[s]] })),
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
            {chip.key !== "ALL" && <span className={`h-2 w-2 rounded-full ${ROW_DOTS[chip.key]}`} aria-hidden="true" />}
            {chip.label} <span className="tabular-nums opacity-70">{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}

const muted = <span className="text-slate-400">-</span>;

const COLUMNS: { key: string; header: string; className?: string; render: (r: BudgetImportRow) => React.ReactNode }[] = [
  { key: "month", header: "Month", className: "whitespace-nowrap", render: (r) => (r.month ? monthName(fromApiMonth(r.month)) : muted) },
  {
    key: "budget",
    header: "Brand · Market",
    className: "min-w-48",
    render: (r) => (
      <>
        <div className="font-medium text-slate-900 dark:text-zinc-100">{[r.brand, r.market].filter(Boolean).join(" · ") || muted}</div>
        <div className="text-xs text-slate-500 dark:text-zinc-400">{r.channel ?? ALL_CHANNELS}</div>
      </>
    ),
  },
  {
    key: "amount",
    header: "Approved",
    className: "text-right tabular-nums whitespace-nowrap",
    render: (r) => (r.amount !== null && r.currency ? formatMoney(r.amount, r.currency) : muted),
  },
  {
    key: "status",
    header: "Status",
    render: (r) =>
      r.budget_status ? (
        <>
          <Badge variant="outline" className={STATUS_PILL[r.budget_status]}>
            {BUDGET_STATUS_LABELS[r.budget_status]}
          </Badge>
          {r.sheet_progress && <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Sheet: {r.sheet_progress}</div>}
        </>
      ) : (
        muted
      ),
  },
  {
    key: "note",
    header: "Note",
    className: "min-w-64 max-w-md",
    render: (r) => (r.note ? <span className="line-clamp-3 text-slate-600 dark:text-zinc-300">{r.note}</span> : muted),
  },
];

/** The rows the upload found, each with its outcome and what's wrong written under it. Scrolls inside its card. */
function PreviewTable({ rows, filter }: { rows: BudgetImportRow[]; filter: RowFilter }) {
  const visible = filter === "ALL" ? rows : rows.filter((r) => r.status === filter);
  const span = COLUMNS.length + 2;
  return (
    <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-200 dark:border-zinc-800">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="w-14 px-3 py-2">Row</th>
            <th className="w-28 px-3 py-2">Result</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className={`px-3 py-2 ${c.className ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <td colSpan={span} className="px-3 py-6 text-center text-slate-500 dark:text-zinc-400">
                No rows with this status.
              </td>
            </tr>
          )}
          {visible.map((row) => {
            const hasMessages = row.messages.length > 0;
            return (
              <Fragment key={row.row_number}>
                <tr className={`${ROW_TINTS[row.status]} ${hasMessages ? "" : "border-b border-slate-100 dark:border-zinc-800"}`}>
                  <td className="px-3 py-2 align-top tabular-nums text-slate-500 dark:text-zinc-400">{row.row_number}</td>
                  <td className="px-3 py-2 align-top">
                    <Badge variant="outline" className={ROW_STYLES[row.status]}>
                      {ROW_LABELS[row.status]}
                    </Badge>
                  </td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className={`px-3 py-2 align-top ${c.className ?? ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
                {hasMessages && (
                  <tr className={`${ROW_TINTS[row.status]} border-b border-slate-100 dark:border-zinc-800`}>
                    <td />
                    <td colSpan={span - 1} className="px-3 pb-2">
                      <ul className={`flex flex-col gap-0.5 text-xs ${MESSAGE_TEXT[row.status]}`}>
                        {row.messages.map((message) => (
                          <li key={message} className="flex items-start gap-1.5">
                            {row.status === "INVALID" ? (
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            )}
                            {message}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface BudgetsUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The year being viewed (YYYY), used for months the sheet writes without one */
  defaultYear: number;
}

/** Upload the Budget Tracker tab: choose a file, check the preview, import, and undo from the toast if needed */
export default function BudgetsUpload({ open, onOpenChange, defaultYear }: BudgetsUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(defaultYear);
  const [currency, setCurrency] = useState("USD");
  const [preview, setPreview] = useState<BudgetImportPreview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RowFilter>("ALL");
  const [downloading, setDownloading] = useState(false);

  const upload = useUploadBudgetSheet();
  const confirm = useConfirmBudgetImport();
  const undo = useUndoBudgetImport();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setFileError(null);
    setConfirmError(null);
    setFilter("ALL");
  };
  const close = () => {
    onOpenChange(false);
    reset();
    setYear(defaultYear);
  };

  const check = () => {
    if (!file) return;
    setFileError(null);
    upload.mutate(
      { file, year, currency },
      {
        onSuccess: (result) => setPreview(result),
        onError: (err) => setFileError(err.message || "Could not read the file."),
      },
    );
  };

  const undoBatch = (batchId: string) =>
    undo
      .mutateAsync(batchId)
      .then(() => toast.success("Import undone", { description: "Budgets it added are removed and the ones it changed are back as they were." }))
      .catch((err: Error) => toast.error(err.message || "Could not undo the import."));

  const importRows = () => {
    if (!preview) return;
    setConfirmError(null);
    const batchId = preview.batch_id;
    confirm.mutate(batchId, {
      onSuccess: (result) => {
        const parts = [
          result.created && `${result.created} new`,
          result.updated && `${result.updated} updated`,
          result.notes_added && plural(result.notes_added, ["note", "notes"]),
        ].filter(Boolean);
        toast.success(parts.length ? `Imported: ${parts.join(", ")}` : "Nothing new to import", {
          description:
            [
              result.unchanged ? `${plural(result.unchanged, ["budget was", "budgets were"])} already up to date.` : "",
              result.skipped ? `${plural(result.skipped, ["row was", "rows were"])} skipped because the budget has money moves in another currency.` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined,
          action: parts.length ? { label: "Undo", onClick: () => void undoBatch(batchId) } : undefined,
          duration: 10_000,
        });
        close();
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 410) {
          // Too old to confirm: back to the file step to upload it again
          setPreview(null);
          setFileError(err.message);
        } else {
          setConfirmError(err.message || "Could not import the budgets.");
        }
      },
    });
  };

  const template = async () => {
    setDownloading(true);
    try {
      await downloadBudgetTemplate();
    } catch (err) {
      toast.error((err as Error).message || "Could not download the template.");
    } finally {
      setDownloading(false);
    }
  };

  const counts = preview?.counts;
  const toImport = counts ? counts.new + counts.update : 0;
  const thisYear = new Date().getFullYear();
  const years = Array.from(new Set([thisYear - 1, thisYear, thisYear + 1, defaultYear])).sort();

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-5xl">
        <SheetHeader className="border-b border-slate-200 dark:border-zinc-800">
          <SheetTitle>Upload budget tracker</SheetTitle>
          <SheetDescription>Add or update monthly budgets from your Budget Tracker spreadsheet. You'll see every row before anything is saved.</SheetDescription>
          <ol className="mt-2 flex flex-wrap gap-2 text-xs" aria-label="Steps">
            {["Choose file", "Check the preview", "Import"].map((label, i) => {
              const current = (preview ? 1 : 0) === i;
              return (
                <li
                  key={label}
                  aria-current={current ? "step" : undefined}
                  className={`rounded-full border px-2.5 py-0.5 ${current ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300" : "border-slate-200 text-slate-500 dark:border-zinc-700 dark:text-zinc-400"}`}
                >
                  {i + 1}. {label}
                </li>
              );
            })}
          </ol>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {!preview ? (
            <section className="flex flex-col gap-4">
              <FileDropZone
                file={file}
                onFileChange={(picked) => {
                  setFile(picked);
                  setFileError(null);
                }}
                disabled={upload.isPending}
                error={fileError}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="budget-upload-year">Year</Label>
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))} disabled={upload.isPending}>
                    <SelectTrigger id="budget-upload-year" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">For months written without a year, like "Aug".</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="budget-upload-currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency} disabled={upload.isPending}>
                    <SelectTrigger id="budget-upload-currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">For amounts without a currency. $ is read as USD and £ as GBP.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-slate-50/80 p-3 text-sm text-slate-600 dark:bg-muted dark:text-zinc-300">
                <p>We read the Budget Tracker tab: Month, Brand, Market / Region, Approved Budget, Spend Progress and Notes. Each note is added to its budget.</p>
                <p>
                  Spend Progress sets the status: Canceled and Not committed carry over, and the rest are approved budgets. Actual spend, carryover and unspent
                  are worked out from costs and money moves, so those columns are ignored.
                </p>
                <Button type="button" variant="link" className="h-auto w-fit gap-1.5 p-0" onClick={() => void template()} disabled={downloading}>
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download template
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                {fileError && file && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setFileError(null);
                    }}
                  >
                    Try another file
                  </Button>
                )}
                <Button type="button" onClick={check} disabled={!file || upload.isPending || Boolean(fileError)}>
                  {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Check file
                </Button>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{preview.filename}</p>
                <CountChips preview={preview} value={filter} onChange={setFilter} />
                {preview.ignored_columns.length > 0 && (
                  <p className="text-xs text-muted-foreground">Not read: {preview.ignored_columns.join(", ")}.</p>
                )}
              </div>

              <PreviewTable rows={preview.rows} filter={filter} />

              {confirmError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {confirmError}
                </p>
              )}
              <ConfirmBar
                count={toImport}
                noun={NOUN}
                pending={confirm.isPending}
                onConfirm={importRows}
                onCancel={close}
                onChooseAnother={reset}
                note={
                  [
                    counts && counts.invalid > 0 ? `${plural(counts.invalid, ["row", "rows"])} with problems won't be imported.` : "",
                    counts && counts.unchanged > 0 ? `${plural(counts.unchanged, ["budget is", "budgets are"])} already up to date.` : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
