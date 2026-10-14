import { TrendingUp, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import CostOverview from "./CostOverview";
import { CARD, MUTED } from "./detailStyles";
import InitiativeSubPage from "./InitiativeSubPage";

// Room for the next pieces: what the initiative achieved, and the verdict
const COMING_SOON = [
  {
    icon: Users,
    title: "Results",
    text: "Leads, demos, customers and revenue this initiative brought in.",
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
  },
  {
    icon: Trophy,
    title: "Was it worth it?",
    text: "Cost per outcome, ROI, the performance rating and the scale-or-cut decision.",
    tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  },
];

export default function InitiativePerformance() {
  return (
    <InitiativeSubPage
      title="Performance"
      path="performance"
      icon={TrendingUp}
      tone="bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
      description="Where the costs will land against the budget, and later, what it achieved."
    >
      {(initiative) => (
        <>
          <CostOverview initiative={initiative} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {COMING_SOON.map(({ icon: Icon, title, text, tone }) => (
              <Card key={title} className={`${CARD} flex-row items-start gap-4 p-5`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-zinc-100">{title}</p>
                    <Badge variant="outline" className={MUTED}>
                      Coming soon
                    </Badge>
                  </div>
                  <p className={`mt-1 text-sm ${MUTED}`}>{text}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </InitiativeSubPage>
  );
}
