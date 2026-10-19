import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import RequiredMark from "@/components/RequiredMark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { InitiativeListItem } from "@/types/initiatives";
import { dateRange } from "./eventDisplay";

interface ImportEventDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every event to choose from */
  events: InitiativeListItem[];
  loading: boolean;
  /** The event picked: its cost sheet upload opens next */
  onPick: (event: InitiativeListItem) => void;
}

/** Step 1 of "Import Event Data": choose the event. Step 2 is the cost sheet upload for it. */
export default function ImportEventDataDialog({ open, onOpenChange, events, loading, onPick }: ImportEventDataDialogProps) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...events].sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    if (!q) return sorted;
    return sorted.filter((e) => [e.name, e.event_code, e.brand_name, e.city].some((s) => s?.toLowerCase().includes(q)));
  }, [events, query]);
  const chosen = events.find((e) => e.id === picked);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setQuery("");
      setPicked(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import event data</DialogTitle>
          <DialogDescription>Choose the event, then upload its cost sheet. You'll check every row before anything is saved.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p id="import-event-label" className="text-sm font-medium text-foreground">
            Event
            <RequiredMark />
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Search events" aria-label="Search events" className="h-9 pl-8" />
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {query ? "No events match your search." : "No events yet."}
            </p>
          ) : (
            <ul role="radiogroup" aria-labelledby="import-event-label" className="flex max-h-72 flex-col overflow-y-auto rounded-lg border border-border">
              {shown.map((e) => {
                const selected = e.id === picked;
                return (
                  <li key={e.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPicked(e.id)}
                      className={`flex w-full min-w-0 flex-col items-start px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                        selected ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="w-full truncate font-medium text-foreground">{e.name}</span>
                      <span className="w-full truncate text-xs text-muted-foreground">
                        {[dateRange(e.start_date, e.end_date), e.brand_name, e.city].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={!chosen}
            onClick={() => {
              if (!chosen) return;
              close(false);
              onPick(chosen);
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
