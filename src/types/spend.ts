// Costs against an initiative — mirrors backend models/spend_model.py

export type SpendStatus = "ESTIMATED" | "COMMITTED" | "INVOICED" | "PAID";
export type SpendSource = "MANUAL" | "STAFF_CALCULATOR" | "COST_SHEET_UPLOAD" | "TRAVEL_FEED" | "GOOGLE_ADS" | "MICROSOFT_ADS";
export type PaymentMethod = "AP_INVOICE" | "CORPORATE_CARD" | "OTHER";
export type CostType = "OPEX" | "CAPEX";
/** Why some fields on a line can't change */
export type SpendLockReason = "TRAVEL_FEED" | "ADS_IMPORT" | "RECONCILED";

export interface SpendLine {
  id: string;
  initiative_id: string;
  category_id: number;
  category_code: string;
  category_name: string;
  expense_type_id: number;
  expense_type_code: string;
  expense_type_name: string;
  description: string | null;
  vendor: string | null;
  note: string | null;
  status: SpendStatus;
  estimated_amount: number | null;
  amount: number;
  /** amount − estimate, once invoiced or paid and there was an estimate */
  variance: number | null;
  currency: string;
  incurred_on: string;
  /** The supplier's invoice number only; Finance keeps the invoice */
  invoice_ref: string | null;
  paid_on: string | null;
  payment_method: PaymentMethod | null;
  cost_type: CostType | null;
  source: SpendSource;
  lock_reason: SpendLockReason | null;
  locked_fields: string[];
  can_delete: boolean;
  /** False only when every field is locked */
  editable: boolean;
  /** First day of the month it was reconciled in */
  reconciled_month: string | null;
  created_by_name: string | null;
  updated_at: string;
}

export interface SpendFigures {
  expected_total: number;
  committed: number;
  actual: number;
}

export interface SpendCategorySummary extends SpendFigures {
  category_id: number;
  name: string;
  estimated: number;
  variance: number;
  line_count: number;
}

export interface SpendExpenseTypeSummary extends SpendFigures {
  expense_type_id: number;
  code: string;
  name: string;
  source: "PORTAL" | "TRAVEL_SYSTEM";
  estimated: number;
  variance: number;
  /** Share of the initiative's expected total */
  percent_of_total: number | null;
  categories: SpendCategorySummary[];
}

export interface SpendTotals extends SpendFigures {
  paid: number;
  still_estimated: number;
  /** Budget − expected total; negative means it's expected to go over */
  forecast_remaining: number | null;
  remaining_committed: number | null;
  percent_expected: number | null;
  percent_committed: number | null;
  percent_actual: number | null;
  awaiting_invoice: { count: number; amount: number };
}

/** Amounts in the initiative's currency; other currencies are listed separately, never converted */
export interface SpendSummary {
  budget_amount: number | null;
  budget_currency: string;
  totals: SpendTotals;
  by_expense_type: SpendExpenseTypeSummary[];
  by_source: { supplier: number; travel: number };
  by_month: (SpendFigures & { month: string })[];
  per_day: number | null;
  other_currencies: (SpendFigures & { currency: string })[];
  mixed_currencies: boolean;
}
