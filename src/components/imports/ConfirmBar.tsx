import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmBarProps {
  /** How many rows confirming would import */
  count: number;
  /** What a row is, singular and plural: ["cost", "costs"] */
  noun: [string, string];
  onConfirm: () => void;
  onCancel: () => void;
  onChooseAnother: () => void;
  pending?: boolean;
  /** Shown next to the buttons, e.g. "3 rows with problems won't be imported" */
  note?: React.ReactNode;
}

/** "Import 24 costs" / Cancel / Upload a different file */
export default function ConfirmBar({ count, noun, onConfirm, onCancel, onChooseAnother, pending, note }: ConfirmBarProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
      <div className="text-sm text-slate-500 dark:text-zinc-400">{note}</div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={onChooseAnother} disabled={pending}>
          <Upload className="mr-1.5 h-4 w-4" />
          Upload a different file
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm} disabled={pending || count === 0}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Import {count} {count === 1 ? noun[0] : noun[1]}
        </Button>
      </div>
    </div>
  );
}
