import { Fragment, useState } from "react";
import { AlertCircle, Download, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmBar from "@/components/imports/ConfirmBar";
import FileDropZone from "@/components/imports/FileDropZone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConfirmAdsImport, useUndoAdsImport, useUploadAdsSheet } from "@/hooks/useAds";
import { ApiError } from "@/services/helper";
import type { AdImportPreview, AdImportRow, AdImportRowStatus } from "@/types/ads";
import { AD_STATUS_LABELS, DASH, fmtCount, formatPeriod, PLATFORM_LABELS, PLATFORM_STYLES } from "./adsDisplay";

const NOUN: [string, string] = ["result", "results"];
const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

type RowFilter = AdImportRowStatus | "ALL";

const ROW_LABELS: Record<AdImportRowStatus, string> = {
  NEW: "New",
  UPDATE: "Update",
  UNCHANGED: "Unchanged",
  NEW_CAMPAIGN: "New campaign",
  INVALID: "Problem",
};

const ROW_STYLES: Record<AdImportRowStatus, string> = {
  NEW: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  UPDATE: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  UNCHANGED: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  NEW_CAMPAIGN: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  INVALID: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

const ROW_DOTS: Record<AdImportRowStatus, string> = {
  NEW: "bg-green-500",
  UPDATE: "bg-sky-500",
  UNCHANGED: "bg-gray-400",
  NEW_CAMPAIGN: "bg-violet-500",
  INVALID: "bg-red-500",
};

/** Problem rows stand out; the rest stay plain */
const ROW_TINTS: Record<AdImportRowStatus, string> = {
  NEW: "",
  UPDATE: "",
  UNCHANGED: "opacity-70",
  NEW_CAMPAIGN: "bg-violet-50/40 dark:bg-violet-950/15",
  INVALID: "bg-red-50/60 dark:bg-red-950/20",
};

const MESSAGE_TEXT: Record<AdImportRowStatus, string> = {
  NEW: "text-muted-foreground",
  UPDATE: "text-sky-700 dark:text-sky-300",
  UNCHANGED: "text-muted-foreground",
  NEW_CAMPAIGN: "text-violet-700 dark:text-violet-300",
  INVALID: "text-red-700 dark:text-red-400",
};

const COUNT_KEYS: Record<AdImportRowStatus, keyof AdImportPreview["counts"]> = {
  NEW: "new",
  UPDATE: "update",
  UNCHANGED: "unchanged",
  NEW_CAMPAIGN: "new_campaign",
  INVALID: "invalid",
};

function CountChips({ preview, value, onChange }: { preview: AdImportPreview; value: RowFilter; onChange: (v: RowFilter) => void }) {
  const chips: { key: RowFilter; label: string; count: number }[] = [
    { key: "ALL", label: "All rows", count: preview.rows.length },
    ...(["NEW", "UPDATE", "NEW_CAMPAIGN", "UNCHANGED", "INVALID"] as AdImportRowStatus[]).map((s) => ({
      key: s,
      label: s === "INVALID" ? "Problems" : ROW_LABELS[s],
      count: preview.counts[COUNT_KEYS[s]] ?? 0,
    })),
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

const muted = <span className="text-slate-400">{DASH}</span>;
const n = (value: number | null) => (value === null ? muted : fmtCount(value));

const COLUMNS: { key: string; header: string; className?: string; render: (r: AdImportRow) => React.ReactNode }[] = [
  {
    key: "campaign",
    header: "Campaign",
    className: "min-w-56",
    render: (r) => (
      <>
        <div className="font-medium text-slate-900 dark:text-zinc-100">{r.campaign_name ?? muted}</div>
        {r.ad_group && <div className="text-xs text-slate-500 dark:text-zinc-400">{r.ad_group}</div>}
        {r.platform && (
          <span className={`mt-1 inline-flex items-center gap-1 text-xs ${PLATFORM_STYLES[r.platform].text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${PLATFORM_STYLES[r.platform].dot}`} />
            {PLATFORM_LABELS[r.platform]}
          </span>
        )}
      </>
    ),
  },
  { key: "where", header: "Brand · Market", render: (r) => [r.brand, r.market].filter(Boolean).join(" · ") || muted },
  { key: "period", header: "Period", className: "whitespace-nowrap", render: (r) => (r.period_start ? formatPeriod(r.period_start, r.period_end) : muted) },
  { key: "budget", header: "Budget", className: "text-right tabular-nums", render: (r) => n(r.budget_amount) },
  { key: "spend", header: "Spend", className: "text-right tabular-nums", render: (r) => n(r.spend) },
  { key: "impressions", header: "Impr.", className: "text-right tabular-nums", render: (r) => n(r.impressions) },
  { key: "clicks", header: "Clicks", className: "text-right tabular-nums", render: (r) => n(r.clicks) },
  { key: "conversions", header: "Conv.", className: "text-right tabular-nums", render: (r) => n(r.conversions) },
  { key: "contacts", header: "HS contacts", className: "text-right tabular-nums", render: (r) => n(r.hubspot_contacts) },
  { key: "mqls", header: "MQLs", className: "text-right tabular-nums", render: (r) => n(r.mqls) },
  { key: "sqls", header: "SQLs", className: "text-right tabular-nums", render: (r) => n(r.sqls) },
  {
    key: "status",
    header: "Status",
    render: (r) => {
      const s = r.result_status;
      return s ? AD_STATUS_LABELS[s] : muted;
    },
  },
];

/** The rows the upload found, each with its outcome and what's wrong written under it. Scrolls inside its card. */
function PreviewTable({ rows, filter }: { rows: AdImportRow[]; filter: RowFilter }) {
  const visible = filter === "ALL" ? rows : rows.filter((r) => r.status === filter);
  const span = COLUMNS.length + 2;
  return (
    <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-200 dark:border-zinc-800">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="w-14 px-3 py-2">Row</th>
            <th className="w-32 px-3 py-2">Status</th>
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

interface PaidAdsUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadTemplate: () => Promise<void>;
}

/** Upload the PPC spreadsheet: choose a file, check the preview, import, and undo from the toast if needed */
export default function PaidAdsUpload({ open, onOpenChange, onDownloadTemplate }: PaidAdsUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AdImportPreview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RowFilter>("ALL");
  const [downloading, setDownloading] = useState(false);

  const upload = useUploadAdsSheet();
  const confirm = useConfirmAdsImport();
  const undo = useUndoAdsImport();

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
    undo
      .mutateAsync(batchId)
      .then(() => toast.success("Import undone", { description: "Results it added are removed and the ones it changed are back as they were." }))
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
          result.campaigns_created && plural(result.campaigns_created, ["new campaign", "new campaigns"]),
        ].filter(Boolean);
        toast.success(parts.length ? `Imported: ${parts.join(", ")}` : "Nothing new to import", {
          description:
            [
              result.unchanged ? `${plural(result.unchanged, ["row was", "rows were"])} already up to date.` : "",
              result.skipped ? `${plural(result.skipped, ["row was", "rows were"])} skipped because the cost is already reconciled.` : "",
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
          setConfirmError(err.message || "Could not import the results.");
        }
      },
    });
  };

  const template = async () => {
    setDownloading(true);
    try {
      await onDownloadTemplate();
    } finally {
      setDownloading(false);
    }
  };

  const counts = preview?.counts;
  const toImport = counts ? counts.new + counts.update + counts.new_campaign : 0;
  const notImported = counts ? counts.invalid : 0;

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-6xl">
        <SheetHeader className="border-b border-slate-200 dark:border-zinc-800">
          <SheetTitle>Upload PPC spreadsheet</SheetTitle>
          <SheetDescription>Add or update Google Ads and Bing Ads results from your spreadsheet. You'll see every row before anything is saved.</SheetDescription>
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
                <p>We read the SaaS PPC Campaigns tab. CTR, CPC, conversion rate and CPL are calculated, so those columns are ignored.</p>
                <p>
                  Rows match a campaign by its name and sub-channel. A name like "London - Wfinder - LP1 - Ad Group 1a" is read as ad group "Ad Group 1a" of
                  that campaign. Campaigns we don't know yet are added as new Paid Search initiatives.
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
                {preview.counts.new_campaign > 0 && (
                  <p className="text-sm text-slate-600 dark:text-zinc-300">
                    {plural(preview.counts.new_campaign, ["row has a campaign", "rows have campaigns"])} we don't know yet. Importing adds{" "}
                    {preview.counts.new_campaign === 1 ? "it" : "them"} as Paid Search initiatives, with you as the owner.
                  </p>
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
                    notImported > 0 ? `${plural(notImported, ["row", "rows"])} with problems won't be imported.` : "",
                    counts && counts.unchanged > 0 ? `${plural(counts.unchanged, ["row is", "rows are"])} already up to date.` : "",
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
