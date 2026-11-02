// Every social post HubSpot has on the connected accounts, with search, filters, CSV export and pages
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, MousePointerClick, Search, Send, Share2 } from "lucide-react";
import { downloadCsv } from "@/components/dashboard/csv";
import { FilterBar, FilterSelect } from "@/components/dashboard/FilterBar";
import KpiCard, { KpiGrid } from "@/components/dashboard/KpiCard";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHubSpotSocialPosts } from "@/hooks/useHubSpot";
import type { HubSpotSocialPost } from "@/types/hubspot";
import { DASH, fmtCount, formatDay, isPublished, platformLabel, postStatusLabel } from "./hubspotDisplay";

const PAGE_SIZE = 12;
const ANY = "all";
const PUBLISHED = "published";

/** When the post went out, else when it's set to */
const postDate = (p: HubSpotSocialPost) => p.finished_at ?? p.scheduled_at ?? p.hubspot_created_at;

const PILL: Record<string, string> = {
  Published: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  Draft: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  Cancelled: "border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

function StatusPill({ post }: { post: HubSpotSocialPost }) {
  const label = postStatusLabel(post.status);
  const style = PILL[label] ?? (isPublished(post.status) ? PILL.Published : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300");
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}

function exportRows(rows: HubSpotSocialPost[]) {
  downloadCsv(
    "hubspot-social-posts.csv",
    ["Platform", "Account", "Status", "Date", "Post", "Media", "Campaign", "Clicks", "Likes", "Replies", "Shares", "Interactions", "HubSpot ID"],
    rows.map((p) => [
      platformLabel(p.platform),
      p.channel_name ?? p.channel_key,
      postStatusLabel(p.status),
      postDate(p),
      p.message,
      p.media_type,
      p.campaign_name,
      p.clicks,
      p.likes,
      p.replies,
      p.shares,
      p.interactions,
      p.id,
    ]),
  );
}

export default function HubSpotSocialPosts() {
  const { data: posts = [], isLoading, error, refetch } = useHubSpotSocialPosts();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState(ANY);
  const [state, setState] = useState(ANY);
  const [page, setPage] = useState(0);

  const platformOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) counts.set(p.platform, (counts.get(p.platform) ?? 0) + 1);
    return [
      { value: ANY, label: "All platforms" },
      ...[...counts.keys()].sort().map((k) => ({ value: k, label: `${platformLabel(k)} (${counts.get(k)})` })),
    ];
  }, [posts]);

  const stateOptions = useMemo(() => {
    const present = new Set(posts.map((p) => postStatusLabel(p.status)));
    return [{ value: ANY, label: "All statuses" }, ...(posts.some((p) => isPublished(p.status)) ? [{ value: PUBLISHED, label: "Published" }] : []), ...[...present].filter((l) => !l.startsWith("Published")).sort().map((l) => ({ value: l, label: l }))];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (platform === ANY || p.platform === platform) &&
        (state === ANY || (state === PUBLISHED ? isPublished(p.status) : postStatusLabel(p.status) === state)) &&
        (!q || [p.message, p.channel_name, p.campaign_name].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [posts, query, platform, state]);

  const published = filtered.filter((p) => isPublished(p.status));
  const clicks = published.reduce((sum, p) => sum + (p.clicks ?? 0), 0);
  const accounts = new Set(filtered.map((p) => p.channel_key)).size;
  // HubSpot gives clicks for these posts; the other counters only show once it reports any
  const engagement = posts.some((p) => (p.likes ?? 0) + (p.replies ?? 0) + (p.shares ?? 0) + (p.interactions ?? 0) > 0);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const first = filtered.length ? current * PAGE_SIZE + 1 : 0;
  const last = Math.min((current + 1) * PAGE_SIZE, filtered.length);
  const filtersOn = platform !== ANY || state !== ANY;

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
        <p className="text-sm text-red-800 dark:text-red-300">{error.message || "Could not load the social posts."}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <section aria-label="Social key figures">
        <KpiGrid>
          <KpiCard label="Posts" icon={Share2} tone="orange" info="Social posts that match the filters, including drafts and cancelled ones." value={fmtCount(filtered.length)} caption={`${accounts} ${accounts === 1 ? "account" : "accounts"}`} loading={isLoading} />
          <KpiCard label="Published" icon={Send} tone="green" info="Posts that went out." value={fmtCount(published.length)} caption={`${fmtCount(filtered.filter((p) => p.status === "DRAFT").length)} drafts`} loading={isLoading} />
          <KpiCard label="Clicks" icon={MousePointerClick} tone="blue" info="Clicks on the published posts, to date." value={fmtCount(clicks)} caption={published.length ? `${(clicks / published.length).toLocaleString(undefined, { maximumFractionDigits: 1 })} per post` : undefined} loading={isLoading} />
        </KpiGrid>
      </section>

      <FilterBar onClear={filtersOn ? () => { setPlatform(ANY); setState(ANY); setPage(0); } : undefined}>
        <FilterSelect label="Platform" value={platform} onChange={(v) => { setPlatform(v); setPage(0); }} options={platformOptions} />
        <FilterSelect label="Status" value={state} onChange={(v) => { setState(v); setPage(0); }} options={stateOptions} />
      </FilterBar>

      <section className={`${DASH_CARD} min-w-0 overflow-hidden`} aria-label="HubSpot social posts">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Social posts</h2>
            <p className="text-xs text-muted-foreground">Organic posts on the connected accounts, as HubSpot has them. Paid social ads are not in HubSpot.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search post, account, campaign"
                aria-label="Search social posts"
                className="h-9 bg-card pl-8"
              />
            </div>
            <Button variant="outline" className="h-9 gap-2 bg-card" onClick={() => exportRows(filtered)} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" />
              <span className="max-sm:sr-only">Export CSV</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }, (_, n) => (
              <div key={n} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {posts.length === 0 ? "No social posts yet. Run a HubSpot sync to read them." : "No posts match your filters."}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Post</th>
                    <th className="px-2 py-2.5 font-medium">Platform</th>
                    <th className="px-2 py-2.5 font-medium">Account</th>
                    <th className="px-2 py-2.5 font-medium">Status</th>
                    <th className="px-2 py-2.5 font-medium">Date</th>
                    <th className="px-2 py-2.5 text-right font-medium" title="Clicks, to date">Clicks</th>
                    {engagement && <th className="px-2 py-2.5 text-right font-medium">Likes</th>}
                    {engagement && <th className="px-2 py-2.5 text-right font-medium">Replies</th>}
                    {engagement && <th className="px-2 py-2.5 text-right font-medium">Shares</th>}
                    <th className="px-4 py-2.5 font-medium">Campaign</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-b-0">
                      <td className="max-w-80 px-4 py-3">
                        <p className="line-clamp-2 text-foreground" title={p.message ?? undefined}>{p.message || <span className="text-muted-foreground">No text{p.media_type ? ` (${p.media_type.toLowerCase()})` : ""}</span>}</p>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">{platformLabel(p.platform)}</td>
                      <td className="max-w-40 truncate whitespace-nowrap px-2 py-3" title={p.channel_key}>{p.channel_name ?? <span className="text-muted-foreground">Not connected</span>}</td>
                      <td className="px-2 py-3"><StatusPill post={p} /></td>
                      <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">{postDate(p) ? formatDay(postDate(p)) : DASH}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(p.clicks)}</td>
                      {engagement && <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(p.likes)}</td>}
                      {engagement && <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(p.replies)}</td>}
                      {engagement && <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(p.shares)}</td>}
                      <td className="max-w-56 truncate whitespace-nowrap px-4 py-3">
                        {p.campaign_id && p.campaign_name ? (
                          <Link to={`/hubspot-campaigns?campaign=${p.campaign_id}`} className="text-primary hover:underline" title={p.campaign_name}>{p.campaign_name}</Link>
                        ) : (
                          <span className="text-muted-foreground">{DASH}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col divide-y divide-border lg:hidden">
              {visible.map((p) => (
                <li key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{platformLabel(p.platform)}</span>
                      {p.channel_name ? `, ${p.channel_name}` : ""} · {postDate(p) ? formatDay(postDate(p)) : DASH}
                    </p>
                    <StatusPill post={p} />
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-sm text-foreground">{p.message || `No text${p.media_type ? ` (${p.media_type.toLowerCase()})` : ""}`}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {fmtCount(p.clicks)} clicks{p.campaign_name ? ` · ${p.campaign_name}` : ""}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {first}-{last} of {filtered.length} {filtered.length === 1 ? "post" : "posts"}
              </span>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
                    <ChevronLeft />
                  </Button>
                  <span className="px-2 tabular-nums">
                    Page {current + 1} of {pages}
                  </span>
                  <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
