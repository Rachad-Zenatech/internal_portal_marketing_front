import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAddEventStaff, useUpdateEventStaff } from "@/hooks/useEventManagement";
import type { StaffAssignment, StaffAssignmentCreate, StaffRole } from "@/types/eventManagement";
import type { InitiativeListItem, OwnerOption } from "@/types/initiatives";
import OwnerPicker from "../Initiatives/OwnerPicker";
import { Field } from "../Initiatives/SpendLineDialog";
import { ROLE_LABELS, ROLES } from "./eventDisplay";

interface FormState {
  person: OwnerOption | null;
  role: StaffRole;
  travelNeeded: boolean;
  departsFrom: string;
  arriveOn: string;
  departOn: string;
  needsFlight: boolean;
  needsHotel: boolean;
  needsGround: boolean;
  needsStipend: boolean;
  cargoNote: string;
  notes: string;
}

/** The day before a date, as "YYYY-MM-DD" (people usually arrive the day before to set up) */
function dayBefore(value: string | null) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formFrom(event: InitiativeListItem, staff?: StaffAssignment): FormState {
  if (staff) {
    return {
      person: { id: staff.user_id, full_name: staff.full_name, email: staff.email },
      role: staff.role,
      travelNeeded: staff.travel_needed,
      departsFrom: staff.departs_from ?? "",
      arriveOn: staff.arrive_on ?? "",
      departOn: staff.depart_on ?? "",
      needsFlight: staff.needs_flight,
      needsHotel: staff.needs_hotel,
      needsGround: staff.needs_ground_transport,
      needsStipend: staff.needs_stipend,
      cargoNote: staff.cargo_note ?? "",
      notes: staff.notes ?? "",
    };
  }
  return {
    person: null,
    role: "BOOTH_STAFF",
    travelNeeded: true,
    departsFrom: "",
    arriveOn: dayBefore(event.start_date),
    departOn: event.end_date ?? event.start_date ?? "",
    needsFlight: true,
    needsHotel: true,
    needsGround: true,
    needsStipend: true,
    cargoNote: "",
    notes: "",
  };
}

const text = (value: string) => value.trim() || null;

const NEEDS: { key: "needsFlight" | "needsHotel" | "needsGround" | "needsStipend"; label: string; hint: string }[] = [
  { key: "needsFlight", label: "Flight", hint: "Return flight" },
  { key: "needsHotel", label: "Hotel", hint: "For the nights away" },
  { key: "needsGround", label: "Ground transport", hint: "Uber, taxi or car" },
  { key: "needsStipend", label: "Stipend", hint: "Daily allowance for meals" },
];

