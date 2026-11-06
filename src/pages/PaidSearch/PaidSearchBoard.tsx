import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, ExternalLink, Loader2, Plus, RefreshCw, Search, Table2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHubSpotCampaigns, useHubSpotStatus, useStartHubSpotSync } from "@/hooks/useHubSpot";
import { queryKeys } from "@/services/queryKeys";
import type { HubSpotCampaign } from "@/types/hubspot";
import { brandCampaigns, fillFromHubSpot, funnelCounts, type HubSpotFillResult } from "./hubspotMatch";
import { cleanValue, emptyEntry, PAID_SEARCH_FIELDS, type PaidSearchEntry, type PaidSearchField, type PaidSearchKey } from "./paidSearchFields";
import PaidSearchUpload from "./PaidSearchUpload";

// Kept in this browser for now, until the board has its own API
const STORAGE_KEY = "marketing.paidSearchBoard.v1";
const NEW_ROW_DEFAULTS = { channel: "Paid Search" };

function loadEntries(): PaidSearchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PaidSearchEntry[]) : [];
    return Array.isArray(parsed) ? parsed.map((e) => ({ ...emptyEntry(), ...e })) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: PaidSearchEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage blocked or full: the board still works for this visit
  }
}

const WIDTHS: Partial<Record<PaidSearchKey, string>> = {
  campaign_name: "min-w-56",
  tracking_detail: "min-w-56",
  report_link: "min-w-56",
  brand: "min-w-36",
  market: "min-w-36",
  primary_kpi: "min-w-36",
  sub_channel: "min-w-32",
};

const widthOf = (f: PaidSearchField) => WIDTHS[f.key as PaidSearchKey] ?? (f.kind === "date" ? "min-w-36" : f.kind === "number" ? "min-w-28" : "min-w-32");

