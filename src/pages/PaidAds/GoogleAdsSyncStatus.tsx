import { CircleAlert, Link2, Loader2, Megaphone, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGoogleAdsStatus, useSyncGoogleAds } from "@/hooks/useGoogleAds";
import { useAuth } from "@/lib/AuthContext";
import type { GoogleAdsSyncSummary } from "@/types/googleAds";
import { timeAgo } from "../Events/NavanSyncStatus";

export const INTEGRATIONS_PATH = "/configurations/integrations?category=PAID_ADS";

const fullTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "2 campaigns added, 5 updated, 84 weekly results written" */
export function describeGoogleAdsRun(summary: GoogleAdsSyncSummary) {
  const written = summary.results_created + summary.results_updated;
  const parts = [
    summary.campaigns_created ? `${plural(summary.campaigns_created, "campaign", "campaigns")} added` : null,
    summary.campaigns_updated ? `${plural(summary.campaigns_updated, "campaign", "campaigns")} updated` : null,
    written ? `${plural(written, "weekly result", "weekly results")} written` : null,
    summary.results_removed ? `${plural(summary.results_removed, "old week", "old weeks")} removed` : null,
  ].filter(Boolean);
  const read = `${plural(summary.accounts - summary.accounts_failed, "account", "accounts")} read`;
  return parts.length ? `${parts.join(", ")} (${read}).` : `Nothing changed (${read}).`;
}

/** The "Sync with Google Ads" button on its own */
export function SyncGoogleAdsButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const sync = useSyncGoogleAds();
  const run = () =>
    sync.mutate(undefined, {
      onSuccess: (summary) => {
        const failed = summary.account_runs.filter((r) => r.error);
        if (failed.length) {
          toast.warning("Synced with Google Ads, with problems", {
            description: `${describeGoogleAdsRun(summary)} Couldn't read ${failed.map((r) => r.account_name ?? r.account_id).join(", ")}.`,
          });
        } else {
          toast.success("Synced with Google Ads", { description: describeGoogleAdsRun(summary) });
        }
      },
      onError: (err) => toast.error("Couldn't sync with Google Ads", { description: err.message || "Try again in a few minutes." }),
    });
  return (
    <Button variant="outline" size={size} className="gap-2" onClick={run} disabled={sync.isPending}>
      {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {sync.isPending ? "Syncing..." : "Sync with Google Ads"}
    </Button>
  );
}

/**
 * How fresh the Google Ads campaigns and results are: "Google Ads (mock data), updated 2 hours ago", or a clear
 * message when the last sync failed or Google Ads isn't connected, with the "Sync with Google Ads" button for people
 * who can edit campaigns. The scheduled sync runs on the server; nothing here waits for Google when the page loads.
 */
export default function GoogleAdsSyncStatus({ showButton = true }: { showButton?: boolean }) {
  const { hasPermission, canAccessNavigationItem } = useAuth();
  const { data: status, isLoading } = useGoogleAdsStatus();
  if (isLoading || !status) return null;

  const mock = status.mode === "mock";
  const accounts = status.connected_accounts.filter((a) => !a.is_manager);
  const canConnect = canAccessNavigationItem("CONFIG_ROLES");
  const label = mock ? "Google Ads (mock data)" : "Google Ads";

  if (!status.configured || accounts.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Megaphone className="h-3.5 w-3.5 shrink-0" />
          {!status.configured ? "Google Ads isn't set up" : "Google Ads isn't connected"}
        </span>
        {status.configured && canConnect && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to={INTEGRATIONS_PATH}>
              <Link2 className="h-4 w-4" />
              Connect Google Ads
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // The last attempt failed when it's newer than the last success
  const failed =
    Boolean(status.last_error) &&
    (!status.last_success_at || (status.last_attempt_at !== null && new Date(status.last_attempt_at) > new Date(status.last_success_at)));
  const updated = timeAgo(status.last_success_at);
  const canSync = showButton && hasPermission("INITIATIVES_UPDATE");
  const accountNames = accounts.map((a) => a.account_name ?? a.account_id).join(", ");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {failed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex cursor-default items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              {label} sync failed {timeAgo(status.last_attempt_at) ?? ""}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-xs">
            {status.last_error}
            {status.last_success_at ? ` The results shown are from ${fullTime(status.last_success_at)}.` : " No sync has worked yet."}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex cursor-default items-center gap-1.5 text-xs text-muted-foreground">
              {status.last_error ? <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" /> : <Megaphone className="h-3.5 w-3.5 shrink-0" />}
              {label}
              {updated ? `, updated ${updated}` : " hasn't synced yet"}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-xs">
            {mock ? "Mock mode: made-up campaigns and results for the mock accounts. Google isn't called. " : ""}
            {`Accounts: ${accountNames}. `}
            {status.last_success_at ? `Last synced ${fullTime(status.last_success_at)}. ` : ""}
            {status.last_error ? `${status.last_error} ` : ""}
            {status.enabled
              ? "Campaigns and results update from Google Ads automatically in the background."
              : "The automatic sync is off; use Sync with Google Ads to update the campaigns and results."}
          </TooltipContent>
        </Tooltip>
      )}
      {canSync && <SyncGoogleAdsButton />}
    </div>
  );
}
