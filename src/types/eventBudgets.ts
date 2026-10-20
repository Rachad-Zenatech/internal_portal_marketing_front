// Uploading many events' budgets at once. Mirrors /api/initiatives/event-budgets/preview and /apply

export type EventBudgetRowStatus = "UPDATE" | "UNCHANGED" | "ERROR";

export interface EventBudgetPreviewRow {
  row_number: number;
  /** What the sheet had in its Event column (a code or a name) */
  event_text: string;
  status: EventBudgetRowStatus;
  message: string | null;
  initiative_id: string | null;
  event_name: string | null;
  event_code: string | null;
  event_status: string | null;
  old_budget: number | null;
  new_budget: number | null;
  old_currency: string | null;
  new_currency: string | null;
  old_travel_budget: number | null;
  new_travel_budget: number | null;
}

export interface EventBudgetPreview {
  rows: EventBudgetPreviewRow[];
  counts: Record<EventBudgetRowStatus, number>;
  ignored_columns: string[];
}

export interface EventBudgetChange {
  initiative_id: string;
  budget_amount: number;
  currency: string;
  travel_budget_amount: number | null;
}
