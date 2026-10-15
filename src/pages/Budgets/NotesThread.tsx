import { useState } from "react";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateBudgetComment, useDeleteBudgetComment } from "@/hooks/useBudgets";
import { useAuth } from "@/lib/AuthContext";
import type { BudgetComment } from "@/types/budgets";
import { initials } from "../Initiatives/format";
import { formatFullWhen, formatWhen } from "./budgetDisplay";

const MAX_LENGTH = 2000;

interface NotesThreadProps {
  /** Notes on one budget, or on the whole month when budgetId is left out */
  target: { budgetId: string } | { month: string };
  comments: BudgetComment[];
  /** Used for the field's label and placeholder */
  placeholder: string;
  emptyText: string;
}

/** An add-note box that's always open, then the notes, newest first */
export default function NotesThread({ target, comments, placeholder, emptyText }: NotesThreadProps) {
  const { user } = useAuth();
  const create = useCreateBudgetComment();
  const remove = useDeleteBudgetComment();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const fieldId = "budgetId" in target ? `budget-note-${target.budgetId}` : `month-note-${target.month}`;

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = body.trim();
    if (!text) {
      setError("Write a note first.");
      return;
    }
    create.mutate(
      { ...("budgetId" in target ? { budget_id: target.budgetId } : { month: target.month }), body: text },
      {
        onSuccess: () => {
          setBody("");
          setError(null);
        },
        onError: (err) => setError(err.message || "Could not add the note."),
      },
    );
  };

  const canDelete = (c: BudgetComment) => Boolean(user && ((c.author_id !== null && user.id === c.author_id) || user.is_super_admin));

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="sr-only">
          Add a note
        </label>
        <Textarea
          id={fieldId}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
          placeholder={placeholder}
          maxLength={MAX_LENGTH}
          rows={3}
          className="min-h-20 bg-card"
          aria-invalid={Boolean(error)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {body.length > MAX_LENGTH - 200 ? `${MAX_LENGTH - body.length} characters left` : "Everyone who can see budgets can read notes."}
            </p>
          )}
          <Button type="submit" size="sm" disabled={create.isPending || !body.trim()} className="gap-1.5">
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add note
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4 shrink-0" />
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
                aria-hidden
              >
                {c.author_name ? initials(c.author_name) : "?"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs">
                    <span className="font-medium text-foreground">{c.author_name ?? "Former user"}</span>
                    <span className="text-muted-foreground"> · </span>
                    <time dateTime={c.created_at} title={formatFullWhen(c.created_at)} className="text-muted-foreground">
                      {formatWhen(c.created_at)}
                    </time>
                  </p>
                  {canDelete(c) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-red-600"
                      onClick={() => setConfirmId(c.id)}
                      aria-label="Delete note"
                      title="Delete note"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed for everyone. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!confirmId) return;
                remove.mutate(confirmId, {
                  onSuccess: () => {
                    toast.success("Note deleted");
                    setConfirmId(null);
                  },
                  onError: (err) => {
                    toast.error(err.message || "Could not delete the note.");
                    setConfirmId(null);
                  },
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
