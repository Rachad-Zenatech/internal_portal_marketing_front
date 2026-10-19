// Labels and colours shared by every spreadsheet upload's preview and history
import type { ImportBatchStatus, ImportRowStatus } from "@/types/imports";

export type ImportRowFilter = ImportRowStatus | "ALL";

export const ROW_STATUS_LABELS: Record<ImportRowStatus, string> = {
  READY: "Ready",
  READY_WITH_WARNINGS: "Warning",
  DUPLICATE: "Duplicate",
  INVALID: "Problem",
};

export const ROW_STATUS_STYLES: Record<ImportRowStatus, string> = {
  READY: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  READY_WITH_WARNINGS: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  DUPLICATE: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
  INVALID: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

/** Row tint in the preview table: problems stand out, ready rows stay plain */
export const ROW_TINTS: Record<ImportRowStatus, string> = {
  READY: "",
  READY_WITH_WARNINGS: "bg-amber-50/50 dark:bg-amber-950/20",
  DUPLICATE: "bg-orange-50/60 dark:bg-orange-950/20",
  INVALID: "bg-red-50/60 dark:bg-red-950/20",
};

export const BATCH_STATUS_LABELS: Record<ImportBatchStatus, string> = {
  PREVIEW: "Not imported",
  CONFIRMED: "Imported",
  UNDONE: "Undone",
  EXPIRED: "Preview expired",
  REPLACED: "Replaced",
};

export const BATCH_STATUS_STYLES: Record<ImportBatchStatus, string> = {
  PREVIEW: "border-gray-200 bg-gray-100 text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CONFIRMED: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  UNDONE: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  EXPIRED: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  REPLACED: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

/** "24 KB", "1.2 MB" */
export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
