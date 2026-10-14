// Cost rules shared by the cost sheet and the cost dialog — mirrors services/spend_service.py
import type { ExpenseType, ReferenceData, SpendCategory } from "@/types/referenceData";
import type { PaymentMethod, SpendStatus } from "@/types/spend";
import { formatMoney } from "./format";

export const SPEND_STATUSES: SpendStatus[] = ["ESTIMATED", "COMMITTED", "INVOICED", "PAID"];

export const SPEND_STATUS_LABELS: Record<SpendStatus, string> = {
  ESTIMATED: "Estimate",
  COMMITTED: "Committed",
  INVOICED: "Invoiced",
  PAID: "Paid",
};

export const SPEND_STATUS_STYLES: Record<SpendStatus, string> = {
  ESTIMATED: "border-gray-200 bg-gray-100 text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  COMMITTED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  INVOICED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  PAID: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  AP_INVOICE: "Supplier invoice (AP)",
  CORPORATE_CARD: "Corporate card",
  OTHER: "Other",
};

export const INVOICE_HELP =
  "The supplier's invoice number, so the same invoice can't be entered twice. The invoice itself stays with Finance.";

/** "5 people × 3 days × $400/day = $6,000": a staff-time cost's description, so the working stays visible */
export function staffTimeSentence(people: number, days: number, dayRate: number, currency: string) {
  const total = Math.round(people * days * dayRate * 100) / 100;
  return `${people} ${people === 1 ? "person" : "people"} × ${days} ${days === 1 ? "day" : "days"} × ${formatMoney(dayRate, currency)}/day = ${formatMoney(total, currency)}`;
}

/** INVOICED and PAID amounts are actuals; before that they're estimates or agreed figures */
export const isActualStatus = (status: SpendStatus) => status === "INVOICED" || status === "PAID";

// Which categories a channel can use (spend_categories.applies_to); other channels use ALL only
const CHANNEL_GROUPS: Record<string, "EVENTS" | "ADS"> = { EVENTS: "EVENTS", PAID_SEARCH: "ADS", PAID_SOCIAL: "ADS" };

/** Categories people can pick for this channel, grouped by expense type in display order */
export function categoryGroups(reference: ReferenceData | undefined, channelCode: string | undefined, keepCategoryId?: number) {
  if (!reference) return [];
  const group = channelCode ? CHANNEL_GROUPS[channelCode] : undefined;
  const allowed = (c: SpendCategory) =>
    c.id === keepCategoryId || (c.manual_entry_allowed && (c.applies_to === "ALL" || c.applies_to === group));
  return reference.expense_types
    .map((type: ExpenseType) => ({
      type,
      categories: reference.spend_categories.filter((c) => c.expense_type_id === type.id && allowed(c)),
    }))
    .filter((g) => g.categories.length > 0);
}

/** Which form field an API error belongs to, so it can be shown next to that field */
export function errorField(message: string): "invoiceRef" | "paidOn" | "amount" | "categoryId" | "currency" | null {
  const text = message.toLowerCase();
  if (text.includes("invoice") && text.includes("already recorded")) return "invoiceRef";
  if (text.includes("date it was paid")) return "paidOn";
  if (text.includes("amount")) return "amount";
  if (text.includes("category") || text.includes("travel and staff")) return "categoryId";
  if (text.includes("currency")) return "currency";
  return null;
}
