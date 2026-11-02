// Everything the sync read about one HubSpot campaign: properties, report figures, assets and the linked initiative
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Link2, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { HubSpotCampaign } from "@/types/hubspot";
import { assetGroups, brandCode, CURRENCY_SOURCE_LABELS, DASH, fmtCount, fmtMoney, fmtPercent, fmtUnitCost, formatDates, formatDay, NO_CONTACTS_NOTE, overBudget, STATUS_LABELS, statusKey } from "./hubspotDisplay";
import FunnelTable from "./FunnelTable";
import { StatusPill } from "./HubSpotCampaignsTable";

function Figure({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-3">
      <dt className="truncate text-xs text-muted-foreground" title={hint}>
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

export default function HubSpotCampaignPanel({ campaign, onClose }: { campaign: HubSpotCampaign | null; onClose: () => void }) {
  const c = campaign;
  const groups = c ? assetGroups(c.assets) : [];

  return (
    <Sheet open={Boolean(c)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {c && (
          <>
            <SheetHeader className="gap-2 border-b border-border p-4 pr-12">
              <SheetTitle className="text-lg leading-snug">{c.name}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusPill campaign={c} />
                {brandCode(c.name) && <span className="font-medium text-foreground">{brandCode(c.name)}</span>}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDates(c.start_date, c.end_date)}
                </span>
                {c.owner_name && (
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="h-3.5 w-3.5" />
                    {c.owner_name}
                  </span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-4">
              {c.initiative_id && (
                <Link
                  to={`/initiatives/${c.initiative_id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm hover:bg-muted/60"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">Linked initiative</span>
                    <span className="block truncate font-medium text-foreground">{c.initiative_name}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              )}

              <section aria-labelledby="hs-money">
                <h3 id="hs-money" className="mb-2 text-sm font-semibold text-foreground">
                  Budget and spend in HubSpot
                </h3>
                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <Figure label="Budget" value={fmtMoney(c.budget_total, c.currency)} hint="Total of the campaign's budget items in HubSpot" />
                  <Figure label="Spend" value={fmtMoney(c.spend_total, c.currency)} hint="Total of the campaign's spend items in HubSpot" />
                  <Figure label="Left of budget" value={fmtMoney(c.remaining_budget, c.currency)} hint="Budget less spend; negative when over budget" />
                  <Figure label="Of budget spent" value={fmtPercent(c.budget_used_pct)} hint="Spend as a percent of budget" />
                  <Figure label="Cost per new contact" value={c.spend_without_contacts ? "No contacts" : fmtUnitCost(c.cost_per_contact, c.currency)} hint="Spend divided by new contacts (first touch)" />
                </dl>
                {c.spend_without_contacts && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">{NO_CONTACTS_NOTE}</p>}
                {overBudget(c) && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">Spend is over the budget set in HubSpot.</p>}
                {c.currency_source && c.currency_source !== "HUBSPOT" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    HubSpot has no currency for this campaign, so {c.currency} is used ({CURRENCY_SOURCE_LABELS[c.currency_source].toLowerCase()}).
                  </p>
                )}
                {c.budget_total === null && c.spend_total === null && (
                  <p className="mt-2 text-xs text-muted-foreground">No budget or spend items are recorded on this campaign in HubSpot.</p>
                )}
              </section>

              <section aria-labelledby="hs-report">
                <h3 id="hs-report" className="mb-2 text-sm font-semibold text-foreground">
                  Campaign report, to date
                </h3>
                <dl className="grid grid-cols-2 gap-2.5">
                  <Figure label="Sessions" value={fmtCount(c.sessions)} hint="Website sessions HubSpot attributes to the campaign" />
                  <Figure label="Influenced contacts" value={fmtCount(c.influenced_contacts)} hint="Contacts who interacted with any of the campaign's assets" />
                  <Figure label="New contacts, first touch" value={fmtCount(c.new_contacts_first_touch)} hint="New contacts whose first interaction was this campaign" />
                  <Figure label="New contacts, last touch" value={fmtCount(c.new_contacts_last_touch)} hint="New contacts whose last interaction before converting was this campaign" />
                </dl>
              </section>

              <section aria-labelledby="hs-funnel">
                <h3 id="hs-funnel" className="mb-2 text-sm font-semibold text-foreground">
                  Funnel
                </h3>
                <dl className="mb-2.5 grid grid-cols-2 gap-2.5">
                  <Figure
                    label="People on its lists"
                    value={fmtCount(c.list_contacts)}
                    hint="Everyone on the campaign's contact lists, counted once. For events these are usually the lead lists."
                  />
                  <Figure label="MQLs, first touch" value={fmtCount(c.funnel?.first_touch?.mql)} hint="Contacts first brought in by this campaign who became MQLs" />
                </dl>
                <FunnelTable
                  columns={[
                    { label: "First touch", note: "default", funnel: c.funnel?.first_touch },
                    { label: "Last touch", funnel: c.funnel?.last_touch },
                    { label: "On its lists", funnel: c.funnel?.lists },
                  ]}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  A contact counts at every stage it has reached, so a customer is also counted as a lead, MQL, SQL and opportunity.
                </p>
              </section>

              <section aria-labelledby="hs-assets">
                <h3 id="hs-assets" className="mb-2 text-sm font-semibold text-foreground">
                  Assets in this campaign
                </h3>
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assets are attached to this campaign in HubSpot.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {groups.map((g) => (
                      <li key={g.type} className="rounded-lg border border-border">
                        <p className="flex items-center justify-between border-b border-border px-3 py-2 text-sm font-medium">
                          {g.label}
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{g.count}</span>
                        </p>
                        {g.items ? (
                          <ul className="divide-y divide-border text-sm">
                            {g.items.map((a) => (
                              <li key={a.id} className="truncate px-3 py-1.5" title={a.name ?? a.id}>
                                {a.name || <span className="text-muted-foreground">Unnamed ({a.id})</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Counted only. Who was in them stays in HubSpot.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="hs-details">
                <h3 id="hs-details" className="mb-1 text-sm font-semibold text-foreground">
                  Details
                </h3>
                <dl className="divide-y divide-border">
                  <Row label="Status">{STATUS_LABELS[statusKey(c)]}</Row>
                  <Row label="Start date">{formatDay(c.start_date)}</Row>
                  <Row label="End date">{formatDay(c.end_date)}</Row>
                  <Row label="Currency">
                    {c.currency ?? DASH}
                    {c.currency_source && <span className="ml-2 text-xs text-muted-foreground">{CURRENCY_SOURCE_LABELS[c.currency_source]}</span>}
                  </Row>
                  <Row label="Owner">{c.owner_name ?? DASH}</Row>
                  <Row label="UTM campaign">{c.utm ? <code className="break-all text-xs">{c.utm}</code> : DASH}</Row>
                  {c.audience && <Row label="Audience">{c.audience}</Row>}
                  {c.notes && <Row label="Notes">{c.notes}</Row>}
                  <Row label="Initiative">
                    {c.initiative_id ? (
                      <Link to={`/initiatives/${c.initiative_id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        {c.initiative_name}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5" />
                        Not linked to an initiative
                      </span>
                    )}
                  </Row>
                  <Row label="Created in HubSpot">{c.hubspot_created_at ? formatDay(c.hubspot_created_at) : DASH}</Row>
                  <Row label="Changed in HubSpot">{c.hubspot_updated_at ? formatDay(c.hubspot_updated_at) : DASH}</Row>
                  <Row label="HubSpot ID">
                    <code className="break-all text-xs">{c.id}</code>
                  </Row>
                </dl>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
