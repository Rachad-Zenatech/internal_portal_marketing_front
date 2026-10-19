import { useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAdCampaigns, useCreateAdResult, useDeleteAdResult, useUpdateAdResult } from "@/hooks/useAds";
import type { AdCampaign, AdResult, AdResultCreate, AdResultStatus } from "@/types/ads";
import InitiativeFormDialog from "../Initiatives/InitiativeFormDialog";
import { Field } from "../Initiatives/SpendLineDialog";
import {
  AD_STATUS_LABELS,
  AD_STATUSES,
  calculateMetrics,
  fmtPercent,
  fmtUnitCost,
  formatPeriod,
  PLATFORM_LABELS,
  PLATFORM_STYLES,
  PLATFORMS,
  SOURCE_LABELS,
} from "./adsDisplay";

// The picked option in a segmented control, so it stands out in light and dark
const SELECTED = "data-[state=on]:bg-slate-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900";

interface FormState {
  initiativeId: string;
  adGroup: string;
  periodStart: string;
  periodEnd: string;
  budget: string;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  contacts: string;
  mqls: string;
  sqls: string;
  status: AdResultStatus;
  reportUrl: string;
  tracking: string;
}

type FieldName = keyof FormState;

// Field order, used to focus the first one with a problem
const FIELD_IDS: Partial<Record<FieldName, string>> = {
  initiativeId: "ad-campaign",
  periodStart: "ad-period-start",
  periodEnd: "ad-period-end",
  budget: "ad-budget",
  spend: "ad-spend",
  impressions: "ad-impressions",
  clicks: "ad-clicks",
  conversions: "ad-conversions",
  contacts: "ad-contacts",
  mqls: "ad-mqls",
  sqls: "ad-sqls",
  reportUrl: "ad-report",
};

const DECIMAL_FIELDS: FieldName[] = ["budget", "spend", "conversions"];
const WHOLE_FIELDS: FieldName[] = ["impressions", "clicks", "contacts", "mqls", "sqls"];

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const num = (s: string) => (s.trim() === "" ? null : Number(s));

