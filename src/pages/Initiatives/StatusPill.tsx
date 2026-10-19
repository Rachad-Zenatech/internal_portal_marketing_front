import { Badge } from "@/components/ui/badge";
import type { InitiativeListItem } from "@/types/initiatives";
import { ATTENTION_LABELS } from "./initiativeFields";
import { STATUS_LABELS, STATUS_STYLES } from "./status";

const NEEDS_REVIEW = "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";

/** "Needs Review" when something is off (budget, tracking or results), otherwise the status */
export function StatusPill({ item }: { item: Pick<InitiativeListItem, "status" | "needs_attention" | "attention_reasons"> }) {
  if (item.needs_attention) {
    const reasons = (item.attention_reasons ?? []).map((r) => ATTENTION_LABELS[r] ?? r).join(". ");
    return (
      <Badge variant="outline" className={`whitespace-nowrap ${NEEDS_REVIEW}`} title={reasons ? `${STATUS_LABELS[item.status]}. ${reasons}.` : STATUS_LABELS[item.status]}>
        Needs Review
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`whitespace-nowrap ${STATUS_STYLES[item.status]}`}>
      {STATUS_LABELS[item.status]}
    </Badge>
  );
}
