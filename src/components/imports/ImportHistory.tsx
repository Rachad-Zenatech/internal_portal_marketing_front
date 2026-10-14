import { useState } from "react";
import { FileSpreadsheet, Loader2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImportBatchSummary } from "@/types/imports";
import { BATCH_STATUS_LABELS, BATCH_STATUS_STYLES } from "./importStatus";

interface ImportHistoryProps {
  batches: ImportBatchSummary[] | undefined;
  loading?: boolean;
  /** Undo an import; rejects with the API's reason when it can't */
  onUndo: (batchId: string) => Promise<unknown>;
  /** What a row is, singular and plural: ["cost", "costs"] */
  noun: [string, string];
}

const when = (value: string) => new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Recent uploads with their outcome; imported ones can be undone after an in-page confirmation */
export default function ImportHistory({ batches, loading, onUndo, noun }: ImportHistoryProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const plural = (n: number) => `${n} ${n === 1 ? noun[0] : noun[1]}`;

  const undo = async (batchId: string) => {
    setUndoing(batchId);
    setErrors((prev) => ({ ...prev, [batchId]: "" }));
    try {
      await onUndo(batchId);
      setConfirming(null);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [batchId]: err instanceof Error ? err.message : "Could not undo the import." }));
    } finally {
      setUndoing(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-500 dark:text-zinc-400">Loading uploads…</p>;
  if (!batches?.length) return <p className="text-sm text-slate-500 dark:text-zinc-400">No uploads yet.</p>;

  return (
    <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
      {batches.map((batch) => (
        <li key={batch.id} className="flex flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-zinc-100">{batch.filename}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {batch.created_by_name ?? "Someone"} · {when(batch.created_at)} · {batch.total_rows} rows
                {batch.status === "CONFIRMED" && ` · ${plural(batch.imported_rows)} imported`}
                {batch.error_rows > 0 && ` · ${batch.error_rows} with problems`}
                {batch.duplicate_rows > 0 && ` · ${batch.duplicate_rows} ${batch.duplicate_rows === 1 ? "duplicate" : "duplicates"}`}
              </p>
            </div>
            <Badge variant="outline" className={BATCH_STATUS_STYLES[batch.status]}>
              {BATCH_STATUS_LABELS[batch.status]}
            </Badge>
            {batch.status === "CONFIRMED" && confirming !== batch.id && (
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setConfirming(batch.id)}>
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
            )}
          </div>

          {confirming === batch.id && (
            <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-amber-900 dark:text-amber-200">
                Remove the {plural(batch.line_count)} this upload added?
                {batch.edited_count > 0 && ` ${batch.edited_count} ${batch.edited_count === 1 ? "was" : "were"} edited since and will be removed too.`}
              </p>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(null)} disabled={undoing === batch.id}>
                  Keep
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => void undo(batch.id)} disabled={undoing === batch.id}>
                  {undoing === batch.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Undo import
                </Button>
              </div>
            </div>
          )}
          {errors[batch.id] && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {errors[batch.id]}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
