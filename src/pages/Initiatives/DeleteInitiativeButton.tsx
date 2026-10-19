import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
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
import { useDeleteInitiative } from "@/hooks/useInitiatives";
import { useAuth } from "@/lib/AuthContext";
import type { InitiativeListItem } from "@/types/initiatives";

interface DeleteInitiativeDialogProps {
  initiative: InitiativeListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once it's deleted, e.g. to leave its page */
  onDeleted?: () => void;
}

/** Confirms, then deletes an initiative or event in any status. Check INITIATIVES_DELETE before offering it. */
export function DeleteInitiativeDialog({ initiative, open, onOpenChange, onDeleted }: DeleteInitiativeDialogProps) {
  const deleteInitiative = useDeleteInitiative(initiative.id);
  const isEvent = Boolean(initiative.event_code);
  const noun = isEvent ? "event" : "initiative";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {noun}?</AlertDialogTitle>
          <AlertDialogDescription>
            "{initiative.name}" and its costs, results{isEvent ? ", team and demos" : ""} are deleted. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteInitiative.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={deleteInitiative.isPending}
            onClick={(e) => {
              e.preventDefault();
              deleteInitiative.mutate(undefined, {
                onSuccess: () => {
                  toast.success(`"${initiative.name}" deleted`);
                  onOpenChange(false);
                  onDeleted?.();
                },
                onError: (err) => toast.error(err.message || `Could not delete the ${noun}.`),
              });
            }}
          >
            {deleteInitiative.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteInitiativeButtonProps {
  initiative: InitiativeListItem;
  /** Where to go once it's deleted */
  backTo: string;
}

/** Deletes an initiative or event in any status, after confirming */
export default function DeleteInitiativeButton({ initiative, backTo }: DeleteInitiativeButtonProps) {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!hasPermission("INITIATIVES_DELETE")) return null;

  return (
    <>
      <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      <DeleteInitiativeDialog initiative={initiative} open={confirmOpen} onOpenChange={setConfirmOpen} onDeleted={() => navigate(backTo, { replace: true })} />
    </>
  );
}
