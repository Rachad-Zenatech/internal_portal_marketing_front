// Labels and checks for cost lines on the Expenses and Reconciliation tabs
import type { ExpenseLine } from "@/types/budgets";

export const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Entered by hand",
  COST_SHEET_UPLOAD: "Cost sheet",
  STAFF_CALCULATOR: "Staff time",
  NAVAN: "Navan",
  GOOGLE_ADS: "Google Ads",
  MICROSOFT_ADS: "Microsoft Ads",
  LINKEDIN_ADS: "LinkedIn Ads",
  META_ADS: "Meta Ads",
  TIKTOK_ADS: "TikTok Ads",
  X_ADS: "X Ads",
  REDDIT_ADS: "Reddit Ads",
  OTHER_ADS: "Other ad platform",
  TRAVEL_FEED: "Travel system (old)",
};

export const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? source;

/** Invoice in: counts as actual spend */
export const isActual = (l: ExpenseLine) => l.status === "INVOICED" || l.status === "PAID";

export type CountsAgainst = "BUDGET" | "NONE" | "OUTSIDE";

export function countsAgainst(l: ExpenseLine): CountsAgainst {
  if (l.outside_budget) return "OUTSIDE";
  return l.budget_id ? "BUDGET" : "NONE";
}

export const COUNTS_AGAINST_LABELS: Record<CountsAgainst, string> = {
  BUDGET: "A budget",
  NONE: "No budget",
  OUTSIDE: "Outside budgets (travel)",
};

export type Problem = "OPEN_AFTER_END" | "NO_INVOICE_NUMBER" | "NO_BUDGET";

export const PROBLEM_LABELS: Record<Problem, string> = {
  OPEN_AFTER_END: "Still an estimate or commitment after the initiative ended",
  NO_INVOICE_NUMBER: "Invoiced or paid without an invoice or receipt number",
  NO_BUDGET: "No budget covers it",
};

/** What needs sorting out before the month can be reconciled */
export function problemsOf(l: ExpenseLine, today: string): Problem[] {
  const problems: Problem[] = [];
  if (!isActual(l) && l.initiative_end_date && l.initiative_end_date < today) problems.push("OPEN_AFTER_END");
  // Ad platform costs are matched by their own reference, not an invoice number
  if (isActual(l) && !l.invoice_ref && !["GOOGLE_ADS", "MICROSOFT_ADS", "LINKEDIN_ADS", "META_ADS", "TIKTOK_ADS", "X_ADS", "REDDIT_ADS", "OTHER_ADS", "NAVAN", "STAFF_CALCULATOR"].includes(l.source)) problems.push("NO_INVOICE_NUMBER");
  if (countsAgainst(l) === "NONE") problems.push("NO_BUDGET");
  return problems;
}
