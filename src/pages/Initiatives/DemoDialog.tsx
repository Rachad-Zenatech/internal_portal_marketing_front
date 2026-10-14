import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCreateDemo, useUpdateDemo } from "@/hooks/useDemos";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { Demo, DemoCreate } from "@/types/demos";
import type { InitiativeListItem, OwnerOption } from "@/types/initiatives";
import OwnerPicker from "./OwnerPicker";
import { Field } from "./SpendLineDialog";

// The picked option in a segmented control, so it stands out in light and dark
const SELECTED = "data-[state=on]:bg-slate-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900";

export const COMPANY_HELP = "Company only — keep people's names and contact details in HubSpot.";

interface FormState {
  typeId: string;
  when: string;
  company: string;
  hubspotUrl: string;
  brandId: string;
  productNote: string;
  givenBy: OwnerOption | null;
  outcomeId: string;
  note: string;
}

type FieldName = keyof FormState;

const FIELD_IDS: Partial<Record<FieldName, string>> = {
  typeId: "demo-type",
  when: "demo-when",
  hubspotUrl: "demo-hubspot",
};

/** "2026-11-04T10:05" in the viewer's own time zone, for a datetime-local input */
function toLocalInput(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

const toText = (value: string) => value.trim() || null;

function formFromDemo(demo: Demo): FormState {
  return {
    typeId: String(demo.demo_type_id),
    when: toLocalInput(new Date(demo.demo_at)),
    company: demo.company ?? "",
    hubspotUrl: demo.hubspot_url ?? "",
    brandId: demo.brand_id === null ? "" : String(demo.brand_id),
    productNote: demo.product_note ?? "",
    givenBy: demo.given_by ? { id: demo.given_by, full_name: demo.given_by_name, email: "" } : null,
    outcomeId: String(demo.outcome_id),
    note: demo.note ?? "",
  };
}

function validate(form: FormState): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!form.typeId) errors.typeId = "Choose the kind of demo.";
  if (!form.when) errors.when = "Choose when it happened.";
  if (form.hubspotUrl.trim() && !/^https:\/\//i.test(form.hubspotUrl.trim())) errors.hubspotUrl = "HubSpot link must start with https://";
  return errors;
}

interface DemoFormProps {
  initiative: InitiativeListItem;
  demo?: Demo;
  onDone: () => void;
}

