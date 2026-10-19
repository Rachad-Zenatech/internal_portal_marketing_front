import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmBar from "@/components/imports/ConfirmBar";
import FileDropZone from "@/components/imports/FileDropZone";
import ImportCountChips from "@/components/imports/ImportCountChips";
import ImportHistory from "@/components/imports/ImportHistory";
import ImportPreviewTable, { type ImportPreviewColumn } from "@/components/imports/ImportPreviewTable";
import type { ImportRowFilter } from "@/components/imports/importStatus";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConfirmImport, useInitiativeImports, useUndoImport, useUploadCostSheet } from "@/hooks/useImports";
import { ApiError } from "@/services/helper";
import { downloadCostSheetTemplate } from "@/services/importsService";
import type { InitiativeListItem } from "@/types/initiatives";
import type { CostSheetPreview, CostSheetPreviewRow } from "@/types/imports";
import { formatDate, formatMoney } from "./format";

const NOUN: [string, string] = ["cost", "costs"];
const COLUMNS_WE_READ =
  "Item, Category, Vendor, Estimate, Actual, Status, Invoice or receipt #, Date, Paid on, Payment method, Currency, OPEX/CAPEX, Notes";

function columnsFor(currency: string): ImportPreviewColumn<CostSheetPreviewRow>[] {
  const money = (value: number | null, row: CostSheetPreviewRow) =>
    value === null ? <span className="text-slate-400">-</span> : formatMoney(value, row.currency ?? currency);
  const text = (value: string | null) => value ?? <span className="text-slate-400">-</span>;
  return [
    { key: "item", header: "Item", render: (r) => <span className="font-medium text-slate-900 dark:text-zinc-100">{text(r.item)}</span> },
    {
      key: "category",
      header: "Category",
      render: (r) => (
        <>
          <div>{text(r.category)}</div>
          {r.expense_type && <div className="text-xs text-slate-500 dark:text-zinc-400">{r.expense_type}</div>}
        </>
      ),
    },
    { key: "vendor", header: "Vendor", render: (r) => text(r.vendor) },
    { key: "estimate", header: "Estimate", className: "text-right tabular-nums", render: (r) => money(r.estimate, r) },
    { key: "actual", header: "Actual", className: "text-right tabular-nums", render: (r) => money(r.actual, r) },
    { key: "stage", header: "Stage", render: (r) => text(r.status_value) },
    { key: "invoice", header: "Invoice / receipt #", className: "font-mono text-xs", render: (r) => text(r.invoice_ref) },
    { key: "date", header: "Date", className: "whitespace-nowrap", render: (r) => formatDate(r.date) ?? <span className="text-slate-400">-</span> },
  ];
}

const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

interface CostSheetUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only these are needed, so the Events Overview can open it for any event */
  initiative: Pick<InitiativeListItem, "id" | "name" | "currency">;
}

