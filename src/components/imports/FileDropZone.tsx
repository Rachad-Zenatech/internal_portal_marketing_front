import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "./importStatus";

interface FileDropZoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Allowed extensions, lower case with the dot */
  accept?: string[];
  maxBytes?: number;
  disabled?: boolean;
  /** A problem from the server (e.g. no header found), shown like a local one */
  error?: string | null;
}

const DEFAULT_ACCEPT = [".xlsx", ".csv"];
const DEFAULT_MAX = 5 * 1024 * 1024;

/** Drag a spreadsheet in or browse for one; checks the type and size before anything is uploaded */
export default function FileDropZone({ file, onFileChange, accept = DEFAULT_ACCEPT, maxBytes = DEFAULT_MAX, disabled, error }: FileDropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const choose = (picked: File | undefined) => {
    if (!picked) return;
    const name = picked.name.toLowerCase();
    if (name.endsWith(".xls")) {
      setLocalError("This is an old Excel file (.xls). Save it as .xlsx and try again.");
    } else if (!accept.some((ext) => name.endsWith(ext))) {
      setLocalError(`Choose a ${accept.map((ext) => ext.slice(1).toUpperCase()).join(" or ")} file.`);
    } else if (picked.size > maxBytes) {
      setLocalError(`The file is ${formatFileSize(picked.size)}; the limit is ${formatFileSize(maxBytes)}.`);
    } else if (picked.size === 0) {
      setLocalError("The file is empty.");
    } else {
      setLocalError(null);
      onFileChange(picked);
      return;
    }
    onFileChange(null);
  };

  const problem = localError ?? error;

  if (file) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-zinc-800">
          <FileSpreadsheet className="h-8 w-8 shrink-0 text-green-600 dark:text-green-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-zinc-100">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">{formatFileSize(file.size)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onFileChange(null)} disabled={disabled} aria-label={`Remove ${file.name}`}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {problem && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {problem}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && input.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) choose(e.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          dragging
            ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/30"
            : problem
              ? "border-red-300 dark:border-red-800"
              : "border-slate-200 hover:border-slate-300 dark:border-zinc-700 dark:hover:border-zinc-600"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <Upload className="h-8 w-8 text-slate-400" />
        <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">Drag a file here, or click to browse</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          {accept.map((ext) => ext.slice(1).toUpperCase()).join(" or ")} · up to {formatFileSize(maxBytes)}
        </p>
        <input
          ref={input}
          type="file"
          accept={accept.join(",")}
          className="hidden"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = ""; // so choosing the same file again still triggers a change
          }}
        />
      </div>
      {problem && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {problem}
        </p>
      )}
    </div>
  );
}