// Mounted each time the dialog opens, so the fields start from the latest values
function DemoForm({ initiative, demo, onDone }: DemoFormProps) {
  const { data: reference } = useReferenceData();
  const { user } = useAuth();
  const createDemo = useCreateDemo(initiative.id);
  const updateDemo = useUpdateDemo(initiative.id);
  const pending = createDemo.isPending || updateDemo.isPending;
  const pendingOutcome = reference?.demo_outcomes.find((o) => o.code === "PENDING");

  const [form, setForm] = useState<FormState>(() =>
    demo
      ? formFromDemo(demo)
      : {
          typeId: "",
          when: toLocalInput(new Date()),
          company: "",
          hubspotUrl: "",
          brandId: String(initiative.brand_id),
          productNote: "",
          givenBy: user ? { id: user.id, full_name: user.full_name, email: user.email } : null,
          outcomeId: pendingOutcome ? String(pendingOutcome.id) : "",
          note: "",
        },
  );
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (patch: Partial<FormState>) => {
    setFormError(null);
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as FieldName[]) delete next[key];
      return next;
    });
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const problems = validate(form);
    if (Object.keys(problems).length) {
      setErrors(problems);
      const first = (Object.keys(FIELD_IDS) as FieldName[]).find((f) => problems[f]);
      if (first) setTimeout(() => document.getElementById(FIELD_IDS[first] as string)?.focus(), 0);
      return;
    }
    const payload: DemoCreate = {
      demo_type_id: Number(form.typeId),
      demo_at: new Date(form.when).toISOString(),
      company: toText(form.company),
      hubspot_url: toText(form.hubspotUrl),
      brand_id: form.brandId ? Number(form.brandId) : null,
      product_note: toText(form.productNote),
      given_by: form.givenBy?.id ?? null,
      outcome_id: form.outcomeId ? Number(form.outcomeId) : null,
      note: toText(form.note),
    };
    const onError = (err: Error) => setFormError(err.message || "Could not save the demo.");

    if (demo) {
      // Send only what changed; the time compares as an instant, not as text
      const original = formFromDemo(demo);
      const changes = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => {
          if (key === "demo_at") return form.when !== original.when;
          return value !== (demo[key as keyof Demo] ?? null);
        }),
      );
      if (Object.keys(changes).length === 0) {
        onDone();
        return;
      }
      updateDemo.mutate(
        { demoId: demo.id, data: changes },
        {
          onSuccess: () => {
            toast.success("Demo updated");
            onDone();
          },
          onError,
        },
      );
    } else {
      createDemo.mutate(payload, {
        onSuccess: () => {
          toast.success("Demo logged");
          onDone();
        },
        onError,
      });
    }
  };

  const invalid = (field: FieldName) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${FIELD_IDS[field]}-error` } : {});

  return (
    <>
      <DialogHeader>
        <DialogTitle>{demo ? "Edit demo" : "Log a demo"}</DialogTitle>
        <DialogDescription>
          {demo
            ? "Update this demo — for example, record what came of it after the event."
            : `A demo given at ${initiative.name}. The demo count, cost per demo and customers won fill in automatically.`}
        </DialogDescription>
      </DialogHeader>

      <form id="demo-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Kind of demo" htmlFor="demo-type" error={errors.typeId} className="sm:col-span-2">
          <ToggleGroup
            id="demo-type"
            type="single"
            variant="outline"
            value={form.typeId}
            onValueChange={(v) => v && set({ typeId: v })}
            className="w-full"
            {...invalid("typeId")}
          >
            {(reference?.demo_types ?? []).map((t) => (
              <ToggleGroupItem key={t.id} value={String(t.id)} className={`flex-1 ${SELECTED}`}>
                {t.name.replace(" demo", "")}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field label="When" htmlFor="demo-when" error={errors.when}>
          <Input id="demo-when" type="datetime-local" value={form.when} onChange={(e) => set({ when: e.target.value })} {...invalid("when")} />
        </Field>

        <Field label="Given by" htmlFor="demo-given-by">
          <OwnerPicker id="demo-given-by" value={form.givenBy} onChange={(owner) => set({ givenBy: owner })} />
        </Field>

        <Field label="Company" htmlFor="demo-company" hint={COMPANY_HELP}>
          <Input id="demo-company" value={form.company} onChange={(e) => set({ company: e.target.value })} placeholder="e.g. Northwind Facilities" maxLength={255} />
        </Field>

        <Field label="HubSpot link (optional)" htmlFor="demo-hubspot" error={errors.hubspotUrl} hint="The contact or deal in HubSpot.">
          <Input
            id="demo-hubspot"
            type="url"
            value={form.hubspotUrl}
            onChange={(e) => set({ hubspotUrl: e.target.value })}
            placeholder="https://app.hubspot.com/…"
            maxLength={500}
            {...invalid("hubspotUrl")}
          />
        </Field>

        <Field label="Brand" htmlFor="demo-brand">
          <Select value={form.brandId || undefined} onValueChange={(v) => set({ brandId: v })}>
            <SelectTrigger id="demo-brand" className="w-full">
              <SelectValue placeholder="Choose a brand" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {(reference?.brands ?? []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Product shown" htmlFor="demo-product">
          <Input id="demo-product" value={form.productNote} onChange={(e) => set({ productNote: e.target.value })} placeholder="e.g. Desk booking app" maxLength={255} />
        </Field>

        <Field label="Outcome" htmlFor="demo-outcome" hint="Update it after the event as follow-ups and deals happen." className="sm:col-span-2">
          <Select value={form.outcomeId || undefined} onValueChange={(v) => set({ outcomeId: v })}>
            <SelectTrigger id="demo-outcome" className="w-full">
              <SelectValue placeholder="No outcome yet" />
            </SelectTrigger>
            <SelectContent position="popper">
              {(reference?.demo_outcomes ?? []).map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Note" htmlFor="demo-note" className="sm:col-span-2">
          <Textarea id="demo-note" value={form.note} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="Anything worth remembering" />
        </Field>
      </form>

      {formError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {formError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" form="demo-form" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {demo ? "Save changes" : "Log demo"}
        </Button>
      </DialogFooter>
    </>
  );
}

interface DemoDialogProps {
  initiative: InitiativeListItem;
  /** Edit this demo; leave out to log a new one */
  demo?: Demo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DemoDialog({ initiative, demo, open, onOpenChange }: DemoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {open && <DemoForm initiative={initiative} demo={demo} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