function StaffForm({ event, staff, onDone }: { event: InitiativeListItem; staff?: StaffAssignment; onDone: () => void }) {
  const add = useAddEventStaff(event.id);
  const update = useUpdateEventStaff(event.id);
  const pending = add.isPending || update.isPending;
  const [form, setForm] = useState<FormState>(() => formFrom(event, staff));
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<FormState>) => {
    setError(null);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.person) return setError("Choose who's going.");
    if (form.travelNeeded && form.arriveOn && form.departOn && form.departOn < form.arriveOn) {
      return setError("The departure date can't be before the arrival date.");
    }
    const details = {
      role: form.role,
      travel_needed: form.travelNeeded,
      departs_from: form.travelNeeded ? text(form.departsFrom) : null,
      arrive_on: form.travelNeeded ? form.arriveOn || null : null,
      depart_on: form.travelNeeded ? form.departOn || null : null,
      needs_flight: form.needsFlight,
      needs_hotel: form.needsHotel,
      needs_ground_transport: form.needsGround,
      needs_stipend: form.needsStipend,
      cargo_note: text(form.cargoNote),
      notes: text(form.notes),
    };
    const onError = (err: Error) => setError(err.message || "Could not save.");
    if (staff) {
      update.mutate(
        { assignmentId: staff.id, data: details },
        { onSuccess: () => (toast.success("Travel details saved"), onDone()), onError },
      );
    } else {
      const payload: StaffAssignmentCreate = { user_id: form.person.id, ...details };
      add.mutate(payload, { onSuccess: () => (toast.success(`${form.person?.full_name || "They"} added to the team`), onDone()), onError });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{staff ? `${staff.full_name || staff.email}'s trip` : "Add someone to the team"}</DialogTitle>
        <DialogDescription>
          The travel team uses these details to book flights, hotels, transport and stipends in the travel management system.
        </DialogDescription>
      </DialogHeader>

      <form id="staff-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Who's going" htmlFor="staff-person" required={!staff}>
          {staff ? (
            <p className="flex h-9 items-center text-sm font-medium text-slate-900 dark:text-zinc-100">{staff.full_name || staff.email}</p>
          ) : (
            <OwnerPicker id="staff-person" value={form.person} onChange={(person) => set({ person })} />
          )}
        </Field>
        <Field label="Role at the event" htmlFor="staff-role" required>
          <Select value={form.role} onValueChange={(v) => set({ role: v as StaffRole })}>
            <SelectTrigger id="staff-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <label htmlFor="staff-travel" className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 sm:col-span-2 dark:border-zinc-800">
          <Checkbox id="staff-travel" checked={form.travelNeeded} onCheckedChange={(v) => set({ travelNeeded: v === true })} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-slate-900 dark:text-zinc-100">Needs travel</span>
            <span className="block text-xs text-slate-500 dark:text-zinc-400">Untick for people who are local or joining online. Nothing gets booked for them.</span>
          </span>
        </label>

        {form.travelNeeded && (
          <>
            <Field label="Travelling from" htmlFor="staff-from" hint="City or airport, e.g. Toronto (YYZ)" className="sm:col-span-2">
              <Input id="staff-from" value={form.departsFrom} onChange={(e) => set({ departsFrom: e.target.value })} placeholder="Toronto (YYZ)" maxLength={120} />
            </Field>
            <Field label="Arrives" htmlFor="staff-arrive" hint="Usually the day before, to set up">
              <DatePicker id="staff-arrive" value={form.arriveOn} onChange={(v) => set({ arriveOn: v })} clearable />
            </Field>
            <Field label="Leaves" htmlFor="staff-depart">
              <DatePicker id="staff-depart" value={form.departOn} min={form.arriveOn || undefined} onChange={(v) => set({ departOn: v })} clearable />
            </Field>
            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-zinc-300">What they need</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {NEEDS.map((n) => (
                  <label
                    key={n.key}
                    htmlFor={`staff-${n.key}`}
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                      form[n.key]
                        ? "border-foreground/40 bg-muted"
                        : "border-slate-200 dark:border-zinc-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Checkbox id={`staff-${n.key}`} checked={form[n.key]} onCheckedChange={(v) => set({ [n.key]: v === true } as Partial<FormState>)} />
                      <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">{n.label}</span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">{n.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <Field label="Cargo to ship (optional)" htmlFor="staff-cargo" hint="Gear or materials, e.g. 2 demo drones in Pelican cases" className="sm:col-span-2">
          <Input id="staff-cargo" value={form.cargoNote} onChange={(e) => set({ cargoNote: e.target.value })} maxLength={255} />
        </Field>
        <Field label="Notes for the travel team (optional)" htmlFor="staff-notes" className="sm:col-span-2">
          <Textarea id="staff-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="e.g. arriving from another event" />
        </Field>
      </form>

      {staff?.travel_status === "BOOKED" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Their travel is already booked. If you change dates or needs, let the travel team know too.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" form="staff-form" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {staff ? "Save" : "Add to team"}
        </Button>
      </DialogFooter>
    </>
  );
}

interface StaffDialogProps {
  event: InitiativeListItem;
  /** Edit this person's trip; leave out to add someone */
  staff?: StaffAssignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StaffDialog({ event, staff, open, onOpenChange }: StaffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {open && <StaffForm event={event} staff={staff} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
