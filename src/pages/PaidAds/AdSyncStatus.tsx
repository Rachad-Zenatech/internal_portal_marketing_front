import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Link2, Loader2, Megaphone, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdSyncStatus, useAdSyncStatuses, useSyncAdPlatform } from "@/hooks/useAdSync";
import { useAuth } from "@/lib/AuthContext";
import { AD_SYNC_PLATFORMS, AD_SYNC_PROVIDERS, syncAdPlatform } from "@/services/adSyncService";
import { queryKeys } from "@/services/queryKeys";
import type { AdSyncProvider, AdSyncStatus, AdSyncSummary } from "@/types/adSync";
import { timeAgo } from "../Events/NavanSyncStatus";

export const INTEGRATIONS_PATH = "/configurations/integrations?category=PAID_ADS";

const fullTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const joinNames = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "");

/** The last attempt failed when it's newer than the last success */
export function syncFailed(status: AdSyncStatus) {
  return (
    Boolean(status.last_error) &&
    (!status.last_success_at || (status.last_attempt_at !== null && new Date(status.last_attempt_at) > new Date(status.last_success_at)))
  );
}

/** "2 campaigns added, 5 updated, 84 weekly results written" */
export function describeAdSyncRun(summary: AdSyncSummary) {
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

function toastSyncResult(label: string, summary: AdSyncSummary) {
  const failed = summary.account_runs.filter((r) => r.error);
  if (failed.length) {
    toast.warning(`Synced with ${label}, with problems`, {
      description: `${describeAdSyncRun(summary)} Couldn't read ${failed.map((r) => r.account_name ?? r.account_id).join(", ")}.`,
    });
  } else {
    toast.success(`Synced with ${label}`, { description: describeAdSyncRun(summary) });
  }
}

const toastSyncError = (label: string, err: Error) =>
  toast.error(`Couldn't sync with ${label}`, { description: err.message || "Try again in a few minutes." });

/** The sync button on its own (on the platform's card in Integrations) */
export function SyncAdPlatformButton({
  provider,
  size = "sm",
  className = "gap-2",
  label,
}: {
  provider: AdSyncProvider;
  size?: "sm" | "default";
  className?: string;
  label?: string;
}) {
  const name = AD_SYNC_PLATFORMS[provider].label;
  const sync = useSyncAdPlatform(provider);
  const run = () =>
    sync.mutate(undefined, {
      onSuccess: (summary) => toastSyncResult(name, summary),
      onError: (err) => toastSyncError(name, err),
    });
  return (
    <Button variant="outline" size={size} className={className} onClick={run} disabled={sync.isPending}>
      {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      {sync.isPending ? "Syncing..." : label ?? `Sync with ${name}`}
    </Button>
  );
}

/** After connecting a platform: a toast suggesting to sync it now (for people who can sync) */
export function useSuggestAdSync(canSync: boolean) {
  const queryClient = useQueryClient();
  return (provider: AdSyncProvider) => {
    const name = AD_SYNC_PLATFORMS[provider].label;
    queryClient.invalidateQueries({ queryKey: queryKeys.adSyncStatus(provider) });
    if (!canSync) return;
    toast(`${name} is connected`, {
      description: "Sync now to bring in its campaigns and weekly results.",
      duration: 15000,
      action: {
        label: "Sync now",
        onClick: () =>
          syncAdPlatform(provider)
            .then((summary) => toastSyncResult(name, summary))
            .catch((err: Error) => toastSyncError(name, err))
            .finally(() => queryClient.invalidateQueries()),
      },
    });
  };
}

/** "Mock" or "Live" next to the platform's name on its Integrations card */
export function AdSyncModeBadge({ provider, enabled = true }: { provider: AdSyncProvider; enabled?: boolean }) {
  const { data: status } = useAdSyncStatus(provider, enabled);
  if (!status) return null;
  const { label, envPrefix, signIn } = AD_SYNC_PLATFORMS[provider];
  const title =
    status.mode === "mock"
      ? `Mock mode: connecting uses fake sign-in and made-up accounts, and the sync makes up campaigns and results. ${signIn} is not called.`
      : status.configured
        ? `Live mode: real ${signIn} sign-in and the ${label} API.`
        : `Live mode, but ${label} isn't set up: add ${envPrefix}_CLIENT_ID and ${envPrefix}_CLIENT_SECRET.`;
  return (
    <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-medium text-muted-foreground" title={title}>
      {status.mode === "mock" ? "Mock" : "Live"}
    </Badge>
  );
}

/** "Synced 2 hours ago" (red when the last sync failed) for the platform's card in Integrations */
export function AdPlatformLastSynced({ provider }: { provider: AdSyncProvider }) {
  const { data: status } = useAdSyncStatus(provider);
  if (!status) return null;
  if (syncFailed(status)) {
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

/**
 * One quiet line on Paid Advertising saying how fresh the data of the connected ad platforms is: "Ad data updated
 * 2 hours ago" (the oldest of them), in red when a platform's last sync failed. Syncing itself is on each platform's
 * card in Integrations, so this page gets no sync buttons; for people who manage connections the line links there.
 */
export default function AdDataStatus() {
  const { canAccessNavigationItem } = useAuth();
  const queries = useAdSyncStatuses();
  if (queries.some((q) => q.isLoading)) return null;

  const canManage = canAccessNavigationItem("CONFIG_ROLES");
  // The platforms that are set up and have an account the sync reads
  const connected = AD_SYNC_PROVIDERS.flatMap((provider, i) => {
    const status = queries[i].data;
    const accounts = status?.connected_accounts.filter((a) => !a.is_manager) ?? [];
    return status && status.configured && accounts.length ? [{ provider, label: AD_SYNC_PLATFORMS[provider].label, status, accounts }] : [];
  });

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

  if (!connected.length) {
    if (!canManage) return null;
    return line(
      <>
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        Connect ad platforms
      </>,
      muted,
    );
  }

  const failed = connected.filter((p) => syncFailed(p.status));
  const neverSynced = connected.filter((p) => !p.status.last_success_at);
  const successes = connected.map((p) => p.status.last_success_at).filter((t): t is string => !!t);
  const oldest = neverSynced.length ? null : successes.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
  const latestFailure = failed
    .map((p) => p.status.last_attempt_at)
    .filter((t): t is string => !!t)
    .sort()
    .pop();
  const mock = connected.some((p) => p.status.mode === "mock");
  const partial = connected.some((p) => p.status.last_error && !syncFailed(p.status));

  const content = failed.length
    ? line(
        <>
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {joinNames(failed.map((p) => p.label))} sync failed {timeAgo(latestFailure) ?? ""}
        </>,
        "inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400",
      )
    : line(
        <>
          {partial ? <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" /> : <Megaphone className="h-3.5 w-3.5 shrink-0" />}
          {oldest ? `Ad data updated ${timeAgo(oldest)}` : `${joinNames(neverSynced.map((p) => p.label))} ${neverSynced.length > 1 ? "haven't" : "hasn't"} synced yet`}
          {mock ? " (mock data)" : ""}
        </>,
        muted,
      );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-80 space-y-1.5 text-xs">
        {connected.map(({ provider, label, status, accounts }) => {
          const failedHere = syncFailed(status);
          return (
            <p key={provider}>
              <span className="font-semibold">
                {label}
                {status.mode === "mock" ? " (mock data)" : ""}:
              </span>{" "}
              {accounts.map((a) => a.account_name ?? a.account_id).join(", ")}.{" "}
              {failedHere
                ? `${status.last_error ?? "The last sync failed."} ${status.last_success_at ? `Last worked ${fullTime(status.last_success_at)}.` : "No sync has worked yet."}`
                : status.last_success_at
                  ? `Last synced ${fullTime(status.last_success_at)}.${status.last_error ? ` ${status.last_error}` : ""}`
                  : "Not synced yet."}{" "}
              {status.enabled ? "Updates automatically." : "The automatic sync is off."}
            </p>
          );
        })}
        {mock && <p>Mock data is made up for the mock accounts; the platforms aren't called.</p>}
        {canManage && <p>Click to open Integrations, where you can sync now.</p>}
      </TooltipContent>
    </Tooltip>
  );
}
