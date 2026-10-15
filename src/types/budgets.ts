// Monthly budgets — mirrors the shared budget contract (backend models/budget_model.py)
import type { SpendStatus } from "./spend";

export type BudgetStatus = "APPROVED" | "NOT_COMMITTED" | "CANCELLED";
/** Worked out by the API: CANCELLED / NOT_COMMITTED follow the status; otherwise by spend and whether the month has ended */
export type BudgetProgress = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "CANCELLED" | "NOT_COMMITTED";

/** A note on a budget, or on the whole month when budget_id is null */
export interface BudgetComment {
  id: string;
  budget_id: string | null;
  /** YYYY-MM-01 */
  month: string;
  body: string;
  /** null when the author's account was deleted */
  author_id: string | null;
  author_name: string | null;
  created_at: string;
}

/** Spend in a currency other than the budget's; never converted */
export interface OtherCurrencySpend {
  currency: string;
  spent: number;
  expected: number;
}

export interface BudgetRow {
  id: string;
  /** YYYY-MM-01 */
  month: string;
  /** null = TBD/All */
  brand_id: number | null;
  brand_name: string | null;
  market_id: number;
  market_name: string;
  /** null = all channels */
  channel_id: number | null;
  channel_name: string | null;
  amount: number;
  currency: string;
  status: BudgetStatus;
  progress: BudgetProgress;
  moved_in: number;
  moved_out: number;
  /** amount + moved_in - moved_out */
  available: number;
  /** Invoiced and paid costs */
  spent: number;
  /** Every cost, estimates included */
  expected: number;
  /** available - spent */
  remaining: number;
  /** null when nothing is available */
  percent_used: number | null;
  over_budget: boolean;
  other_currency: OtherCurrencySpend[];
  comment_count: number;
  latest_comment: { body: string; author_name: string | null; created_at: string } | null;
  last_update: string;
  last_update_by_name: string | null;
}

/** Totals for one currency in a month, cancelled budgets left out */
export interface BudgetTotals {
  currency: string;
  amount: number;
  available: number;
  spent: number;
  expected: number;
  remaining: number;
}

/** Costs in a month that no budget covers */
export interface UnbudgetedSpend {
  brand_id: number | null;
  brand_name: string | null;
  market_id: number;
  market_name: string;
  channel_id: number | null;
  channel_name: string | null;
  currency: string;
  spent: number;
  expected: number;
  initiative_count: number;
}

export interface BudgetMonth {
  /** YYYY-MM-01 */
  month: string;
  budgets: BudgetRow[];
  totals: BudgetTotals[];
  unbudgeted: UnbudgetedSpend[];
  /** Month-level notes, newest first */
  notes: BudgetComment[];
  previous_month_has_budgets: boolean;
}

/** Costs on a budget, one row per initiative and currency; only rows in the budget's currency count (they come first) */
export interface BudgetSpendSource {
  initiative_id: string;
  initiative_name: string;
  channel_name: string | null;
  sub_channel_name: string | null;
  /** Set for events, which open in Event Management */
  event_code: string | null;
  currency: string;
  spent: number;
  expected: number;
  line_count: number;
}

/** A "Move money" entry, seen from the budget being viewed */
export interface BudgetTransfer {
  id: string;
  direction: "IN" | "OUT";
  other_budget_id: string;
  /** e.g. "Aug 2026 · TBD/All · London" */
  other_budget_label: string;
  amount: number;
  /** The reason */
  note: string;
  created_at: string;
  created_by_name: string | null;
}

export interface BudgetDetail extends BudgetRow {
  spend: BudgetSpendSource[];
  transfers: BudgetTransfer[];
  /** Newest first */
  comments: BudgetComment[];
}

export interface BudgetCreate {
  month: string;
  brand_id: number | null;
  market_id: number;
  channel_id: number | null;
  amount: number;
  currency: string;
  status?: BudgetStatus;
}

export type BudgetUpdate = Partial<Omit<BudgetCreate, "month">>;

export interface BudgetCopyResult {
  created: number;
  skipped: number;
}

export interface BudgetTransferCreate {
  from_budget_id: string;
  to_budget_id: string;
  amount: number;
  note: string;
}

/** What POST /api/budget-transfers returns */
export interface BudgetTransferCreated {
  id: string;
  from_budget_id: string;
  to_budget_id: string;
  amount: number;
  note: string;
  created_at: string;
  created_by_name: string | null;
}

export interface BudgetCommentCreate {
  budget_id?: string;
  month?: string;
  body: string;
}

// ─── Week view ───────────────────────────────────────────────────────────────

/** One cost on the day it's dated, with the budget it counts against (null if no budget covers it) */
export interface BudgetWeekLine {
  id: string;
  incurred_on: string;
  description: string | null;
  vendor: string | null;
  status: SpendStatus;
  amount: number;
  currency: string;
  category_name: string | null;
  initiative_id: string;
  initiative_name: string;
  event_code: string | null;
  brand_name: string;
  market_name: string;
  channel_name: string;
  budget_id: string | null;
  /** e.g. "Oct 2026 · DeskFlex · North America · Paid Search" */
  budget_label: string | null;
}

/** A month the week falls in: what its budgets have, and what they'd spent by the end of the week */
export interface BudgetWeekMonth {
  month: string;
  currency: string;
  available: number;
  spent_to_date: number;
  /** The last day counted: the week's Sunday, or the month's last day if the week runs into the next month */
  through: string;
  days_in_month: number;
}

export interface BudgetWeek {
  /** Monday, YYYY-MM-DD */
  start: string;
  end: string;
  lines: BudgetWeekLine[];
  totals: { currency: string; spent: number; expected: number }[];
  months: BudgetWeekMonth[];
}
