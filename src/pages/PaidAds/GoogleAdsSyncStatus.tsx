import type { ReactNode } from "react";
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

/** The sync button on its own (on the Google Ads card in Integrations) */
export function SyncGoogleAdsButton({
  size = "sm",
  className = "gap-2",
  label = "Sync with Google Ads",
}: {
  size?: "sm" | "default";
  className?: string;
  label?: string;
}) {
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
    <Button variant="outline" size={size} className={className} onClick={run} disabled={sync.isPending}>
      {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      {sync.isPending ? "Syncing..." : label}
    </Button>
  );
}

/**
 * A quiet line on Paid Advertising saying how fresh the Google Ads data is: "Google Ads data updated 2 hours ago",
 * in red when the last sync failed. Syncing itself is on the Google Ads card in Integrations (one place per
 * platform), so this page gets no sync buttons; for people who manage connections the line links there.
 */
export default function GoogleAdsSyncStatus() {
  const { canAccessNavigationItem } = useAuth();
  const { data: status, isLoading } = useGoogleAdsStatus();
  if (isLoading || !status) return null;

  const mock = status.mode === "mock";
  const accounts = status.connected_accounts.filter((a) => !a.is_manager);
  const canManage = canAccessNavigationItem("CONFIG_ROLES");

  // Clickable to Integrations for people who can manage connections, plain text for everyone else
  const line = (content: ReactNode, className: string) =>
    canManage ? (
      <Link to={INTEGRATIONS_PATH} className={`${className} hover:underline`}>
        {content}
      </Link>
    ) : (
      <span tabIndex={0} className={`${className} cursor-default`}>
        {content}
      </span>
    );
  const muted = "inline-flex items-center gap-1.5 text-xs text-muted-foreground";

  if (!status.configured || accounts.length === 0) {
    if (!status.configured) return <span className={muted}><Megaphone className="h-3.5 w-3.5 shrink-0" />Google Ads isn't set up</span>;
    return line(
      <>
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        Connect Google Ads
      </>,
      muted,
    );
  }

  // The last attempt failed when it's newer than the last success
  const failed =
    Boolean(status.last_error) &&
    (!status.last_success_at || (status.last_attempt_at !== null && new Date(status.last_attempt_at) > new Date(status.last_success_at)));
  const updated = timeAgo(status.last_success_at);
  const accountNames = accounts.map((a) => a.account_name ?? a.account_id).join(", ");
  const where = canManage ? " Click to open the Google Ads card in Integrations, where you can sync now." : "";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {failed
          ? line(
              <>
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                Google Ads sync failed {timeAgo(status.last_attempt_at) ?? ""}
              </>,
              "inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400",
            )
          : line(
              <>
                {status.last_error ? <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" /> : <Megaphone className="h-3.5 w-3.5 shrink-0" />}
                {updated ? `Google Ads data updated ${updated}` : "Google Ads hasn't synced yet"}
                {mock ? " (mock data)" : ""}
              </>,
              muted,
            )}
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-xs">
        {failed && status.last_error ? `${status.last_error} ` : ""}
        {failed ? (status.last_success_at ? `The results shown are from ${fullTime(status.last_success_at)}. ` : "No sync has worked yet. ") : ""}
        {mock ? "Mock mode: made-up campaigns and results for the mock accounts. Google isn't called. " : ""}
        {`Accounts: ${accountNames}. `}
        {!failed && status.last_success_at ? `Last synced ${fullTime(status.last_success_at)}. ` : ""}
        {!failed && status.last_error ? `${status.last_error} ` : ""}
        {status.enabled ? "Updates automatically in the background." : "The automatic sync is off."}
        {where}
      </TooltipContent>
    </Tooltip>
  );
}

/** "Synced 2 hours ago" (red when the last sync failed) for the Google Ads card in Integrations */
export function GoogleAdsLastSynced() {
  const { data: status } = useGoogleAdsStatus();
  if (!status) return null;
  const failed =
    Boolean(status.last_error) &&
    (!status.last_success_at || (status.last_attempt_at !== null && new Date(status.last_attempt_at) > new Date(status.last_success_at)));
  if (failed) {
    return (
      <span className="font-medium text-red-600 dark:text-red-400" title={status.last_error ?? undefined}>
        Failed {timeAgo(status.last_attempt_at) ?? ""}
      </span>
    );
  }
  const updated = timeAgo(status.last_success_at);
  return (
    <span className="text-muted-foreground" title={status.last_success_at ? fullTime(status.last_success_at) : undefined}>
      {updated ? `Synced ${updated}` : "Not synced yet"}
      {status.enabled ? ", updates automatically" : ""}
    </span>
  );
}