/** Upload an event's cost sheet: choose a file, check the preview, import, and undo if needed */
export default function CostSheetUpload({ open, onOpenChange, initiative }: CostSheetUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CostSheetPreview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImportRowFilter>("ALL");
  const [downloading, setDownloading] = useState(false);

  const upload = useUploadCostSheet(initiative.id);
  const confirm = useConfirmImport(initiative.id);
  const undo = useUndoImport(initiative.id);
  const history = useInitiativeImports(initiative.id, open);

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
  };

  const check = () => {
    if (!file) return;
    setFileError(null);
    upload.mutate(file, {
      onSuccess: (result) => setPreview(result),
      onError: (err) => setFileError(err.message || "Could not read the file."),
    });
  };

  const undoBatch = (batchId: string) =>
    undo.mutateAsync(batchId).then((result) => {
      toast.success(`Removed ${plural(result.removed_rows, NOUN)}`, {
        description: result.restored_rows
          ? `The previous upload's ${plural(result.restored_rows, NOUN)} ${result.restored_rows === 1 ? "is" : "are"} back.`
          : undefined,
      });
      return result;
    });

  const importRows = () => {
    if (!preview) return;
    setConfirmError(null);
    confirm.mutate(preview.batch_id, {
      onSuccess: (result) => {
        toast.success(`Imported ${plural(result.imported_rows, NOUN)}`, {
          description:
            [
              result.replaced_rows ? `Replaced the previous upload's ${plural(result.replaced_rows, NOUN)}.` : null,
              result.skipped ? `${plural(result.skipped, ["row was", "rows were"])} skipped because an invoice was recorded after you checked the file.` : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined,
          action: {
            label: "Undo",
            onClick: () => void undoBatch(result.batch_id).catch((err: Error) => toast.error(err.message)),
          },
        });
        close();
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 410) {
          // Too old to confirm: back to the file step to upload it again
          setPreview(null);
          setFileError(err.message);
        } else {
          setConfirmError(err.message || "Could not import the costs.");
        }
      },
    });
  };

  const template = async () => {
    setDownloading(true);
    try {
      await downloadCostSheetTemplate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the template.");
    } finally {
      setDownloading(false);
    }
  };

  const counts = preview?.counts;
  const notImported = counts ? counts.invalid + counts.duplicates : 0;

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-5xl">
        <SheetHeader className="border-b border-slate-200 dark:border-zinc-800">
          <SheetTitle>Upload cost sheet</SheetTitle>
          <SheetDescription>
            Add {initiative.name}'s costs from a spreadsheet. You'll see every row before anything is saved.
          </SheetDescription>
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
              <div className="flex flex-col gap-2 rounded-lg bg-slate-50/80 p-3 text-sm text-slate-600 dark:bg-muted dark:text-zinc-300">
                <p>
                  <span className="font-medium text-slate-900 dark:text-zinc-100">Columns we read:</span> {COLUMNS_WE_READ}.
                </p>
                <p>Leave out flights, hotels and cars booked in Navan. Navan adds them.</p>
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
                <p className="text-sm text-slate-500 dark:text-zinc-400">
                  <span className="font-medium text-slate-900 dark:text-zinc-100">{preview.filename}</span>
                </p>
                <ImportCountChips counts={preview.counts} value={filter} onChange={setFilter} />
                <p className="text-sm text-slate-700 dark:text-zinc-300">
                  Adds <span className="font-semibold">{formatMoney(preview.totals_preview.expected_total, initiative.currency)}</span> expected ·{" "}
                  {formatMoney(preview.totals_preview.committed, initiative.currency)} committed ·{" "}
                  {formatMoney(preview.totals_preview.actual, initiative.currency)} invoiced or paid
                </p>
                {preview.ignored_columns.length > 0 && (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">Ignored columns: {preview.ignored_columns.join(", ")}</p>
                )}
                {preview.replaces && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <p>
                      <span className="font-medium">This replaces the sheet uploaded {formatDate(preview.replaces.confirmed_at.slice(0, 10))}</span> (v
                      {preview.replaces.version}, {preview.replaces.filename}). Its {plural(preview.replaces.line_count - preview.replaces.reconciled_count, NOUN)}{" "}
                      {preview.replaces.line_count - preview.replaces.reconciled_count === 1 ? "is" : "are"} removed and these added instead. Undo brings the previous
                      version back.
                    </p>
                    {preview.replaces.edited_count > 0 && (
                      <p className="mt-1">
                        {plural(preview.replaces.edited_count, NOUN)} from that upload {preview.replaces.edited_count === 1 ? "was" : "were"} changed here since. The
                        sheet replaces those changes, so make sure the file has them too.
                      </p>
                    )}
                    {preview.replaces.reconciled_count > 0 && (
                      <p className="mt-1">
                        {plural(preview.replaces.reconciled_count, NOUN)} already reconciled {preview.replaces.reconciled_count === 1 ? "stays" : "stay"} as{" "}
                        {preview.replaces.reconciled_count === 1 ? "it is" : "they are"}.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <ImportPreviewTable rows={preview.rows} columns={columnsFor(initiative.currency)} filter={filter} />

              {confirmError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {confirmError}
                </p>
              )}
              <ConfirmBar
                count={preview.counts.ready}
                noun={NOUN}
                pending={confirm.isPending}
                onConfirm={importRows}
                onCancel={close}
                onChooseAnother={reset}
                note={notImported > 0 ? `${plural(notImported, ["row", "rows"])} with problems or duplicates won't be imported.` : undefined}
              />
            </section>
          )}

          <section className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Recent uploads</h3>
            <ImportHistory batches={history.data} loading={history.isPending} onUndo={undoBatch} noun={NOUN} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
