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
  const deleteInitiative = useDeleteInitiative(initiative.id);
  if (!hasPermission("INITIATIVES_DELETE")) return null;

  const isEvent = Boolean(initiative.event_code);
  const noun = isEvent ? "event" : "initiative";
  return (
    <>
      <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
                    setConfirmOpen(false);
                    navigate(backTo, { replace: true });
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
    </>
  );
}
