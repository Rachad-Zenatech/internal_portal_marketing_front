import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInitiative } from "@/hooks/useInitiatives";
import { useAuth } from "@/lib/AuthContext";
import { ApiError } from "@/services/helper";
import { formatBudget, formatDates } from "./format";
import InitiativeFormDialog from "./InitiativeFormDialog";
import { STATUS_LABELS, STATUS_STYLES } from "./status";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 dark:text-zinc-100">{value || "—"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-900 dark:text-zinc-100">{title}</h3>
      {children}
    </Card>
  );
}

function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <Card className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-5">
      <h3 className="font-semibold text-slate-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{text}</p>
    </Card>
  );
}

export default function InitiativeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: initiative, isLoading, error } = useInitiative(id);
  const { hasPermission } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  // Show the initiative's name in the breadcrumb instead of its id
  useEffect(() => {
    if (!initiative) return;
    document.dispatchEvent(
      new CustomEvent("set-breadcrumb-trail", {
        detail: {
          path: `/initiatives/${initiative.id}`,
          items: [{ title: "Initiatives", path: "/initiatives" }, { title: initiative.name }],
        },
      }),
    );
  }, [initiative]);

  if (isLoading) {
    return <p className="p-8 text-sm text-slate-500">Loading initiative...</p>;
  }

  if (error || !initiative) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col items-start gap-3 p-8">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          {notFound ? "This initiative doesn't exist or was removed." : "Could not load this initiative. Please try again."}
        </p>
        <Button variant="outline" asChild>
          <Link to="/initiatives">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to initiatives
          </Link>
        </Button>
      </div>
    );
  }

  const channel = initiative.sub_channel_name ? `${initiative.channel_name} · ${initiative.sub_channel_name}` : initiative.channel_name;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">{initiative.name}</h2>
            <Badge variant="outline" className={STATUS_STYLES[initiative.status]}>
              {STATUS_LABELS[initiative.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {initiative.brand_name} · {channel}
          </p>
        </div>
        {hasPermission("INITIATIVES_UPDATE") && (
          <Button onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Overview">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Detail label="Brand" value={initiative.brand_name} />
            <Detail label="Owner" value={initiative.owner_name} />
            <Detail label="Channel" value={initiative.channel_name} />
            <Detail label="Sub-channel" value={initiative.sub_channel_name} />
            <Detail label="Dates" value={formatDates(initiative.start_date, initiative.end_date)} />
            <Detail label="Budget" value={formatBudget(initiative.budget_amount, initiative.currency)} />
          </dl>
        </Section>

        <Section title="Goal">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Detail label="Funnel stage" value={initiative.funnel_stage_name} />
            <Detail label="Goal" value={initiative.goal_name} />
            <Detail label="Primary KPI" value={initiative.primary_kpi_name} />
          </dl>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ComingSoon title="Budget & spend" text="Spend recorded against this initiative's budget will appear here." />
        <ComingSoon title="Results" text="Leads, demos, customers and revenue from this initiative will appear here." />
        <ComingSoon title="Was it worth it?" text="Cost per outcome, ROI and the performance rating will appear here." />
      </div>

      {hasPermission("INITIATIVES_UPDATE") && (
        <InitiativeFormDialog open={editOpen} onOpenChange={setEditOpen} initiative={initiative} />
      )}
    </div>
  );
}
