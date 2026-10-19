import { useEffect, useState } from "react";
import { Check, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateInitiative, useUpdateInitiative } from "@/hooks/useInitiatives";
import { useEvaluation } from "@/hooks/usePerformance";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeListItem, InitiativeStatus, OwnerOption } from "@/types/initiatives";
import {
  discardUnsaved,
  EMPTY_FORM,
  firstProblem,
  type FormProblem,
  type FormState,
  formFromInitiative,
  hasContent,
  keepUnsaved,
  payloadFromForm,
  readUnsaved,
  REVIEW_STEP,
  stepProblem,
  WIZARD_STEPS,
} from "./initiativeForm";
import { BasicsStep, BudgetStep, DataSourceStep, EvaluationStep, ObjectivesStep, ReviewStep } from "./InitiativeFormSteps";
import { STATUS_LABELS, STATUS_TRANSITIONS } from "./status";

/** "1 Basics  2 Budget ..." across the top; on phones, "Step 2 of 6" with a bar */
function Stepper({ step, onPick }: { step: number; onPick: (step: number) => void }) {
  return (
    <>
      <div className="sm:hidden">
        <p className="text-xs font-medium text-muted-foreground">
          Step {step + 1} of {WIZARD_STEPS.length}: <span className="text-foreground">{WIZARD_STEPS[step].title}</span>
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }} />
        </div>
      </div>
      <ol className="hidden items-center gap-1 sm:flex" aria-label="Steps">
        {WIZARD_STEPS.map((s, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={s.title} className="flex min-w-0 flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => onPick(index)}
                aria-current={current ? "step" : undefined}
                className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    current ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className={`truncate ${current ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.short}</span>
              </button>
              {index < WIZARD_STEPS.length - 1 && <span className="h-px min-w-2 flex-1 bg-border" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </>
  );
}

interface InitiativeFormProps {
  initiative?: InitiativeListItem;
  /** Start a new initiative in this channel, e.g. "EVENTS" from the Events page */
  defaultChannelCode?: string;
  /** For edits: the saved maturity window, so the wizard starts from it */
  savedMaturityDays?: number;
  onDone: () => void;
}

// Mounted each time the dialog opens, so the fields always start from the latest values
function InitiativeWizard({ initiative, defaultChannelCode, savedMaturityDays, onDone }: InitiativeFormProps) {
  const isEdit = Boolean(initiative);
  const isDraft = initiative?.status === "DRAFT";
  // A draft is finished like a new one: step by step, saved from the review
  const stepByStep = !isEdit || isDraft;
  const { user } = useAuth();
  const { data: reference } = useReferenceData();
  const defaultChannelId = defaultChannelCode ? reference?.channels.find((c) => c.code === defaultChannelCode)?.id : undefined;
  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative(initiative?.id ?? "");
  const mutation = isEdit ? updateInitiative : createInitiative;

  // What was typed into a new form before it was closed, if anything
  const [restored, setRestored] = useState(() => (initiative ? null : readUnsaved(user?.id)));
  const [form, setForm] = useState<FormState>(() => (initiative ? formFromInitiative(initiative, savedMaturityDays) : (restored?.form ?? EMPTY_FORM)));
  const [step, setStep] = useState(() => Math.min(restored?.step ?? 0, REVIEW_STEP));
  // A preset channel applies once reference data has loaded, and only while nothing has been chosen
  const [presetApplied, setPresetApplied] = useState(false);
  if (!initiative && !presetApplied && defaultChannelId !== undefined) {
    setPresetApplied(true);
    if (!form.channelId) setForm((prev) => ({ ...prev, channelId: String(defaultChannelId) }));
  }
  const [owner, setOwner] = useState<OwnerOption | null>(() => {
    if (restored) return restored.owner;
    if (initiative) {
      return initiative.owner_user_id ? { id: initiative.owner_user_id, full_name: initiative.owner_name, email: "" } : null;
    }
    return user ? { id: user.id, full_name: user.full_name, email: user.email } : null;
  });
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // The "kept" message from an earlier close isn't needed once the form is open again
  useEffect(() => {
    toast.dismiss("unsaved-initiative");
  }, []);

  // Keep a new form in the browser as it's filled in
  useEffect(() => {
    if (isEdit) return;
    if (hasContent(form)) keepUnsaved(user?.id, { form, owner, step });
    else discardUnsaved(user?.id);
  }, [isEdit, form, owner, step, user?.id]);

  // Point at the field with the problem once its step is showing
  useEffect(() => {
    if (problem?.field) document.getElementById(problem.field)?.focus();
  }, [problem]);

  const startOver = () => {
    discardUnsaved(user?.id);
    setRestored(null);
    setProblem(null);
    setStep(0);
    setForm({ ...EMPTY_FORM, channelId: defaultChannelId === undefined ? "" : String(defaultChannelId) });
    setOwner(user ? { id: user.id, full_name: user.full_name, email: user.email } : null);
  };

  const set = (patch: Partial<FormState>) => {
    setProblem(null);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  // New initiatives can start in any status; existing ones follow the allowed transitions. Draft isn't picked
  // here: it's what "Save draft" does.
  const statusOptions: InitiativeStatus[] = !initiative
    ? (Object.keys(STATUS_LABELS) as InitiativeStatus[]).filter((s) => s !== "DRAFT")
    : isDraft
      ? STATUS_TRANSITIONS.DRAFT
      : [initiative.status, ...STATUS_TRANSITIONS[initiative.status]];

  // Moving forward checks every step on the way; going back never does
  const goTo = (target: number) => {
    for (let s = step; s < target; s += 1) {
      const found = stepProblem(s, form, reference, owner);
      if (found) {
        setStep(found.step);
        setProblem(found);
        return;
      }
    }
    setProblem(null);
    setStep(target);
  };

  const save = (asDraft: boolean) => {
    const found = firstProblem(form, reference, owner, asDraft);
    if (found) {
      setStep(found.step);
      setProblem(found);
      return;
    }
    const payload = payloadFromForm(form, { asDraft, owner, reference, initiative, savedMaturityDays });
    setSavingDraft(asDraft);
    mutation.mutate(payload, {
      onSuccess: (saved) => {
        if (!isEdit) discardUnsaved(user?.id);
        if (asDraft) {
          toast.success(`"${saved.name}" saved as a draft`, { description: "Open it any time to finish it." });
        } else {
          toast.success(isDraft ? `"${saved.name}" is set up` : isEdit ? `"${saved.name}" saved` : `"${saved.name}" created`);
        }
        onDone();
      },
      onError: (err) => setProblem({ step, message: err instanceof Error ? err.message : "Could not save the initiative." }),
    });
  };

  const stepProps = { form, set, reference, initiative };
  const onReview = step === REVIEW_STEP;
  const busy = mutation.isPending;

  return (
    <>
      <DialogHeader className="gap-3 border-b border-border px-4 pt-4 pb-3 sm:px-6 sm:pt-5">
        <div className="pr-8">
          <DialogTitle>{isDraft ? "Finish draft" : isEdit ? "Edit initiative" : "Create initiative"}</DialogTitle>
          <DialogDescription className="mt-1">
            {isDraft
              ? "Fill in what's missing and choose a status, or save it as a draft again for later."
              : isEdit
                ? "Update this initiative's details. Every change is recorded in the audit log."
                : "Only the first two steps are needed to create it. Everything else can be added later."}
          </DialogDescription>
        </div>
        <Stepper step={step} onPick={goTo} />
      </DialogHeader>

      <form
        id="initiative-form"
        noValidate
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (onReview || !stepByStep) save(false);
          else goTo(step + 1);
        }}
      >
        {restored && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <History className="h-4 w-4 shrink-0" aria-hidden />
              Picked up where you left off.
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0" onClick={startOver}>
              Start over
            </Button>
          </div>
        )}

        <h2 className="text-base font-semibold text-foreground">{WIZARD_STEPS[step].title}</h2>
        {step === 0 && <BasicsStep {...stepProps} />}
        {step === 1 && <BudgetStep {...stepProps} owner={owner} setOwner={setOwner} statusOptions={statusOptions} />}
        {step === 2 && <ObjectivesStep {...stepProps} />}
        {step === 3 && <DataSourceStep {...stepProps} />}
        {step === 4 && <EvaluationStep {...stepProps} />}
        {step === 5 && <ReviewStep {...stepProps} owner={owner} goTo={goTo} />}

        {problem && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {problem.message}
          </p>
        )}
      </form>

      <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <span className="mr-auto hidden text-xs text-muted-foreground sm:block">
          <span className="text-red-500">*</span> Required
        </span>
        {step === 0 ? (
          <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={busy}>
            Back
          </Button>
        )}
        {stepByStep && (
          <Button type="button" variant="outline" onClick={() => save(true)} disabled={busy}>
            {busy && savingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save draft
          </Button>
        )}
        {!onReview && (
          <Button type="button" variant={stepByStep ? "default" : "outline"} onClick={() => goTo(step + 1)} disabled={busy}>
            Next
          </Button>
        )}
        {(onReview || !stepByStep) && (
          <Button type="submit" form="initiative-form" disabled={busy}>
            {busy && !savingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDraft ? "Finish and save" : isEdit ? "Save changes" : "Create initiative"}
          </Button>
        )}
      </div>
    </>
  );
}

/** For edits: wait for the saved maturity window so the wizard starts from it */
function EditWizard({ initiative, onDone }: { initiative: InitiativeListItem; onDone: () => void }) {
  const { data: evaluation, isPending, isError } = useEvaluation(initiative.id);
  if (isPending && !isError) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }
  return <InitiativeWizard initiative={initiative} savedMaturityDays={evaluation?.maturity_days} onDone={onDone} />;
}

interface InitiativeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an initiative to edit it; leave out to create a new one */
  initiative?: InitiativeListItem;
  /** For a new initiative: start in this channel, e.g. "EVENTS" */
  defaultChannelCode?: string;
}

/** The 5-step create wizard (plus review), also used to edit or finish a draft */
export default function InitiativeFormDialog({ open, onOpenChange, initiative, defaultChannelCode }: InitiativeFormDialogProps) {
  const { user } = useAuth();

  // Closing a new form that has something in it keeps it (see readUnsaved); say so, with a way to throw it away
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next || initiative || !readUnsaved(user?.id)) return;
    toast("Your new initiative is kept", {
      id: "unsaved-initiative",
      description: "Open the form again to pick up where you left off.",
      action: { label: "Discard", onClick: () => discardUnsaved(user?.id) },
    });
  };
  const close = () => handleOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-xl">
        {initiative ? <EditWizard initiative={initiative} onDone={close} /> : <InitiativeWizard defaultChannelCode={defaultChannelCode} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}
