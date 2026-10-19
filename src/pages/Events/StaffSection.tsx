import { useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventStaff, useRemoveEventStaff } from "@/hooks/useEventManagement";
import { useAuth } from "@/lib/AuthContext";
import type { StaffAssignment } from "@/types/eventManagement";
import type { InitiativeListItem } from "@/types/initiatives";
import { Section } from "../Initiatives/detailParts";
import { MUTED } from "../Initiatives/detailStyles";
import { initials } from "../Initiatives/format";
import { ROLE_LABELS } from "./eventDisplay";
import StaffDialog from "./StaffDialog";

function StaffRow({ event, person, canEdit }: { event: InitiativeListItem; person: StaffAssignment; canEdit: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useRemoveEventStaff(event.id);
  const name = person.full_name || person.email;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-zinc-800">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          {initials(person.full_name ?? person.email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-slate-900 dark:text-zinc-100">{name}</span>
            <span className={`text-xs ${MUTED}`}>{ROLE_LABELS[person.role]}</span>
          </div>
          {person.notes && <p className={`mt-1 text-xs ${MUTED}`}>“{person.notes}”</p>}
        </div>
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-red-600 focus:text-red-600 dark:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" /> Remove from team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <StaffDialog event={event} staff={person} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {name} from this event?</AlertDialogTitle>
            <AlertDialogDescription>They will no longer be listed on this event's team.</AlertDialogDescription>
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

  return (
    <Section
      title="Team"
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
            <p className={`max-w-sm text-sm ${MUTED}`}>Add the people working this event and their roles.</p>
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
              {staff.length} {staff.length === 1 ? "person" : "people"} going
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
