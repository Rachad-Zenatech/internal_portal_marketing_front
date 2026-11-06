// One Navan event in full, in a side panel opened from the list: money, travel, the HubSpot results matched to it,
// who attended, and the HubSpot campaign / marketing event it's linked to (changeable)
import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Link2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventOverviewDetail, useHubSpotOptions, useNavanTripOptions, useSetEventHubSpotLink, useSetNavanTripLink } from "@/hooks/useEventsOverview";
import { useAuth } from "@/lib/AuthContext";
import type { EventOverviewDetail, HubSpotOption } from "@/types/eventsOverview";
import { DASH, fmtCount, fmtMoney, fmtUnitCost } from "../PaidAds/adsDisplay";
import { UsageBar } from "../PaidAds/AdsPieces";
import { leadsBasis } from "./EventsList";
import { formatDay } from "../PaidAds/overviewDisplay";
import EventDataDialog from "./EventDataDialog";
import { COST_CATEGORIES, COST_CATEGORY_COLORS, COST_CATEGORY_LABELS, displayStatus, eventRegion, STATUS_PILL, statusLabel } from "./eventPerformanceDisplay";

const NONE = "__none__";
const STATE_LABELS: Record<string, string> = { ATTENDED: "Attended", REGISTERED: "Registered", CANCELLED: "Cancelled", NO_SHOW: "No-show" };
const ASSET_LABELS: Record<string, string> = {
  MARKETING_EMAIL: "Marketing emails", LANDING_PAGE: "Landing pages", SITE_PAGE: "Site pages", BLOG_POST: "Blog posts", FORM: "Forms", CTA: "CTAs",
  MARKETING_EVENT: "Marketing events", OBJECT_LIST: "Contact lists", SEQUENCE: "Sequences", EXTERNAL_WEB_URL: "Links", MEETING_EVENT: "Meetings",
  SOCIAL_BROADCAST: "Social posts", AD_CAMPAIGN: "Ad campaigns",
};

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Figure({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={`truncate text-base font-semibold tabular-nums text-foreground ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

const optionLabel = (o: HubSpotOption) => `${o.name}${o.starts_on ? ` (${o.starts_on.slice(0, 4)})` : ""}`;

/** Pick the event's HubSpot campaign and marketing event, mark it as having none, or go back to the name match */
function HubSpotLinkEditor({ event, onDone }: { event: EventOverviewDetail; onDone: () => void }) {
  const options = useHubSpotOptions(true);
  const save = useSetEventHubSpotLink(event.id);
  const [campaign, setCampaign] = useState(event.hubspot.campaign?.id ?? NONE);
  const [marketingEvent, setMarketingEvent] = useState(event.hubspot.marketing_event?.id ?? NONE);

  const run = (link: Parameters<typeof save.mutate>[0], done: string) =>
    save.mutate(link, {
      onSuccess: () => {
        toast.success(done);
        onDone();
      },
      onError: (err) => toast.error("Couldn't save the HubSpot link", { description: err.message }),
    });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
      {options.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : options.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{options.error.message || "Couldn't load the HubSpot campaigns."}</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            HubSpot campaign
            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger className="h-9 bg-card text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE}>None</SelectItem>
                {(options.data?.campaigns ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{optionLabel(o)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            HubSpot marketing event
            <Select value={marketingEvent} onValueChange={setMarketingEvent}>
              <SelectTrigger className="h-9 bg-card text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE}>None</SelectItem>
                {(options.data?.marketing_events ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{optionLabel(o)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={save.isPending || (campaign === NONE && marketingEvent === NONE)}
              onClick={() => run({ campaign_id: campaign === NONE ? null : campaign, marketing_event_id: marketingEvent === NONE ? null : marketingEvent }, "HubSpot link saved")}
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save link
            </Button>
            <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => run({ none: true }, "Marked as having no HubSpot match")}>
              No HubSpot match
            </Button>
            <Button size="sm" variant="ghost" disabled={save.isPending} onClick={() => run({}, "Using the name match again")}>
              Use name match
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** The Navan trips joined to a HubSpot event: take one off, or join another that's still on its own */
function NavanTripLinks({ event, canEdit }: { event: EventOverviewDetail; canEdit: boolean }) {
  const options = useNavanTripOptions(canEdit);
  const save = useSetNavanTripLink(event.id);
  const [pick, setPick] = useState(NONE);
  const run = (tripId: string, link: boolean, done: string) =>
    save.mutate(
      { trip_id: tripId, link },
      {
        onSuccess: () => {
          toast.success(done);
          setPick(NONE);
        },
        onError: (err) => toast.error("Couldn't save the Navan link", { description: err.message }),
      },
    );
  const available = options.data ?? [];
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {event.navan_events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Navan trip is joined to this event, so there's no travel for it.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {event.navan_events.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.method === "MANUAL" ? "Joined by hand" : "Joined by name"}</span>
              </span>
              {canEdit && (
                <Button size="sm" variant="ghost" disabled={save.isPending} onClick={() => run(t.id, false, "Navan trip taken off this event")}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="h-9 w-full max-w-xs bg-card" aria-label="Navan trip to join">
              <SelectValue placeholder="Join a Navan trip" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={NONE}>{available.length ? "Choose a Navan trip" : "No Navan trips left to join"}</SelectItem>
              {available.map((o) => (
                <SelectItem key={o.id} value={o.id}>{`${o.name}${o.starts_on ? ` (${o.starts_on.slice(0, 10)})` : ""}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={pick === NONE || save.isPending} onClick={() => run(pick, true, "Navan trip joined to this event")}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Join trip
          </Button>
        </div>
      )}
    </div>
  );
}

