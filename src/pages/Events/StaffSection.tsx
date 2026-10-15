import { useState } from "react";
import { BedDouble, Car, Loader2, MoreHorizontal, Package, Pencil, Plane, Plus, Trash2, Users, Wallet } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventStaff, useRemoveEventStaff } from "@/hooks/useEventManagement";
import { useAuth } from "@/lib/AuthContext";
import type { StaffAssignment } from "@/types/eventManagement";
import type { InitiativeListItem } from "@/types/initiatives";
import { Section } from "../Initiatives/detailParts";
import { MUTED } from "../Initiatives/detailStyles";
import { initials } from "../Initiatives/format";
import { dateRange, READINESS, ROLE_LABELS } from "./eventDisplay";
import StaffDialog from "./StaffDialog";

function Need({ on, icon: Icon, label }: { on: boolean; icon: React.ElementType; label: string }) {
  if (!on) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function StaffRow({ event, person, canEdit }: { event: InitiativeListItem; person: StaffAssignment; canEdit: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useRemoveEventStaff(event.id);
  const readiness = READINESS[person.readiness];
  const name = person.full_name || person.email;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center dark:border-zinc-800">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          {initials(person.full_name ?? person.email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-slate-900 dark:text-zinc-100">{name}</span>
            <span className={`text-xs ${MUTED}`}>{ROLE_LABELS[person.role]}</span>
          </div>
          {person.travel_needed ? (
            <>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-zinc-300">
                {person.departs_from ? `From ${person.departs_from}` : <span className="text-amber-700 dark:text-amber-400">Travelling from: not set</span>}
                {" · "}
                {person.arrive_on || person.depart_on ? dateRange(person.arrive_on, person.depart_on) : <span className="text-amber-700 dark:text-amber-400">dates not set</span>}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Need on={person.needs_flight} icon={Plane} label="Flight" />
                <Need on={person.needs_hotel} icon={BedDouble} label="Hotel" />
                <Need on={person.needs_ground_transport} icon={Car} label="Ground transport" />
                <Need on={person.needs_stipend} icon={Wallet} label="Stipend" />
                <Need on={Boolean(person.cargo_note)} icon={Package} label={person.cargo_note ?? "Cargo"} />
              </div>
            </>
          ) : (
            <p className={`mt-0.5 text-sm ${MUTED}`}>
              Local or joining online. Nothing to book.
              {person.cargo_note && ` · cargo: ${person.cargo_note}`}
            </p>
          )}
          {person.notes && <p className={`mt-1 text-xs ${MUTED}`}>“{person.notes}”</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
        <Badge variant="outline" className={readiness.tone} title={person.missing.length ? `Missing: ${person.missing.join(", ")}` : undefined}>
          {readiness.label}
        </Badge>
        {person.readiness === "MISSING_DETAILS" && <span className="text-xs text-amber-700 dark:text-amber-400">Add {person.missing.join(", ")}</span>}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit trip
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-red-600 focus:text-red-600 dark:text-red-400">
                <Trash2 className="mr-2 h-4 w-4" /> Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <StaffDialog event={event} staff={person} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {name} from this event?</AlertDialogTitle>
            <AlertDialogDescription>
              {person.travel_status === "BOOKED"
                ? "Their travel is already booked. The travel team will see they're no longer going, but tell them too so they cancel the bookings."
                : "The travel team will no longer see them on this event."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                remove.mutate(person.id, {
                  onSuccess: () => {
                    toast.success(`${name} removed from the team`);
                    setConfirmOpen(false);
                  },
                  onError: (err) => toast.error(err.message || "Could not remove them."),
                });
              }}
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export default function StaffSection({ event }: { event: InitiativeListItem }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const { data: staff, isLoading, error, refetch } = useEventStaff(event.id);
  const [addOpen, setAddOpen] = useState(false);
  const travelling = (staff ?? []).filter((s) => s.travel_needed);
  const missing = travelling.filter((s) => s.readiness === "MISSING_DETAILS").length;

  return (
    <Section
      title="Team & travel"
      icon={Users}
      action={
        canEdit ? (
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add person
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          <Plane className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Add who's going and what they need. The travel team books flights, hotels, Ubers, stipends and cargo in the travel management system. It
            gets everyone marked <span className="font-semibold">Ready for travel booking</span>.
          </span>
        </p>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : error || !staff ? (
          <div className="flex items-center gap-3">
            <p className={`text-sm ${MUTED}`}>Could not load the team.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 p-8 text-center dark:border-zinc-700">
            <Users className="h-6 w-6 text-slate-400" />
            <p className="font-medium text-slate-900 dark:text-zinc-100">No one on the team yet</p>
            <p className={`max-w-sm text-sm ${MUTED}`}>Add the people going. Their travel dates start as the day before the event to its last day.</p>
            {canEdit && (
              <Button size="sm" className="mt-1 gap-2" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add the first person
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className={`text-sm ${MUTED}`}>
              {staff.length} {staff.length === 1 ? "person" : "people"} going · {travelling.length} travelling
              {missing > 0 && <span className="text-amber-700 dark:text-amber-400"> · {missing} still need travel details</span>}
            </p>
            <ul className="flex flex-col gap-2">
              {staff.map((person) => (
                <StaffRow key={person.id} event={event} person={person} canEdit={canEdit} />
              ))}
            </ul>
          </>
        )}
      </div>
      {canEdit && <StaffDialog event={event} open={addOpen} onOpenChange={setAddOpen} />}
    </Section>
  );
}
