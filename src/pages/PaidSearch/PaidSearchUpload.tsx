import { Fragment, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import ConfirmBar from "@/components/imports/ConfirmBar";
import FileDropZone from "@/components/imports/FileDropZone";
import { downloadCsv } from "@/components/dashboard/csv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HeaderMismatchError, PAID_SEARCH_FIELDS, parsePaidSearchFile, type PaidSearchEntry, type ParsedSheet } from "./paidSearchFields";

const NOUN: [string, string] = ["entry", "entries"];
const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;
const muted = <span className="text-slate-400">-</span>;

/** The columns worth seeing in the preview; every column is still imported */
const PREVIEW_KEYS = ["campaign_name", "brand", "market", "period_start", "period_end", "sub_channel", "budget_allocated", "actual_spend", "status"] as const;
const PREVIEW_FIELDS = PREVIEW_KEYS.map((k) => PAID_SEARCH_FIELDS.find((f) => f.key === k)!);

function PreviewTable({ sheet }: { sheet: ParsedSheet }) {
  const span = PREVIEW_FIELDS.length + 2;
  return (
    <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-200 dark:border-zinc-800">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="w-14 px-3 py-2">Row</th>
            <th className="w-24 px-3 py-2">Result</th>
            {PREVIEW_FIELDS.map((f) => (
              <th key={f.key} className="whitespace-nowrap px-3 py-2">
                {f.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row) => {
            const bad = row.problems.length > 0;
            const tint = bad ? "bg-red-50/60 dark:bg-red-950/20" : "";
            return (
              <Fragment key={row.row_number}>
                <tr className={`${tint} ${bad ? "" : "border-b border-slate-100 dark:border-zinc-800"}`}>
                  <td className="px-3 py-2 align-top tabular-nums text-slate-500 dark:text-zinc-400">{row.row_number}</td>
                  <td className="px-3 py-2 align-top">
                    <Badge
                      variant="outline"
                      className={
                        bad
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                          : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                      }
                    >
                      {bad ? "Problem" : "New"}
                    </Badge>
                  </td>
                  {PREVIEW_FIELDS.map((f) => (
                    <td key={f.key} className={`px-3 py-2 align-top ${f.kind === "number" ? "text-right tabular-nums" : ""} whitespace-nowrap`}>
                      {row.entry[f.key] || muted}
                    </td>
                  ))}
                </tr>
                {bad && (
                  <tr className={`${tint} border-b border-slate-100 dark:border-zinc-800`}>
                    <td />
                    <td colSpan={span - 1} className="px-3 pb-2">
                      <ul className="flex flex-col gap-0.5 text-xs text-red-700 dark:text-red-400">
                        {row.problems.map((p) => (
                          <li key={p} className="flex items-start gap-1.5">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {p}
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

/** The header problem, column by column, so it's clear what to fix in the sheet */
function HeaderErrorDetail({ error }: { error: HeaderMismatchError }) {
  const groups = [
    { label: "Missing columns", items: error.missing },
    { label: "Columns that aren't Paid Search fields", items: error.unexpected },
    { label: "Columns that appear more than once", items: error.duplicated },
  ].filter((g) => g.items.length > 0);
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
      <p className="flex items-center gap-1.5 font-medium">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        The spreadsheet's columns don't match the Paid Search fields. Nothing was imported.
      </p>
      {error.sheetName && <p className="text-xs">No sheet has all the columns. Closest: the "{error.sheetName}" sheet.</p>}
      {groups.map((g) => (
        <div key={g.label}>
          <p className="text-xs font-medium">{g.label}</p>
          <p className="text-xs">{g.items.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}

interface PaidSearchUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Adds the checked rows to the board */
  onImport: (entries: PaidSearchEntry[]) => void;
}

/** Upload a Paid Search spreadsheet: choose a file, check the preview, import onto the board */
export default function PaidSearchUpload({ open, onOpenChange, onImport }: PaidSearchUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedSheet | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<HeaderMismatchError | null>(null);
  const [checking, setChecking] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setFileError(null);
    setHeaderError(null);
  };
  const close = () => {
    onOpenChange(false);
    reset();
  };

  const check = async () => {
    if (!file) return;
    setFileError(null);
    setHeaderError(null);
    setChecking(true);
    try {
      setPreview(await parsePaidSearchFile(file));
    } catch (err) {
      if (err instanceof HeaderMismatchError) setHeaderError(err);
      else setFileError((err as Error).message || "Could not read the file.");
    } finally {
      setChecking(false);
    }
  };

  const valid = preview?.rows.filter((r) => r.problems.length === 0) ?? [];
  const invalid = (preview?.rows.length ?? 0) - valid.length;

  const importRows = () => {
    onImport(valid.map((r) => r.entry));
    close();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-5xl">
        <SheetHeader className="border-b border-slate-200 dark:border-zinc-800">
          <SheetTitle>Upload Paid Search spreadsheet</SheetTitle>
          <SheetDescription>Add Paid Search entries to the board from a spreadsheet. You'll see every row before anything is added.</SheetDescription>
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
                  setHeaderError(null);
                }}
                disabled={checking}
                error={fileError}
              />
              {headerError && <HeaderErrorDetail error={headerError} />}
              <div className="flex flex-col gap-2 rounded-lg bg-slate-50/80 p-3 text-sm text-slate-600 dark:bg-muted dark:text-zinc-300">
                <p>We look through every sheet for the header row. It must have exactly these columns (any order, upper or lower case):</p>
                <p className="text-xs leading-relaxed">{PAID_SEARCH_FIELDS.map((f) => f.header).join(" · ")}</p>
                <p>Rows without a Campaign Name, or with numbers or dates we can't read, are shown as problems and not imported.</p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto w-fit gap-1.5 p-0"
                  onClick={() =>
                    downloadCsv(
                      "paid-search-template.csv",
                      PAID_SEARCH_FIELDS.map((f) => f.header),
                      [],
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                  Download template
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                {(fileError || headerError) && file && (
                  <Button type="button" variant="outline" onClick={reset}>
                    Try another file
                  </Button>
                )}
                <Button type="button" onClick={() => void check()} disabled={!file || checking || Boolean(fileError) || Boolean(headerError)}>
                  {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Check file
                </Button>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{preview.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {preview.sheetName ? `From the "${preview.sheetName}" sheet · ` : ""}
                  {plural(preview.rows.length, ["row", "rows"])} found · all {PAID_SEARCH_FIELDS.length} columns matched. The preview shows the main columns; every column
                  is imported.
                </p>
              </div>
              <PreviewTable sheet={preview} />
              <ConfirmBar
                count={valid.length}
                noun={NOUN}
                onConfirm={importRows}
                onCancel={close}
                onChooseAnother={reset}
                note={invalid > 0 ? `${plural(invalid, ["row", "rows"])} with problems won't be imported.` : undefined}
              />
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
