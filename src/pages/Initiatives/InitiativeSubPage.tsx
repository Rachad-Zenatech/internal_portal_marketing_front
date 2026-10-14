import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useInitiative } from "@/hooks/useInitiatives";
import type { InitiativeListItem } from "@/types/initiatives";
import { InitiativeNotLoaded } from "./detailParts";
import { MUTED } from "./detailStyles";
import { STATUS_LABELS, STATUS_STYLES } from "./status";
import { useInitiativeNavigation } from "./useInitiativeNavigation";

interface InitiativeSubPageProps {
  /** Page name, e.g. "Costs"; also the last breadcrumb */
  title: string;
  /** Path after /initiatives/:id, e.g. "costs" */
  path: string;
  icon: React.ElementType;
  /** Icon tile colours */
  tone: string;
  description: string;
  children: (initiative: InitiativeListItem) => React.ReactNode;
}

/** Layout for a page that belongs to one initiative: a way back, the initiative it's for, then the content */
export default function InitiativeSubPage({ title, path, icon: Icon, tone, description, children }: InitiativeSubPageProps) {
  const { id } = useParams<{ id: string }>();
  const { data: initiative, isLoading, error } = useInitiative(id);

  // Initiatives › Events › Facility Expo 2026 - Booth › Costs, with the channel highlighted in the sidebar
  useInitiativeNavigation(initiative, { title, path });

  if (isLoading) {
    return <p className="p-8 text-sm text-slate-500">Loading initiative...</p>;
  }
  if (error || !initiative) {
    return <InitiativeNotLoaded error={error} />;
  }

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col gap-3">
        <Link
          to={`/initiatives/${initiative.id}`}
          className={`inline-flex w-fit items-center gap-1.5 text-sm hover:text-slate-900 dark:hover:text-zinc-100 ${MUTED}`}
        >
          <ArrowLeft className="h-4 w-4" />
          {initiative.name}
        </Link>
        <div className="flex items-start gap-4">
          <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:flex ${tone}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">{title}</h2>
              <Badge variant="outline" className={STATUS_STYLES[initiative.status]}>
                {STATUS_LABELS[initiative.status]}
              </Badge>
              {initiative.event_code && (
                <Badge variant="outline" className="font-mono text-slate-600 dark:text-zinc-300">
                  {initiative.event_code}
                </Badge>
              )}
            </div>
            <p className={`mt-1 text-sm ${MUTED}`}>{description}</p>
          </div>
        </div>
      </div>

      {children(initiative)}
    </div>
  );
}
