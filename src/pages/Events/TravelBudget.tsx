import { formatMoney } from "../Initiatives/format";
import { travelBudgetTone } from "./eventDisplay";

interface TravelBudgetUsageProps {
  budget: number;
  /** Invoiced and paid travel costs (from Navan), in the event's currency */
  used: number | undefined;
  currency: string;
  className?: string;
}

/** "Travel budget $8,000 · $1,200 used" */
export default function TravelBudgetUsage({ budget, used, currency, className = "" }: TravelBudgetUsageProps) {
  return (
    <span className={`${used === undefined ? "" : travelBudgetTone(budget, used)} ${className}`}>
      Travel budget {formatMoney(budget, currency)}
      {used !== undefined && <> · {formatMoney(used, currency)} used</>}
    </span>
  );
}
