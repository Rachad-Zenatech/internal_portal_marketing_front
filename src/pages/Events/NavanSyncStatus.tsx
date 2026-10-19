import { CircleAlert, Loader2, Plane, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavanStatus, useSyncNavan } from "@/hooks/useNavan";
import { useAuth } from "@/lib/AuthContext";

/** "just now", "5 minutes ago", "2 hours ago", "3 days ago" */
export function timeAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return null;
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (Number.isNaN(minutes)) return null;
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

const fullTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** The "Sync with Navan" button on its own */
export function RefreshFromNavanButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const sync = useSyncNavan();
  const refresh = () =>
    sync.mutate(undefined, {
      onSuccess: (summary) => {
        const changed = summary.created + summary.updated + summary.removed;
        toast.success("Synced with Navan", {
          description:
            changed === 0
              ? `No travel costs changed (${summary.bookings} bookings read).`
              : `${changed} travel ${changed === 1 ? "cost" : "costs"} updated from ${summary.bookings} bookings.`,
        });
      },
      onError: (err) => toast.error("Couldn't sync with Navan", { description: err.message || "Try again in a few minutes." }),
    });
  return (
    <Button variant="outline" size={size} className="gap-2" onClick={refresh} disabled={sync.isPending}>
      {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {sync.isPending ? "Syncing..." : "Sync with Navan"}
    </Button>
  );
}

/**
 * How fresh the Navan travel costs are: "Navan · updated 2 hours ago", or a clear message when the last sync failed
 * or Navan isn't connected, with the "Sync with Navan" button for people who can edit events.
 * The scheduled sync runs in the background on the server; nothing here waits for Navan when the page loads.
 */
export default function NavanSyncStatus({ showButton = true }: { showButton?: boolean }) {
  const { hasPermission } = useAuth();
  const { data: status, isLoading } = useNavanStatus();
  if (isLoading || !status) return null;

  const canRefresh = showButton && status.configured && hasPermission("INITIATIVES_UPDATE");
  if (!status.configured) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Plane className="h-3.5 w-3.5 shrink-0" />
        Navan isn't connected
      </span>
    );
  }

  // The last attempt failed when it's newer than the last success
  const failed =
    Boolean(status.last_error) &&
    (!status.last_success_at || (status.last_attempt_at !== null && new Date(status.last_attempt_at) > new Date(status.last_success_at)));
  const updated = timeAgo(status.last_success_at);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {failed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex cursor-default items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              Navan sync failed {timeAgo(status.last_attempt_at) ?? ""}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-xs">
            {status.last_error}
            {status.last_success_at ? ` The travel costs shown are from ${fullTime(status.last_success_at)}.` : " No sync has worked yet."}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex cursor-default items-center gap-1.5 text-xs text-muted-foreground">
              <Plane className="h-3.5 w-3.5 shrink-0" />
              {status.mode === "demo" ? "Navan demo data" : "Navan"}
              {updated ? `, updated ${updated}` : status.mode === "demo" ? "" : " hasn't synced yet"}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-xs">
            {status.mode === "demo" ? "Demo mode: made-up bookings for the [Demo] events only. Navan isn't called. " : ""}
            {status.last_success_at ? `Last synced ${fullTime(status.last_success_at)}. ` : ""}
            {status.enabled
              ? "Travel costs update from Navan automatically in the background."
              : "The automatic sync is off; use Sync with Navan to update the travel costs."}
          </TooltipContent>
        </Tooltip>
      )}
      {canRefresh && <RefreshFromNavanButton />}
    </div>
  );
}
