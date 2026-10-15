import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
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
  description: string;
  children: (initiative: InitiativeListItem) => React.ReactNode;
}

/** Layout for a page that belongs to one initiative: a way back, the initiative it's for, then the content */
export default function InitiativeSubPage({ title, path, icon: Icon, description, children }: InitiativeSubPageProps) {
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
      <PageHeader
        icon={Icon}
        title={title}
        description={description}
        eyebrow={
          <Link to={`/initiatives/${initiative.id}`} className={`inline-flex items-center gap-1.5 hover:text-foreground ${MUTED}`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="truncate">{initiative.name}</span>
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={STATUS_STYLES[initiative.status]}>
            {STATUS_LABELS[initiative.status]}
          </Badge>
          {initiative.event_code && (
            <Badge variant="outline" className="font-mono text-muted-foreground">
              {initiative.event_code}
            </Badge>
          )}
        </div>
      </PageHeader>

      {children(initiative)}
    </div>
  );
}
