import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageHeader, { type PageTone } from "@/components/PageHeader";
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

/** The header colour from the page's icon tile colours (e.g. "bg-amber-50 …" → amber) */
function headerTone(tile: string): PageTone {
  for (const tone of ["amber", "sky", "violet", "emerald", "rose"] as const) {
    if (tile.includes(tone)) return tone;
  }
  return "slate";
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
        <PageHeader icon={Icon} tone={headerTone(tone)} title={title} description={description}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{initiative.name}</span>
            <Badge variant="outline" className={`bg-white/70 dark:bg-transparent ${STATUS_STYLES[initiative.status]}`}>
              {STATUS_LABELS[initiative.status]}
            </Badge>
            {initiative.event_code && (
              <Badge variant="outline" className="bg-white/70 font-mono text-slate-600 dark:bg-transparent dark:text-zinc-300">
                {initiative.event_code}
              </Badge>
            )}
          </div>
        </PageHeader>
      </div>

      {children(initiative)}
    </div>
  );
}
