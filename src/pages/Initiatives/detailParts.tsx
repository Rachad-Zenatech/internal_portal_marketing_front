import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/services/helper";
import { CARD, MUTED } from "./detailStyles";

export function Empty({ text = "Not set" }: { text?: string }) {
  return <span className="font-normal text-slate-400 dark:text-zinc-500">{text}</span>;
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, icon: Icon, action, children }: SectionProps) {
  return (
    <Card className={`${CARD} gap-0 p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-zinc-100">
          <Icon className={`h-4 w-4 ${MUTED}`} />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** Shown when an initiative can't be loaded (missing, or the request failed) */
export function InitiativeNotLoaded({ error }: { error: unknown }) {
  const notFound = error instanceof ApiError && error.status === 404;
  return (
    <div className="flex flex-col items-start gap-3 p-8">
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        {notFound ? "This initiative doesn't exist or was removed." : "Could not load this initiative. Refresh the page to try again."}
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
