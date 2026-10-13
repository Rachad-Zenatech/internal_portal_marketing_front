import { CalendarDays } from "lucide-react";
import HelpIcon from "@/components/ui/HelpIcon";

// Placeholder for the events list (task E1). Physical / in-person events only for now.
export default function Events() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Events</h2>
            <HelpIcon text="Track in-person events, what they cost and what they produced, to decide whether they were worth it." />
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400">In-person events, their costs and outcomes.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
          <CalendarDays className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">No events yet</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-zinc-400">
          Events you track will appear here, with their costs, outcomes and performance rating.
        </p>
      </div>
    </div>
  );
}
