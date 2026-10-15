import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePerformance } from "@/hooks/usePerformance";
import type { InitiativeListItem } from "@/types/initiatives";
import CostLadder from "./CostLadder";
import CostOverview from "./CostOverview";
import { MUTED } from "./detailStyles";
import InitiativeSubPage from "./InitiativeSubPage";
import ResultsSection from "./ResultsSection";
import WorthItSection from "./WorthItSection";

/** The answer first (was it worth it?), then what each outcome cost, the results behind it, and the budget */
function PerformanceContent({ initiative }: { initiative: InitiativeListItem }) {
  const { data: performance, isLoading, error, refetch } = usePerformance(initiative.id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !performance) {
    return (
      <div className="flex items-center gap-3">
        <p className={`text-sm ${MUTED}`}>Could not load the performance figures.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <WorthItSection initiative={initiative} performance={performance} />
      <CostLadder initiative={initiative} performance={performance} />
      <ResultsSection initiative={initiative} performance={performance} />
      <CostOverview initiative={initiative} />
    </>
  );
}

export default function InitiativePerformance() {
  return (
    <InitiativeSubPage
      title="Performance"
      path="performance"
      icon={TrendingUp}
      description="Was it worth it? See what each outcome cost, the results behind it, and how costs compare with the budget."
    >
      {(initiative) => <PerformanceContent initiative={initiative} />}
    </InitiativeSubPage>
  );
}
