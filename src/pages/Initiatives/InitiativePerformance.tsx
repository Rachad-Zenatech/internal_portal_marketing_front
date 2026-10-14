import { Link } from "react-router-dom";
import { ArrowRight, Presentation, TrendingUp, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDemoSummary } from "@/hooks/useDemos";
import CostOverview from "./CostOverview";
import { CARD, MUTED } from "./detailStyles";
import { formatMoney } from "./format";
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

/** The event's cost per demo and per customer won through demos — the CEO's way of judging an event */
function DemoCosts({ initiativeId }: { initiativeId: string }) {
  const { data: summary } = useDemoSummary(initiativeId);
  if (!summary || summary.total === 0) return null;
  const money = (value: number | null) => (value === null ? "—" : formatMoney(value, summary.currency));
  const steps = [
    { label: "Demos", count: summary.total, cost: summary.cost_per_demo, unit: "per demo" },
    { label: "Customers", count: summary.funnel.customers, cost: summary.cost_per_customer, unit: "per customer" },
  ];
  return (
    <Card className={`${CARD} gap-4 p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-zinc-100">
          <Presentation className={`h-4 w-4 ${MUTED}`} />
          Cost per demo
        </h3>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/initiatives/${initiativeId}/demos`}>Open demo log</Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3">
            {i > 0 && (
              <div className={`flex flex-col items-center text-xs ${MUTED}`}>
                <ArrowRight className="h-4 w-4" />
                {summary.customer_rate !== null && `${summary.customer_rate}%`}
              </div>
            )}
            <div className="rounded-lg border border-slate-200 px-4 py-3 dark:border-zinc-800">
              <div className={`text-xs font-medium ${MUTED}`}>
                {step.count} {step.label.toLowerCase()}
              </div>
              <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-zinc-100">{money(step.cost)}</div>
              <div className={`text-xs ${MUTED}`}>{step.unit}</div>
            </div>
          </div>
        ))}
      </div>
      <p className={`text-sm ${MUTED}`}>
        From {money(summary.expected_cost)} expected cost. Leads and revenue join this when results are added.
      </p>
    </Card>
  );
}

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
          {initiative.event_code && <DemoCosts initiativeId={initiative.id} />}
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
