// Every HubSpot campaign that matches the filters, with search, CSV export and pages
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Link2, Paperclip, Search } from "lucide-react";
import { downloadCsv } from "@/components/dashboard/csv";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HubSpotCampaign } from "@/types/hubspot";
import { FUNNEL_STAGES } from "./FunnelTable";
import { assetGroups, assetTotal, brandCode, CURRENCY_SOURCE_LABELS, DASH, fmtCount, fmtMoney, fmtPercent, fmtUnitCost, formatDates, NO_CONTACTS_NOTE, overBudget, STATUS_LABELS, STATUS_PILL, statusKey } from "./hubspotDisplay";

const PAGE_SIZE = 12;

export function StatusPill({ campaign }: { campaign: HubSpotCampaign }) {
  const key = statusKey(campaign);
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_PILL[key]}`}>{STATUS_LABELS[key]}</span>;
}

/** "3 lists, 1 URL": the assets in a few words, with all of them in the tooltip */
function AssetsCell({ campaign }: { campaign: HubSpotCampaign }) {
  const groups = assetGroups(campaign.assets);
  if (groups.length === 0) return <span className="text-muted-foreground">{DASH}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground" title={groups.map((g) => `${g.label}: ${g.count}`).join("\n")}>
      <Paperclip className="h-3.5 w-3.5" />
      <span className="tabular-nums text-foreground">{assetTotal(campaign.assets)}</span>
    </span>
  );
}

/** Cost per new contact; "No contacts" in amber when money was spent and none came */
function PerContactCell({ campaign }: { campaign: HubSpotCampaign }) {
  if (campaign.spend_without_contacts) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400" title={NO_CONTACTS_NOTE}>
        <AlertTriangle className="h-3.5 w-3.5" />
        No contacts
      </span>
    );
  }
  return <>{fmtUnitCost(campaign.cost_per_contact, campaign.currency)}</>;
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function exportRows(rows: HubSpotCampaign[]) {
  downloadCsv(
    "hubspot-campaigns.csv",
    ["Campaign", "Brand", "Status", "Start", "End", "Owner", "Currency", "Currency source", "Budget", "Spend", "Remaining budget", "Budget used (%)", "Sessions", "New contacts (first touch)", "Cost per new contact", "Spend but no new contacts", "New contacts (last touch)", "Influenced contacts", "People on lists", "Leads (first touch)", "MQLs (first touch)", "SQLs (first touch)", "Opportunities (first touch)", "Customers (first touch)", "Assets", "Initiative", "UTM", "HubSpot ID"],
    rows.map((c) => [
      c.name,
      brandCode(c.name),
      STATUS_LABELS[statusKey(c)],
      c.start_date,
      c.end_date,
      c.owner_name,
      c.currency,
      c.currency_source ? CURRENCY_SOURCE_LABELS[c.currency_source] : null,
      c.budget_total,
      c.spend_total,
      c.remaining_budget,
      c.budget_used_pct,
      c.sessions,
      c.new_contacts_first_touch,
      c.cost_per_contact,
      c.spend_without_contacts ? "Yes" : "No",
      c.new_contacts_last_touch,
      c.influenced_contacts,
      c.list_contacts,
      ...FUNNEL_STAGES.map((s) => c.funnel?.first_touch?.[s.key]),
      assetGroups(c.assets).map((g) => `${g.label}: ${g.count}`).join("; "),
      c.initiative_name,
      c.utm,
      c.id,
    ]),
  );
}

interface Props {
  campaigns: HubSpotCampaign[];
  loading: boolean;
  onOpen: (id: string) => void;
}

export default function HubSpotCampaignsTable({ campaigns, loading, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((c) => [c.name, c.owner_name, c.utm, c.initiative_name].some((v) => v?.toLowerCase().includes(q)));
  }, [campaigns, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const first = filtered.length ? current * PAGE_SIZE + 1 : 0;
  const last = Math.min((current + 1) * PAGE_SIZE, filtered.length);

  return (
    <section className={`${DASH_CARD} min-w-0 overflow-hidden`} aria-label="HubSpot campaigns">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Campaigns</h2>
          <p className="text-xs text-muted-foreground">Click a campaign for its report, assets and details.</p>
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
              placeholder="Search name, owner, UTM"
              aria-label="Search campaigns"
              className="h-9 bg-card pl-8"
            />
          </div>
          <Button variant="outline" className="h-9 gap-2 bg-card" onClick={() => exportRows(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            <span className="max-sm:sr-only">Export CSV</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }, (_, n) => (
            <div key={n} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{query ? "No campaigns match your search." : "No campaigns for these filters."}</p>
      ) : (
        <>
          {/* Wide screens: the table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Campaign</th>
                  <th className="px-2 py-2.5 font-medium">Brand</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  <th className="px-2 py-2.5 font-medium">Dates</th>
                  <th className="px-2 py-2.5 font-medium">Owner</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="Total of the campaign's budget items in HubSpot">Budget</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="Total of the campaign's spend items in HubSpot">Spend</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="Budget less spend; negative when over budget">Left</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="Spend as a percent of budget">Used</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="Website sessions attributed to the campaign, to date">Sessions</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="New contacts whose first interaction was this campaign">New contacts</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="Spend divided by new contacts (first touch). Flagged when money was spent and no new contact came.">Per contact</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="Contacts who interacted with any of the campaign's assets">Influenced</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="Contacts first brought in by the campaign who became MQLs (or went further)">MQLs</th>
                  <th className="px-2 py-2.5 text-right font-medium" title="People on the campaign's contact lists, counted once">On lists</th>
                  <th className="px-2 py-2.5 text-right font-medium">Assets</th>
                  <th className="px-4 py-2.5 font-medium">Initiative</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40" onClick={() => onOpen(c.id)}>
                    <td className="max-w-72 px-4 py-3">
                      <button
                        type="button"
                        className="block max-w-full truncate text-left font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(c.id);
                        }}
                        title={c.name}
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3">{brandCode(c.name) ?? <span className="text-muted-foreground">{DASH}</span>}</td>
                    <td className="px-2 py-3">
                      <StatusPill campaign={c} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">{formatDates(c.start_date, c.end_date)}</td>
                    <td className="max-w-36 truncate whitespace-nowrap px-2 py-3">{c.owner_name ?? <span className="text-muted-foreground">{DASH}</span>}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtMoney(c.budget_total, c.currency)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtMoney(c.spend_total, c.currency)}</td>
                    <td className={`whitespace-nowrap px-2 py-3 text-right tabular-nums ${overBudget(c) ? "font-medium text-red-600 dark:text-red-400" : ""}`}>{fmtMoney(c.remaining_budget, c.currency)}</td>
                    <td className={`whitespace-nowrap px-2 py-3 text-right tabular-nums ${overBudget(c) ? "font-medium text-red-600 dark:text-red-400" : ""}`}>{fmtPercent(c.budget_used_pct)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(c.sessions)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(c.new_contacts_first_touch)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">
                      <PerContactCell campaign={c} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(c.influenced_contacts)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(c.funnel?.first_touch?.mql)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{fmtCount(c.list_contacts)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <AssetsCell campaign={c} />
                    </td>
                    <td className="max-w-48 truncate whitespace-nowrap px-4 py-3">
                      {c.initiative_name ?? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Link2 className="h-3.5 w-3.5" />
                          Not linked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones and tablets: cards */}
          <ul className="flex flex-col divide-y divide-border lg:hidden">
            {visible.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onOpen(c.id)} className="w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {brandCode(c.name) && <span className="font-medium text-foreground">{brandCode(c.name)}</span>}
                        <span>{formatDates(c.start_date, c.end_date)}</span>
                        {c.owner_name && <span>{c.owner_name}</span>}
                      </p>
                    </div>
                    <StatusPill campaign={c} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2">
                    <Figure label="Budget" value={fmtMoney(c.budget_total, c.currency)} />
                    <Figure label="Spend" value={fmtMoney(c.spend_total, c.currency)} />
                    <Figure label="Left" value={fmtMoney(c.remaining_budget, c.currency)} />
                    <Figure label="Used" value={fmtPercent(c.budget_used_pct)} />
                    <Figure label="Sessions" value={fmtCount(c.sessions)} />
                    <Figure label="New contacts" value={fmtCount(c.new_contacts_first_touch)} />
                    <Figure label="Per contact" value={<PerContactCell campaign={c} />} />
                    <Figure label="MQLs" value={fmtCount(c.funnel?.first_touch?.mql)} />
                    <Figure label="On lists" value={fmtCount(c.list_contacts)} />
                    <Figure label="Assets" value={assetTotal(c.assets) || DASH} />
                  </dl>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {first}-{last} of {filtered.length} {filtered.length === 1 ? "campaign" : "campaigns"}
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
  );
}
