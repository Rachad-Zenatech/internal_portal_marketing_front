import { useState } from "react";
import { CalendarClock, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDecisions, useRecordDecision, useSaveEvaluation } from "@/hooks/usePerformance";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeListItem } from "@/types/initiatives";
import type { Performance } from "@/types/performance";
import { Section } from "./detailParts";
import { MUTED } from "./detailStyles";
import { formatMoney } from "./format";
import { EARLY_LABELS, formatDateLong, formatKpiValue, RATING_STYLES, verdictSentence } from "./performanceRules";

const RATING_TEXT: Record<string, string> = {
  HIGH: "Worth it",
  MEDIUM: "Works, needs optimising",
  LOW: "Not worth it as it stands",
  TEST: "Too early to say",
};

/** Target and maturity window for the primary KPI */
function SuccessSettings({ initiative, performance, canEdit }: { initiative: InitiativeListItem; performance: Performance; canEdit: boolean }) {
  const { evaluation, currency } = performance;
  const kpi = evaluation.primary_kpi;
  const saveEvaluation = useSaveEvaluation(initiative.id);
  const [target, setTarget] = useState(evaluation.target_value === null ? "" : String(evaluation.target_value));
  const [days, setDays] = useState(String(evaluation.maturity_days));
  const [error, setError] = useState<string | null>(null);

  const unitLabel = kpi?.unit === "MONEY" ? currency : kpi?.unit === "PERCENT" ? "%" : null;
  const directionHint = kpi?.direction === "lower" ? "Lower is better — the most it should cost." : kpi?.direction === "higher" ? "Higher is better — the least you'd accept." : null;
  const dirty = target !== (evaluation.target_value === null ? "" : String(evaluation.target_value)) || days !== String(evaluation.maturity_days);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const targetValue = target.trim() === "" ? null : Number(target);
    // Number("") is 0, so an empty window must be caught before converting
    const maturity = days.trim() === "" ? NaN : Number(days);
    if (targetValue !== null && (Number.isNaN(targetValue) || targetValue < 0)) return setError("Enter a target of 0 or more.");
    if (!Number.isInteger(maturity) || maturity < 0 || maturity > 730) return setError("The maturity window is 0 to 730 days.");
    setError(null);
    saveEvaluation.mutate(
      { target_value: targetValue, maturity_days: maturity },
      { onSuccess: () => toast.success("Target saved"), onError: (err) => setError(err.message || "Could not save the target.") },
    );
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-zinc-800">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">What counts as success</h4>
        <p className={`mt-0.5 text-xs ${MUTED}`}>
          {kpi ? (
            <>
              Judged on <span className="font-medium text-slate-700 dark:text-zinc-300">{kpi.name}</span>
              {evaluation.kpi_from_default ? ` (the default for ${initiative.sub_channel_name ?? "this sub-channel"} — change the primary KPI with Edit)` : ""}.
              {!kpi.supported && " This KPI isn't calculated yet, so there's no rating."}
            </>
          ) : (
            "No primary KPI yet — set one with Edit on the overview to get a rating."
          )}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="worth-target" className="text-slate-700 dark:text-zinc-300">
            Target {kpi ? `for ${kpi.name}` : ""}
          </Label>
          <div className="flex items-center gap-2">
            {unitLabel && unitLabel !== "%" && <span className={`text-sm ${MUTED}`}>{unitLabel}</span>}
            <Input
              id="worth-target"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={!canEdit || !kpi?.supported}
              placeholder="Not set"
            />
            {unitLabel === "%" && <span className={`text-sm ${MUTED}`}>%</span>}
          </div>
          {directionHint && <p className={`text-xs ${MUTED}`}>{directionHint}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="worth-days" className="text-slate-700 dark:text-zinc-300">
            Maturity window
          </Label>
          <div className="flex items-center gap-2">
            <Input id="worth-days" type="number" min={0} max={730} step={1} value={days} onChange={(e) => setDays(e.target.value)} disabled={!canEdit} />
            <span className={`text-sm ${MUTED}`}>days</span>
          </div>
          <p className={`text-xs ${MUTED}`}>How long after it ends before the rating is final — deals close late.</p>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {canEdit && (
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs ${MUTED}`}>
            {evaluation.is_default ? "Using the defaults until you save." : evaluation.updated_by_name ? `Last set by ${evaluation.updated_by_name}.` : ""}
          </p>
          <Button type="submit" size="sm" variant="outline" disabled={!dirty || saveEvaluation.isPending}>
            {saveEvaluation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      )}
    </form>
  );
}

/** Marketing's scale-or-cut call, with the system's suggestion pre-selected, and the history */
function DecisionPanel({ initiative, performance, canEdit }: { initiative: InitiativeListItem; performance: Performance; canEdit: boolean }) {
  const { data: reference } = useReferenceData();
  const { data: decisions } = useDecisions(initiative.id);
  const record = useRecordDecision(initiative.id);
  const options = reference?.scale_or_cut_options ?? [];
  const suggested = options.find((o) => o.code === performance.suggested_decision);
  const [choice, setChoice] = useState<string>("");
  const [note, setNote] = useState("");
  const picked = choice || (suggested ? String(suggested.id) : "");
  const pickedOption = options.find((o) => String(o.id) === picked);

  const handleRecord = () => {
    if (!picked) return;
    record.mutate(
      { scale_or_cut_id: Number(picked), note: note.trim() || null },
      {
        onSuccess: () => {
          toast.success("Decision recorded");
          setNote("");
          setChoice("");
        },
        onError: (err) => toast.error(err.message || "Could not record the decision."),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-zinc-800">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Scale or cut?</h4>
        <p className={`mt-0.5 text-xs ${MUTED}`}>
          The rating suggests <span className="font-medium text-slate-700 dark:text-zinc-300">{suggested?.name ?? "—"}</span>. The decision is Marketing's.
        </p>
      </div>
      {performance.latest_decision && (
        <p className="text-sm text-slate-700 dark:text-zinc-300">
          Decided: <span className="font-semibold text-slate-900 dark:text-zinc-100">{performance.latest_decision.name}</span>
          {performance.latest_decision.decided_by_name && ` by ${performance.latest_decision.decided_by_name}`} on{" "}
          {new Date(performance.latest_decision.decided_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          {performance.latest_decision.note && <span className={`block text-xs ${MUTED}`}>“{performance.latest_decision.note}”</span>}
        </p>
      )}
      {canEdit && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="worth-decision" className="text-slate-700 dark:text-zinc-300">
            {performance.latest_decision ? "Record a new decision" : "Decision"}
          </Label>
          <Select value={picked || undefined} onValueChange={setChoice}>
            <SelectTrigger id="worth-decision" className="w-full">
              <SelectValue placeholder="Choose a decision" />
            </SelectTrigger>
            <SelectContent position="popper">
              {options.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                  {o.code === performance.suggested_decision ? " (suggested)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pickedOption?.description && <p className={`text-xs ${MUTED}`}>{pickedOption.description}</p>}
          <Textarea id="worth-decision-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Why (optional)" aria-label="Why" />
          <Button size="sm" className="self-end" onClick={handleRecord} disabled={!picked || record.isPending}>
            {record.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record decision
          </Button>
        </div>
      )}
      {decisions && decisions.length > 1 && (
        <details className="text-sm">
          <summary className={`cursor-pointer ${MUTED}`}>Earlier decisions ({decisions.length - 1})</summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {decisions.slice(1).map((d) => (
              <li key={d.id} className="text-slate-700 dark:text-zinc-300">
                <span className="font-medium">{d.name}</span>
                <span className={MUTED}>
                  {" "}
                  · {d.decided_by_name ?? "Someone"} · {new Date(d.decided_at).toLocaleDateString()}
                  {d.suggested_rating && ` · rating then: ${d.suggested_rating.charAt(0)}${d.suggested_rating.slice(1).toLowerCase()}`}
                </span>
                {d.note && <span className={`block text-xs ${MUTED}`}>“{d.note}”</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function StatusLine({ badge, badgeTone, title, reason, date }: { badge: string; badgeTone: string; title: string; reason: string; date?: string | null }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <Badge variant="outline" className={`w-fit shrink-0 px-3 py-1 text-base font-semibold ${badgeTone}`}>
        {badge}
      </Badge>
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 dark:text-zinc-100">{title}</p>
        <p className="text-sm text-slate-700 dark:text-zinc-300">{reason}</p>
        {date && (
          <p className={`mt-1 flex items-center gap-1.5 text-xs ${MUTED}`}>
            <CalendarClock className="h-3.5 w-3.5" />
            {date}
          </p>
        )}
      </div>
    </div>
  );
}

export default function WorthItSection({ initiative, performance }: { initiative: InitiativeListItem; performance: Performance }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const { rating, evaluation, currency, stage } = performance;
  const kpi = evaluation.primary_kpi;
  const isEvent = Boolean(initiative.event_code);
  const finalOn = performance.matures_on ? formatDateLong(performance.matures_on) : null;
  const sentence = verdictSentence(performance);
  // Before the final verdict, money figures are only what's in so far
  const showSentence = sentence && (stage === "FINAL" || performance.money_outcome !== "NO_REVENUE");

  return (
    <Section title="Was it worth it?" icon={Trophy}>
      <div className="flex flex-col gap-5">
        {stage === "UPCOMING" && (
          <StatusLine
            badge="Upcoming"
            badgeTone={RATING_STYLES.TEST}
            title={isEvent ? "The verdict comes after the event" : "The verdict comes after it runs"}
            reason={`Until then, keep the expected cost (${formatMoney(performance.cost, currency)}) within budget. Results and the early read start once it has happened.`}
          />
        )}

        {stage === "EARLY" && performance.early_read && (
          <StatusLine
            badge={`Early read: ${EARLY_LABELS[performance.early_read.code]}`}
            badgeTone={RATING_STYLES[performance.early_read.code]}
            title={kpi ? `How ${kpi.name} is looking` : "Early read"}
            reason={performance.early_read.reason}
            date={finalOn ? `Final verdict on ${finalOn}, once deals have had time to close.` : null}
          />
        )}

        {stage === "FINAL" && (
          <StatusLine
            badge={rating.name}
            badgeTone={RATING_STYLES[rating.code]}
            title={RATING_TEXT[rating.code]}
            reason={rating.reason}
            date={finalOn ? `Final since ${finalOn}` : null}
          />
        )}

        {showSentence && (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:bg-zinc-800/60 dark:text-zinc-200">
            {stage === "FINAL" ? sentence : `So far: ${sentence}`}
          </p>
        )}

        {evaluation.kpi_note && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            {evaluation.kpi_note}
          </p>
        )}

        {stage !== "UPCOMING" && kpi?.supported && (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <span className={MUTED}>{kpi.name}</span>
            <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
              {formatKpiValue(performance.kpi_actual, kpi.unit, currency)}
            </span>
            <span className={MUTED}>target {formatKpiValue(evaluation.target_value, kpi.unit, currency)}</span>
            {performance.roi_percent !== null && <span className={MUTED}>ROI {performance.roi_percent}%</span>}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {/* Remount when the saved settings change, so the form starts from them */}
          <SuccessSettings
            key={`${evaluation.target_value}-${evaluation.maturity_days}-${evaluation.updated_at}`}
            initiative={initiative}
            performance={performance}
            canEdit={canEdit}
          />
          {stage === "FINAL" || performance.latest_decision ? (
            <DecisionPanel initiative={initiative} performance={performance} canEdit={canEdit} />
          ) : (
            // The decision belongs to the final verdict; an early one is possible but tucked away
            <details className="rounded-lg border border-dashed border-slate-200 p-4 text-sm dark:border-zinc-700">
              <summary className={`cursor-pointer font-medium ${MUTED}`}>
                Scale or cut? Decided once the final verdict is in{finalOn ? ` (${finalOn})` : ""}. Record an early decision…
              </summary>
              <div className="mt-3">
                <DecisionPanel initiative={initiative} performance={performance} canEdit={canEdit} />
              </div>
            </details>
          )}
        </div>
      </div>
    </Section>
  );
}
