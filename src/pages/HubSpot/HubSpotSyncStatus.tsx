import { CircleAlert, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHubSpotStatus, useStartHubSpotSync } from "@/hooks/useHubSpot";
import { useAuth } from "@/lib/AuthContext";
import { timeAgo } from "../Events/NavanSyncStatus";

const fullTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "6 hours", "1 hour", "30 minutes" */
function every(minutes: number) {
  if (minutes < 60 || minutes % 60 !== 0) return `${minutes} minutes`;
  const hours = minutes / 60;
  return hours === 1 ? "hour" : `${hours} hours`;
}

/**
 * How fresh the HubSpot campaigns are: "HubSpot, updated 2 hours ago", "Syncing with HubSpot..." while a sync runs,
 * or a clear message when the last sync failed or HubSpot isn't set up, with "Sync with HubSpot" for people who can
 * edit initiatives. A sync reads every campaign's report and assets, which takes a few minutes; it runs on the server.
 */
export default function HubSpotSyncStatus() {
  const { hasPermission } = useAuth();
  const { data: status, isLoading } = useHubSpotStatus();
  const start = useStartHubSpotSync();
  if (isLoading || !status) return null;

  if (!status.configured) {
    return <span className="text-xs text-muted-foreground">HubSpot isn't set up (HUBSPOT_API_KEY)</span>;
  }

  const running = status.running || start.isPending;
  // The last attempt failed when it's newer than the last success
  const failed =
    Boolean(status.last_error) &&
    (!status.last_success_at || (status.last_attempt_at !== null && new Date(status.last_attempt_at) > new Date(status.last_success_at)));
  const updated = timeAgo(status.last_success_at);
  const canSync = hasPermission("INITIATIVES_UPDATE");

  const sync = () =>
    start.mutate(undefined, {
      onSuccess: () => toast.success("Syncing with HubSpot", { description: "Reading every campaign takes a few minutes. The page updates when it's done." }),
      onError: (err) => toast.error("Couldn't start the HubSpot sync", { description: err.message || "Try again in a few minutes." }),
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {running ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          Syncing with HubSpot, this takes a few minutes
        </span>
      ) : failed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex cursor-default items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              HubSpot sync failed {timeAgo(status.last_attempt_at) ?? ""}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-xs">
            {status.last_error}
            {status.last_success_at ? ` The campaigns shown are from ${fullTime(status.last_success_at)}.` : " No sync has worked yet."}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex cursor-default items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#ff7a59]" aria-hidden="true" />
              HubSpot{updated ? `, updated ${updated}` : " hasn't synced yet"}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-xs">
            {status.last_success_at ? `Last synced ${fullTime(status.last_success_at)}. ` : ""}
            {status.enabled
              ? `Campaigns update from HubSpot automatically every ${every(status.interval_minutes)}.`
              : "The automatic sync is off; use Sync with HubSpot to update the campaigns."}
            {status.last_run_summary?.without_budget
              ? ` ${status.last_run_summary.without_budget} of ${status.last_run_summary.campaigns} campaigns have no budget in HubSpot.`
              : ""}
          </TooltipContent>
        </Tooltip>
      )}
      {canSync && (
        <Button variant="outline" size="sm" className="gap-2" onClick={sync} disabled={running}>
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Syncing..." : "Sync with HubSpot"}
        </Button>
      )}
    </div>
  );
}
