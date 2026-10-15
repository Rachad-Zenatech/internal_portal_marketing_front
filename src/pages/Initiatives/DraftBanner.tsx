import { FilePen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraftBannerProps {
  /** "event" or "initiative", for the wording */
  noun: string;
  /** Opens the edit form; leave out when the person can't edit */
  onFinish?: () => void;
}

/** Shown on a draft's page: it was saved part-way and still needs finishing */
export default function DraftBanner({ noun, onFinish }: DraftBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex items-start gap-3">
        <FilePen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">This {noun} is a draft</p>
          <p className="text-sm text-muted-foreground">
            Fill in what's missing and choose a status to finish it.
            {noun === "event" && " The travel system only sees it once it's finished."}
          </p>
        </div>
      </div>
      {onFinish && (
        <Button size="sm" className="shrink-0" onClick={onFinish}>
          Finish setting up
        </Button>
      )}
    </div>
  );
}