function PanelBody({ event }: { event: EventOverviewDetail }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const [editing, setEditing] = useState(false);
  const [editingData, setEditingData] = useState(false);
  const { hubspot, turnout, navan } = event;
  const typed =(field: string) => (turnout.typed_fields.includes(field) ? " (typed in)" : "");
  // Only the figures that have a value: a tile of dashes says nothing
  const results = [
    { label: "Registered", value: turnout.registrants === null ? null : fmtCount(turnout.registrants) },
    { label: `Attended${typed("attended")}`, value: turnout.attended === null ? null : fmtCount(turnout.attended) },
    { label: "No-shows", value: turnout.no_shows === null ? null : fmtCount(turnout.no_shows) },
    { label: "Sessions", value: turnout.sessions === null ? null : fmtCount(turnout.sessions) },
    { label: `Leads${typed("leads")}`, value: turnout.leads === null ? null : fmtCount(turnout.leads) },
    { label: "Cost / lead", value: event.hubspot_cost_per_lead === null ? null : fmtUnitCost(event.hubspot_cost_per_lead, event.currency) },
    { label: "First-touch contacts", value: turnout.new_contacts === null ? null : fmtCount(turnout.new_contacts) },
    { label: "Influenced contacts", value: turnout.influenced_contacts === null ? null : fmtCount(turnout.influenced_contacts) },
    { label: "Campaign spend", value: hubspot.campaign?.spend_total == null ? null : fmtMoney(hubspot.campaign.spend_total, hubspot.campaign.spend_currency ?? event.currency) },
    { label: `MQLs${typed("mqls")}`, value: turnout.mqls === null ? null : fmtCount(turnout.mqls) },
    { label: "SQLs", value: turnout.sqls === null ? null : fmtCount(turnout.sqls) },
    { label: "Opportunities", value: turnout.opportunities === null ? null : fmtCount(turnout.opportunities) },
    { label: `Customers${typed("customers")}`, value: turnout.customers === null ? null : fmtCount(turnout.customers) },
    { label: "Demos", value: event.demos === null ? null : fmtCount(event.demos) },
    { label: "Revenue", value: event.revenue === null ? null : fmtMoney(event.revenue, event.currency) },
  ].filter((r): r is { label: string; value: string } => r.value !== null);
  const money = (n: number | null) => fmtMoney(n, event.currency);
  const used = event.approved_budget ? (event.actual_cost / event.approved_budget) * 100 : null;
  const travelUsed = navan.travel_budget ? (navan.travel_cost / navan.travel_budget) * 100 : null;
  const categories = COST_CATEGORIES.filter((c) => event.cost_categories[c] > 0);
  const maxCategory = Math.max(1, ...categories.map((c) => event.cost_categories[c]));
  const assets = Object.entries(event.campaign_assets ?? {})
    .map(([type, value]) => [type, Array.isArray(value) ? value.length : typeof (value as { count?: number })?.count === "number" ? (value as { count: number }).count : 0] as const)
    .filter(([, count]) => count > 0);

  return (
    <>
      <Section
        title="Money"
        hint={`In ${event.currency}`}
        action={
          canEdit && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditingData(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit data
            </Button>
          )
        }
      >
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Figure label="Approved budget" value={money(event.approved_budget)} />
          <Figure label="Actual cost" value={event.actual_cost ? money(event.actual_cost) : DASH} />
          <Figure label="Variance" value={money(event.variance)} tone={event.variance !== null && event.variance < 0 ? "text-red-600 dark:text-red-400" : undefined} />
          <Figure label="Prior year" value={money(event.prior_year_cost)} />
        </dl>
        {used !== null && (
          <div className="flex flex-col gap-1">
            <UsageBar percent={used} />
            <p className="text-xs text-muted-foreground">{Math.round(used)}% of the budget spent{event.awaiting_cost ? `, ${money(event.awaiting_cost)} still awaited` : ""}</p>
          </div>
        )}
        {used === null && <p className="text-xs text-muted-foreground">No budget set for this event.{event.awaiting_cost ? ` ${money(event.awaiting_cost)} of cost still awaited.` : ""}</p>}
        {(event.cost_source || event.budget_source) && (
          <p className="text-xs text-muted-foreground">
            {[event.cost_source && "The cost is the HubSpot campaign's spend", event.budget_source && "the budget is the HubSpot campaign's"].filter(Boolean).join(", ")}: the portal has none for
            this event. Costs entered in the portal replace it.
          </p>
        )}
        {categories.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {categories.map((c) => (
              <li key={c} className="grid grid-cols-[8.5rem_minmax(0,1fr)_5.5rem] items-center gap-2 text-xs">
                <span className="truncate text-muted-foreground">{COST_CATEGORY_LABELS[c]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full" style={{ width: `${(event.cost_categories[c] / maxCategory) * 100}%`, background: COST_CATEGORY_COLORS[c] }} />
                </span>
                <span className="text-right font-medium tabular-nums text-foreground">{money(event.cost_categories[c])}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Navan travel" hint={navan.navan_event_name ? `Navan event: ${navan.navan_event_name}` : "Bookings found for this event"}>
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Figure label="Travel cost" value={money(navan.travel_cost)} />
          <Figure label="Travel budget" value={money(navan.travel_budget)} />
          <Figure label="Navan estimate" value={money(navan.navan_estimate)} />
          <Figure label="Travellers" value={`${fmtCount(navan.travellers)} · ${fmtCount(navan.bookings)} bookings`} />
        </dl>
        {travelUsed !== null && <UsageBar percent={travelUsed} />}
        {navan.first_travel && <p className="text-xs text-muted-foreground">Travel {formatDay(navan.first_travel)}{navan.last_travel && navan.last_travel !== navan.first_travel ? ` - ${formatDay(navan.last_travel)}` : ""}</p>}
        {event.source === "HUBSPOT" && <NavanTripLinks event={event} canEdit={canEdit} />}
        {event.travellers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">Traveller</th>
                  <th className="px-2 py-1.5 font-medium">Booked</th>
                  <th className="px-2 py-1.5 text-right font-medium">Bookings</th>
                  <th className="py-1.5 pl-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {event.travellers.map((t) => (
                  <tr key={`${t.name}-${t.email ?? ""}`} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-2">
                      <p className="font-medium text-foreground">{t.name}</p>
                      {t.department && <p className="text-xs text-muted-foreground">{t.department}</p>}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{t.booking_types.map((b) => b.charAt(0) + b.slice(1).toLowerCase()).join(", ")}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{t.bookings}</td>
                    <td className="py-2 pl-2 text-right tabular-nums">{fmtMoney(t.amount, t.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No travellers recorded yet. The Navan sync lists the people on the event's bookings.</p>
        )}
      </Section>

      <Section title="HubSpot results" hint={event.source === "HUBSPOT" ? "This event is a HubSpot campaign" : "Matched to this event by name, or by hand"}>
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          {hubspot.method === "NONE" ? (
            <p className="text-sm text-muted-foreground">{hubspot.picked_none ? "Marked as having no HubSpot match." : "No HubSpot campaign or marketing event matches this event's name."}</p>
          ) : (
            <dl className="grid gap-1.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <dt className="w-32 shrink-0 text-xs text-muted-foreground">Campaign</dt>
                <dd className="min-w-0 truncate font-medium">{hubspot.campaign?.name ?? DASH}</dd>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <dt className="w-32 shrink-0 text-xs text-muted-foreground">Marketing event</dt>
                <dd className="min-w-0 truncate font-medium">{hubspot.marketing_event?.name ?? DASH}</dd>
              </div>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Link2 className="h-3 w-3" />
                {hubspot.method === "CAMPAIGN" ? "This event is the HubSpot campaign" : hubspot.method === "MANUAL" ? "Linked by hand" : `Matched by name${hubspot.score ? ` (${Math.round(hubspot.score * 100)}% sure)` : ""}`}
              </p>
            </dl>
          )}
          {canEdit && !editing && event.source === "NAVAN" && (
            <div>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                {hubspot.method === "NONE" ? "Link to HubSpot" : "Change link"}
              </Button>
            </div>
          )}
          {editing && <HubSpotLinkEditor event={event} onDone={() => setEditing(false)} />}
        </div>
        {results.length > 0 ? (
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {results.map((r) => (
              <Figure key={r.label} label={r.label} value={r.value} />
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No results for this event yet.{canEdit ? " Use Edit data to type some in." : ""}</p>
        )}
        {turnout.leads_basis && <p className="text-xs text-muted-foreground">Leads: {leadsBasis(event)}.</p>}
        {hubspot.marketing_event?.event_url && (
          <a href={hubspot.marketing_event.event_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Event page <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </Section>

      {event.participants.length > 0 && (
        <Section title="Contacts at the event" hint={`${event.participants.length} from the HubSpot marketing event`}>
          <ul className="flex flex-col divide-y divide-border">
            {event.participants.slice(0, 50).map((p, i) => (
              <li key={`${p.email ?? p.name ?? i}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{p.name || p.email || "Unknown"}</span>
                  {p.name && p.email && <span className="block truncate text-xs text-muted-foreground">{p.email}</span>}
                </span>
                <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">{STATE_LABELS[p.state ?? ""] ?? p.state ?? "-"}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {assets.length > 0 && (
        <Section title="Campaign content" hint="What the matched HubSpot campaign has attached">
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {assets.map(([type, count]) => (
              <li key={type} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="truncate text-muted-foreground">{ASSET_LABELS[type] ?? type}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {canEdit && <EventDataDialog event={event} open={editingData} onOpenChange={setEditingData} />}
      <div className="p-4">
        <Button asChild variant="outline" size="sm">
          <Link to={`/events/${event.id}`}>Open event workspace (team, travel budget, costs)</Link>
        </Button>
      </div>
    </>
  );
}

interface EventDetailPanelProps {
  /** The event shown; null closes the panel */
  eventId: string | null;
  onClose: () => void;
}

export default function EventDetailPanel({ eventId, onClose }: EventDetailPanelProps) {
  const detail = useEventOverviewDetail(eventId);
  const event = detail.data;
  return (
    <Sheet open={Boolean(eventId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:lg:max-w-2xl">
        <SheetHeader className="gap-2 border-b border-border p-4 pr-12">
          <SheetTitle className="truncate">{event?.name ?? "Event"}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {event ? (
                <>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${STATUS_PILL[displayStatus(event)]}`}>{statusLabel(event)}</span>
                  <span>{[event.event_code, event.brand_name, eventRegion(event), event.event_type_name].filter(Boolean).join(" · ")}</span>
                  <span>
                    {formatDay(event.start_date)}
                    {event.end_date && event.end_date !== event.start_date ? ` - ${formatDay(event.end_date)}` : ""}
                  </span>
                  {event.owner_name && <span>Owner: {event.owner_name}</span>}
                </>
              ) : (
                <span>Loading the event</span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>
        {detail.isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : detail.error || !event ? (
          <div className="flex flex-col items-start gap-3 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{detail.error?.message || "Couldn't load this event."}</p>
            <Button variant="outline" size="sm" onClick={() => detail.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <PanelBody key={event.id} event={event} />
        )}
      </SheetContent>
    </Sheet>
  );
}
