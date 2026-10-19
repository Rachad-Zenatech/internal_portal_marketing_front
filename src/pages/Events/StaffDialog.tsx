import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  notes: string;
}

function formFrom(staff?: StaffAssignment): FormState {
  if (staff) {
    return {
      person: { id: staff.user_id, full_name: staff.full_name, email: staff.email },
      role: staff.role,
      notes: staff.notes ?? "",
    };
  }
  return { person: null, role: "BOOTH_STAFF", notes: "" };
}

function StaffForm({ event, staff, onDone }: { event: InitiativeListItem; staff?: StaffAssignment; onDone: () => void }) {
  const add = useAddEventStaff(event.id);
  const update = useUpdateEventStaff(event.id);
  const pending = add.isPending || update.isPending;
  const [form, setForm] = useState<FormState>(() => formFrom(staff));
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<FormState>) => {
    setError(null);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.person) return setError("Choose who's going.");
    const details = { role: form.role, notes: form.notes.trim() || null };
    const onError = (err: Error) => setError(err.message || "Could not save.");
    if (staff) {
      update.mutate(
        { assignmentId: staff.id, data: details },
        { onSuccess: () => (toast.success("Changes saved"), onDone()), onError },
      );
    } else {
      const payload: StaffAssignmentCreate = { user_id: form.person.id, ...details };
      add.mutate(payload, { onSuccess: () => (toast.success(`${form.person?.full_name || "They"} added to the team`), onDone()), onError });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{staff ? `Edit ${staff.full_name || staff.email}` : "Add someone to the team"}</DialogTitle>
        <DialogDescription>Who's working this event and what they do there.</DialogDescription>
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
        <Field label="Notes (optional)" htmlFor="staff-notes" className="sm:col-span-2">
          <Textarea id="staff-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="e.g. covering the demo area on day 2" />
        </Field>
      </form>

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
  /** Edit this person's role and notes; leave out to add someone */
  staff?: StaffAssignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StaffDialog({ event, staff, open, onOpenChange }: StaffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open && <StaffForm event={event} staff={staff} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
