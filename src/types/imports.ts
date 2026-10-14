// Spreadsheet uploads — mirrors backend models/import_model.py

export type ImportRowStatus = "READY" | "READY_WITH_WARNINGS" | "DUPLICATE" | "INVALID";
export type ImportBatchStatus = "PREVIEW" | "CONFIRMED" | "UNDONE" | "EXPIRED";

export interface ImportCounts {
  total: number;
  /** READY + READY_WITH_WARNINGS: what confirming would import */
  ready: number;
  warnings: number;
  duplicates: number;
  invalid: number;
}

/** What every upload's preview rows have in common */
export interface ImportPreviewRowBase {
  row_number: number;
  status: ImportRowStatus;
  messages: string[];
}

export interface CostSheetPreviewRow extends ImportPreviewRowBase {
  item: string | null;
  category: string | null;
  expense_type: string | null;
  vendor: string | null;
  estimate: number | null;
  actual: number | null;
  status_value: string | null;
  invoice_ref: string | null;
  date: string | null;
  paid_on: string | null;
  currency: string | null;
}

export interface CostSheetPreview {
  batch_id: string;
  filename: string;
  counts: ImportCounts;
  /** Sheet columns nothing reads */
  ignored_columns: string[];
  rows: CostSheetPreviewRow[];
  /** In the initiative's currency */
  totals_preview: { expected_total: number; committed: number; actual: number };
}

export interface ImportConfirmResult {
  batch_id: string;
  status: ImportBatchStatus;
  imported_rows: number;
  /** Rows whose supplier invoice was recorded by someone else between preview and confirm */
  skipped: number;
}

export interface ImportUndoResult {
  batch_id: string;
  status: ImportBatchStatus;
  removed_rows: number;
}

export interface ImportBatchSummary {
  id: string;
  kind: string;
  filename: string;
  status: ImportBatchStatus;
  total_rows: number;
  ready_rows: number;
  error_rows: number;
  duplicate_rows: number;
  imported_rows: number;
  created_by_name: string | null;
  created_at: string;
  confirmed_at: string | null;
  confirmed_by_name: string | null;
  undone_at: string | null;
  undone_by_name: string | null;
  /** Lines from this upload still on the initiative, and how many were edited after the import */
  line_count: number;
  edited_count: number;
}