/** One editable cell; numbers and dates are checked when you leave the cell */
function Cell({ field, value, onChange }: { field: PaidSearchField; value: string; onChange: (value: string) => void }) {
  const problem = value ? cleanValue(field, value).problem : undefined;
  const base =
    "h-8 w-full rounded-md border bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
  const border = problem ? "border-red-400 dark:border-red-700" : "border-transparent hover:border-border";
  return (
    <div className="flex items-center gap-1">
      <input
        type={field.kind === "date" ? "date" : "text"}
        inputMode={field.kind === "number" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const cleaned = cleanValue(field, e.target.value.trim());
          if (!cleaned.problem && cleaned.value !== value) onChange(cleaned.value);
        }}
        aria-label={field.header}
        aria-invalid={problem ? true : undefined}
        title={problem}
        className={`${base} ${border} ${field.kind === "number" ? "text-right tabular-nums" : ""}`}
      />
      {field.kind === "url" && /^https?:\/\//i.test(value) && (
        <a href={value} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Open report">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

/** One choice in the HubSpot campaign picker */
function PickerOption({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
    >
      <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
      <span className="min-w-0 break-words">{label}</span>
    </button>
  );
}

/**
 * The HubSpot campaign a row takes its leads, MQLs and SQLs from, with a search box: the brand's paid campaigns first
 * (best fit first, Google and Bing alike), then every other campaign.
 */
function HubSpotLinkCell({
  entry,
  campaigns,
  onChange,
  disabled,
}: {
  entry: PaidSearchEntry;
  campaigns: HubSpotCampaign[];
  onChange: (campaignId: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const linked = entry.hubspot_campaign_id ? campaigns.find((c) => c.id === entry.hubspot_campaign_id) : undefined;
  const label = linked ? linked.name : entry.hubspot_link === "none" ? "Not in HubSpot" : "Not linked";

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const fits = (c: HubSpotCampaign) => terms.every((t) => c.name.toLowerCase().includes(t));
  const brand = brandCampaigns(entry, campaigns);
  const brandIds = new Set(brand.map((c) => c.id));
  const suggested = brand.filter(fits);
  const others = campaigns
    .filter((c) => !brandIds.has(c.id) && fits(c))
    .sort((a, b) => a.name.localeCompare(b.name));

  const pick = (campaignId: string | null) => {
    onChange(campaignId);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`HubSpot campaign: ${label}`}
          className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-transparent px-2 text-left text-xs hover:border-border focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default disabled:hover:border-transparent"
        >
          <span className={`truncate ${linked ? "" : "text-muted-foreground"}`}>{label}</span>
          {!disabled && <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search HubSpot campaigns"
            aria-label="Search HubSpot campaigns"
            className="h-9 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div role="listbox" className="max-h-80 overflow-y-auto p-1">
          {!query && <PickerOption label="Not linked" selected={!linked} onSelect={() => pick(null)} />}
          {suggested.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{entry.brand} paid campaigns</p>
              {suggested.map((c) => (
                <PickerOption key={c.id} label={c.name} selected={c.id === linked?.id} onSelect={() => pick(c.id)} />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">All other HubSpot campaigns</p>
              {others.map((c) => (
                <PickerOption key={c.id} label={c.name} selected={c.id === linked?.id} onSelect={() => pick(c.id)} />
              ))}
            </>
          )}
          {suggested.length === 0 && others.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {campaigns.length === 0 ? "No HubSpot campaigns yet. Use Sync HubSpot." : "No HubSpot campaign matches."}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Linked 9 rows to HubSpot campaigns · MQLs and SQLs filled for 13 rows · 2 rows have no HubSpot campaign" */
function fillSummary(result: HubSpotFillResult) {
  return [
    result.linked ? `Linked ${plural(result.linked, "row", "rows")} to HubSpot campaigns.` : "",
    `Leads, MQLs and SQLs filled for ${plural(result.filled, "row", "rows")}.`,
    result.unmatched ? `${plural(result.unmatched, "row has", "rows have")} no HubSpot campaign: pick one in the HubSpot campaign column.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** The Paid Search data entry board: type entries in, or upload them from a spreadsheet */
export default function PaidSearchBoard({ canEdit }: { canEdit: boolean }) {
  const [entries, setEntries] = useState<PaidSearchEntry[]>(loadEntries);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => saveEntries(entries), [entries]);

  // HubSpot: the campaigns from the last sync (read with the backend's HUBSPOT_API_KEY), and the sync itself
  const queryClient = useQueryClient();
  const { data: hubspotData, dataUpdatedAt: campaignsUpdatedAt } = useHubSpotCampaigns();
  const hubspotCampaigns = useMemo(() => hubspotData ?? [], [hubspotData]);
  const { data: hubspotStatus } = useHubSpotStatus();
  const startSync = useStartHubSpotSync();
  // Set while a sync started here runs: the attempt time it replaces, and when the campaigns were last loaded
  const waiting = useRef<{ previousAttempt: string | null; campaignsAt: number } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const applyHubSpot = (campaigns: HubSpotCampaign[]) => {
    const result = fillFromHubSpot(entries, campaigns);
    setEntries(result.entries);
    return result;
  };

  // The sync has ended (its attempt time changed and it's no longer running): reload the campaigns
  useEffect(() => {
    const w = waiting.current;
    if (!w || !hubspotStatus || hubspotStatus.running || hubspotStatus.last_attempt_at === w.previousAttempt) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.hubspotCampaigns() });
  }, [hubspotStatus, queryClient]);

  // ...and once they're reloaded, fill the board from them
  useEffect(() => {
    const w = waiting.current;
    if (!w || campaignsUpdatedAt <= w.campaignsAt || !hubspotStatus || hubspotStatus.running) return;
    waiting.current = null;
    setSyncing(false);
    // The last attempt failed when it's newer than the last success (as in HubSpotSyncStatus)
    const failed =
      Boolean(hubspotStatus.last_error) &&
      (!hubspotStatus.last_success_at ||
        (hubspotStatus.last_attempt_at !== null && new Date(hubspotStatus.last_attempt_at) > new Date(hubspotStatus.last_success_at)));
    const result = applyHubSpot(hubspotCampaigns);
    if (failed) toast.warning("HubSpot sync failed; used the last synced figures", { description: `${hubspotStatus.last_error ?? ""} ${fillSummary(result)}`.trim() });
    else toast.success("HubSpot sync finished", { description: fillSummary(result), duration: 10_000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the reloaded campaigns arrive
  }, [campaignsUpdatedAt, hubspotStatus?.running]);

  const syncHubSpot = () => {
    if (hubspotStatus && !hubspotStatus.configured) {
      toast.error("HubSpot isn't set up", { description: "Add the HubSpot key (HUBSPOT_API_KEY) on the server first." });
      return;
    }
    // Fill straight away from the last sync, then again when the new one finishes
    if (hubspotCampaigns.length) applyHubSpot(hubspotCampaigns);
    waiting.current = { previousAttempt: hubspotStatus?.last_attempt_at ?? null, campaignsAt: campaignsUpdatedAt };
    setSyncing(true);
    startSync.mutate(undefined, {
      onSuccess: () => toast.info("Syncing with HubSpot", { description: "Reading every campaign takes a few minutes. Leads, MQLs and SQLs update when it's done." }),
      onError: (err) => {
        waiting.current = null;
        setSyncing(false);
        toast.error("Couldn't start the HubSpot sync", { description: err.message || "Try again in a few minutes." });
      },
    });
  };

  const setHubSpotLink = (id: string, campaignId: string | null) => {
    const campaign = campaignId ? hubspotCampaigns.find((c) => c.id === campaignId) : undefined;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (!campaign) return { ...e, hubspot_campaign_id: undefined, hubspot_link: "none", leads: undefined };
        return { ...e, hubspot_campaign_id: campaign.id, hubspot_link: "manual", ...(funnelCounts(campaign) ?? {}) };
      }),
    );
  };
  const hubspotBusy = syncing || Boolean(hubspotStatus?.running) || startSync.isPending;

  const updateCell = (id: string, key: PaidSearchKey, value: string) => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: value } : e)));
  const addRow = () => setEntries((prev) => [...prev, emptyEntry(NEW_ROW_DEFAULTS)]);
  const removeRow = (entry: PaidSearchEntry) => {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    toast.success("Entry removed", {
      description: entry.campaign_name || undefined,
      action: { label: "Undo", onClick: () => setEntries((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry])) },
    });
  };
  const importEntries = (added: PaidSearchEntry[]) => {
    setEntries((prev) => [...prev, ...added]);
    const ids = new Set(added.map((e) => e.id));
    toast.success(`Imported ${added.length} ${added.length === 1 ? "entry" : "entries"}`, {
      action: { label: "Undo", onClick: () => setEntries((prev) => prev.filter((e) => !ids.has(e.id))) },
      duration: 10_000,
    });
  };
  const notConnected = (service: string) =>
    toast.info(`${service} sync isn't connected yet`, { description: "The button is in place; syncing will be added when the integration is built." });

  return (
    <section className={`${DASH_CARD} flex flex-col overflow-hidden`} aria-labelledby="paid-search-board-title">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-muted-foreground" />
          <h2 id="paid-search-board-title" className="text-sm font-semibold text-foreground">
            Paid Search board
          </h2>
          <span className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload spreadsheet
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={syncHubSpot} disabled={hubspotBusy}>
              {hubspotBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {hubspotBusy ? "Syncing HubSpot..." : "Sync HubSpot"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => notConnected("Google")}>
              <RefreshCw className="h-4 w-4" />
              Sync Google
            </Button>
            <Button size="sm" className="gap-1.5" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Add row
            </Button>
          </div>
        )}
      </div>

      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left font-medium text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr className="border-b border-border">
              <th className="w-10 px-2 py-2 text-right">#</th>
              {PAID_SEARCH_FIELDS.map((f) => (
                <Fragment key={f.key}>
                  {f.key === "mqls" && (
                    <>
                      <th className="whitespace-nowrap px-2 py-2" title="Leads, MQLs and SQLs come from this HubSpot campaign (to date) when you sync HubSpot">
                        HubSpot campaign
                      </th>
                      <th className="whitespace-nowrap px-2 py-2 text-right" title="Contacts this HubSpot campaign brought in (first touch), to date">
                        Leads
                      </th>
                    </>
                  )}
                  <th className={`whitespace-nowrap px-2 py-2 ${f.kind === "number" ? "text-right" : ""}`}>{f.header}</th>
                </Fragment>
              ))}
              {canEdit && <th className="w-10 px-2 py-2" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={PAID_SEARCH_FIELDS.length + 4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No entries yet. {canEdit ? "Add a row or upload a spreadsheet." : ""}
                </td>
              </tr>
            ) : (
              entries.map((entry, i) => (
                <tr key={entry.id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{i + 1}</td>
                  {PAID_SEARCH_FIELDS.map((f) => (
                    <Fragment key={f.key}>
                      {f.key === "mqls" && (
                        <td className="min-w-72 px-1 py-1">
                          <HubSpotLinkCell
                            entry={entry}
                            campaigns={hubspotCampaigns}
                            onChange={(campaignId) => setHubSpotLink(entry.id, campaignId)}
                            disabled={!canEdit}
                          />
                        </td>
                      )}
                      {f.key === "mqls" && (
                        <td className="min-w-20 px-1 py-1" title={entry.hubspot_campaign_id ? "From HubSpot, to date" : "Link a HubSpot campaign to fill this"}>
                          <span className="block px-2 text-right tabular-nums">{entry.leads || <span className="text-muted-foreground">-</span>}</span>
                        </td>
                      )}
                      <td className={`px-1 py-1 ${widthOf(f)}`}>
                        {canEdit ? (
                          <Cell field={f} value={entry[f.key]} onChange={(v) => updateCell(entry.id, f.key, v)} />
                        ) : (
                          <span className={`block px-2 ${f.kind === "number" ? "text-right tabular-nums" : ""}`}>{entry[f.key] || "-"}</span>
                        )}
                      </td>
                    </Fragment>
                  ))}
                  {canEdit && (
                    <td className="px-1 py-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => removeRow(entry)}
                        aria-label={`Remove ${entry.campaign_name || `row ${i + 1}`}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canEdit && <PaidSearchUpload open={uploadOpen} onOpenChange={setUploadOpen} onImport={importEntries} existing={entries} />}
    </section>
  );
}