function firstOfThisMonth() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-01`;
}

function initialState(result: AdResult | undefined, campaignId: string | undefined): FormState {
  return {
    initiativeId: result?.initiative_id ?? campaignId ?? "",
    adGroup: result?.ad_group ?? "",
    periodStart: result?.period_start ?? firstOfThisMonth(),
    periodEnd: result?.period_end ?? "",
    budget: str(result?.budget_amount),
    spend: str(result?.spend),
    impressions: str(result?.impressions),
    clicks: str(result?.clicks),
    conversions: str(result?.conversions),
    contacts: str(result?.hubspot_contacts),
    mqls: str(result?.mqls),
    sqls: str(result?.sqls),
    status: result?.status ?? "ACTIVE",
    reportUrl: result?.report_url ?? "",
    tracking: result?.tracking_detail ?? "",
  };
}

function validate(form: FormState) {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!form.initiativeId) errors.initiativeId = "Choose the campaign.";
  if (!form.periodStart) errors.periodStart = "Enter when the period starts.";
  if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart) errors.periodEnd = "The end can't be before the start.";
  for (const f of [...DECIMAL_FIELDS, ...WHOLE_FIELDS]) {
    const value = form[f] as string;
    if (value.trim() === "") continue;
    const n = Number(value);
    if (!Number.isFinite(n)) errors[f] = "Enter a number.";
    else if (n < 0) errors[f] = "Can't be negative.";
    else if (WHOLE_FIELDS.includes(f) && !Number.isInteger(n)) errors[f] = "Enter a whole number.";
  }
  if (form.reportUrl.trim() && !/^https:\/\/\S+$/i.test(form.reportUrl.trim())) errors.reportUrl = "Paste the full link, starting with https://";
  return errors;
}

function CampaignOption({ c }: { c: AdCampaign }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{c.name}</span>
      <span className="truncate text-xs text-muted-foreground">{[c.brand_name, c.market_name ?? "No market"].join(" · ")}</span>
    </span>
  );
}

interface AdResultFormProps {
  result?: AdResult;
  defaultCampaignId?: string;
  onDone: () => void;
}

// Mounted each time the dialog opens, so the fields start from the latest values
function AdResultForm({ result, defaultCampaignId, onDone }: AdResultFormProps) {
  const isEdit = Boolean(result);
  const campaigns = useAdCampaigns();
  const create = useCreateAdResult();
  const update = useUpdateAdResult();
  const remove = useDeleteAdResult();
  const [form, setForm] = useState<FormState>(() => initialState(result, defaultCampaignId));
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const knownCampaigns = useRef<Set<string>>(new Set());

  const set = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as FieldName[]) delete next[key];
      return next;
    });
  };
  const invalid = (f: FieldName) => (errors[f] ? { "aria-invalid": true as const, "aria-describedby": `${FIELD_IDS[f]}-error` } : {});

  const list = useMemo(() => campaigns.data ?? [], [campaigns.data]);
  const campaign = list.find((c) => c.initiative_id === form.initiativeId);
  const currency = campaign?.currency ?? result?.currency ?? "USD";
  const live = calculateMetrics({
    spend: num(form.spend),
    impressions: num(form.impressions),
    clicks: num(form.clicks),
    conversions: num(form.conversions),
    hubspot_contacts: num(form.contacts),
    budget_amount: num(form.budget),
  });

  const openNewCampaign = () => {
    knownCampaigns.current = new Set(list.map((c) => c.initiative_id));
    setNewCampaignOpen(true);
  };
  // Once the new campaign is saved, pick it if it's the only new one in the list
  const newCampaignClosed = (open: boolean) => {
    setNewCampaignOpen(open);
    if (open) return;
    void campaigns.refetch().then(({ data }) => {
      const added = (data ?? []).filter((c) => !knownCampaigns.current.has(c.initiative_id));
      if (added.length === 1) set({ initiativeId: added[0].initiative_id });
    });
  };

  const pending = create.isPending || update.isPending || remove.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = (Object.keys(FIELD_IDS) as FieldName[]).find((f) => found[f]);
      if (first) document.getElementById(FIELD_IDS[first] as string)?.focus();
      return;
    }
    const body: Omit<AdResultCreate, "initiative_id"> = {
      ad_group: form.adGroup.trim() || null,
      period_start: form.periodStart,
      period_end: form.periodEnd || null,
      budget_amount: num(form.budget),
      spend: num(form.spend),
      impressions: num(form.impressions),
      clicks: num(form.clicks),
      conversions: num(form.conversions),
      hubspot_contacts: num(form.contacts),
      mqls: num(form.mqls),
      sqls: num(form.sqls),
      status: form.status,
      report_url: form.reportUrl.trim() || null,
      tracking_detail: form.tracking.trim() || null,
    };
    const done = () => {
      toast.success(isEdit ? "Result saved" : "Result added");
      onDone();
    };
    const failed = (err: Error) => setFormError(err.message || "Could not save the result.");
    if (result) update.mutate({ id: result.id, data: body }, { onSuccess: done, onError: failed });
    else create.mutate({ initiative_id: form.initiativeId, ...body }, { onSuccess: done, onError: failed });
  };

  const numberField = (f: FieldName, label: string, opts: { money?: boolean; placeholder?: string } = {}) => (
    <Field label={opts.money ? `${label} (${currency})` : label} htmlFor={FIELD_IDS[f] as string} error={errors[f]}>
      <Input
        id={FIELD_IDS[f]}
        type="number"
        inputMode={WHOLE_FIELDS.includes(f) ? "numeric" : "decimal"}
        min={0}
        step={WHOLE_FIELDS.includes(f) ? 1 : 0.01}
        value={form[f] as string}
        onChange={(e) => set({ [f]: e.target.value } as Partial<FormState>)}
        placeholder={opts.placeholder ?? "0"}
        {...invalid(f)}
      />
    </Field>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit ad result" : "Add ad result"}</DialogTitle>
        <DialogDescription>
          {isEdit && result
            ? `${result.campaign_name}${result.ad_group ? ` · ${result.ad_group}` : ""} · ${formatPeriod(result.period_start, result.period_end)} · ${SOURCE_LABELS[result.source]}`
            : "One campaign or ad group for one period, the same as a row in the PPC spreadsheet."}
        </DialogDescription>
      </DialogHeader>

      <form id="ad-result-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Campaign"
          htmlFor="ad-campaign"
          required
          error={errors.initiativeId}
          className="sm:col-span-2"
          hint={
            isEdit ? (
              "To move this result to another campaign, delete it and add it there."
            ) : (
              <span>
                Not in the list?{" "}
                <button type="button" onClick={openNewCampaign} className="inline-flex items-center gap-0.5 font-medium text-foreground underline underline-offset-2">
                  <Plus className="h-3 w-3" />
                  New campaign
                </button>{" "}
                (a Paid Search initiative with Google Ads or Bing Ads as the sub-channel).
              </span>
            )
          }
        >
          <Select value={form.initiativeId || undefined} onValueChange={(v) => set({ initiativeId: v })} disabled={isEdit}>
            <SelectTrigger id="ad-campaign" className="w-full text-left" {...invalid("initiativeId")}>
              <SelectValue placeholder={campaigns.isLoading ? "Loading campaigns…" : "Choose a campaign"}>
                {campaign ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${PLATFORM_STYLES[campaign.platform].dot}`} />
                    <span className="truncate">
                      {campaign.name} <span className="text-muted-foreground">· {[campaign.brand_name, campaign.market_name ?? "No market"].join(" · ")}</span>
                    </span>
                  </span>
                ) : (
                  result?.campaign_name
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-80">
              {list.length === 0 && !campaigns.isLoading && <p className="px-2 py-3 text-sm text-muted-foreground">No Google Ads or Bing Ads campaigns yet.</p>}
              {PLATFORMS.map((p) => {
                const items = list.filter((c) => c.platform === p);
                if (!items.length) return null;
                return (
                  <SelectGroup key={p}>
                    <SelectLabel className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${PLATFORM_STYLES[p].dot}`} />
                      {PLATFORM_LABELS[p]}
                    </SelectLabel>
                    {items.map((c) => (
                      <SelectItem key={c.initiative_id} value={c.initiative_id}>
                        <CampaignOption c={c} />
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Ad group" htmlFor="ad-group" hint="Leave empty for the whole campaign." className="sm:col-span-2">
          <Input id="ad-group" value={form.adGroup} onChange={(e) => set({ adGroup: e.target.value })} placeholder="e.g. Ad Group 1a" maxLength={255} />
        </Field>

        <Field label="Period start" htmlFor="ad-period-start" required error={errors.periodStart}>
          <DatePicker id="ad-period-start" value={form.periodStart} onChange={(v) => set({ periodStart: v })} {...invalid("periodStart")} />
        </Field>
        <Field label="Period end" htmlFor="ad-period-end" error={errors.periodEnd} hint="Leave empty while it's running.">
          <DatePicker id="ad-period-end" value={form.periodEnd} onChange={(v) => set({ periodEnd: v })} min={form.periodStart || undefined} clearable {...invalid("periodEnd")} />
        </Field>

        {numberField("budget", "Budget", { money: true, placeholder: "0.00" })}
        {numberField("spend", "Spend", { money: true, placeholder: "0.00" })}
        {numberField("impressions", "Impressions")}
        {numberField("clicks", "Clicks")}
        {numberField("conversions", "Ads conversions")}
        {numberField("contacts", "HubSpot contacts")}
        {numberField("mqls", "MQLs")}
        {numberField("sqls", "SQLs")}

        <div className="rounded-lg bg-muted/60 p-3 sm:col-span-2" aria-live="polite">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Calculated from the figures above</p>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {[
              ["CTR", fmtPercent(live.ctr)],
              ["CPC", fmtUnitCost(live.cpc, currency)],
              ["Conv. rate", fmtPercent(live.conversion_rate)],
              ["CPL", fmtUnitCost(live.cpl, currency)],
              ["Of budget", fmtPercent(live.budget_used_percent)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Field label="Status" htmlFor="ad-status" required className="sm:col-span-2">
          <ToggleGroup
            id="ad-status"
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={form.status}
            onValueChange={(v) => v && set({ status: v as AdResultStatus })}
            className="w-full"
          >
            {AD_STATUSES.map((s) => (
              <ToggleGroupItem key={s} value={s} className={`flex-1 ${SELECTED}`}>
                {AD_STATUS_LABELS[s]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field label="Report link (Data Studio)" htmlFor="ad-report" error={errors.reportUrl} className="sm:col-span-2">
          <div className="flex gap-2">
            <Input
              id="ad-report"
              type="url"
              value={form.reportUrl}
              onChange={(e) => set({ reportUrl: e.target.value })}
              placeholder="https://datastudio.google.com/..."
              {...invalid("reportUrl")}
            />
            {/^https:\/\/\S+$/i.test(form.reportUrl.trim()) && (
              <Button variant="outline" size="icon" asChild>
                <a href={form.reportUrl.trim()} target="_blank" rel="noopener noreferrer" aria-label="Open the report in a new tab">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </Field>
        <Field label="Tracking detail" htmlFor="ad-tracking" className="sm:col-span-2">
          <Textarea id="ad-tracking" value={form.tracking} onChange={(e) => set({ tracking: e.target.value })} rows={2} placeholder="e.g. UTM tags, conversion action, landing page" />
        </Field>
      </form>

      {formError && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {formError}
        </p>
      )}

      <DialogFooter className="sticky -bottom-4 z-10 bg-slate-50 sm:justify-between dark:bg-zinc-900">
        {isEdit ? (
          <Button type="button" variant="outline" className="gap-2 text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => setConfirmDelete(true)} disabled={pending}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="ad-result-form" disabled={pending}>
            {(create.isPending || update.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add result"}
          </Button>
        </div>
      </DialogFooter>

      {!isEdit && <InitiativeFormDialog open={newCampaignOpen} onOpenChange={newCampaignClosed} defaultChannelCode="PAID_SEARCH" />}

      {result && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this result?</AlertDialogTitle>
              <AlertDialogDescription>
                {result.campaign_name}
                {result.ad_group ? ` · ${result.ad_group}` : ""} for {formatPeriod(result.period_start, result.period_end)}. Its spend is taken off the campaign's costs and
                monthly budget. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={remove.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  remove.mutate(result.id, {
                    onSuccess: () => {
                      toast.success("Result deleted");
                      setConfirmDelete(false);
                      onDone();
                    },
                    onError: (err) => toast.error(err.message || "Could not delete the result."),
                  });
                }}
              >
                {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

interface AdResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a result to edit it; leave out to add one */
  result?: AdResult;
  /** For a new result: start with this campaign picked */
  defaultCampaignId?: string;
}

export default function AdResultDialog({ open, onOpenChange, result, defaultCampaignId }: AdResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {open && <AdResultForm result={result} defaultCampaignId={defaultCampaignId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
