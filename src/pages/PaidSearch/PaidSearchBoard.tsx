import { useEffect, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Table2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DASH_CARD } from "@/components/dashboard/tones";
import { Button } from "@/components/ui/button";
import { cleanValue, emptyEntry, PAID_SEARCH_FIELDS, type PaidSearchEntry, type PaidSearchField, type PaidSearchKey } from "./paidSearchFields";
import PaidSearchUpload from "./PaidSearchUpload";

// Kept in this browser for now, until the board has its own API
const STORAGE_KEY = "marketing.paidSearchBoard.v1";
const NEW_ROW_DEFAULTS = { channel: "Paid Search" };

function loadEntries(): PaidSearchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PaidSearchEntry[]) : [];
    return Array.isArray(parsed) ? parsed.map((e) => ({ ...emptyEntry(), ...e })) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: PaidSearchEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage blocked or full: the board still works for this visit
  }
}

const WIDTHS: Partial<Record<PaidSearchKey, string>> = {
  campaign_name: "min-w-56",
  tracking_detail: "min-w-56",
  report_link: "min-w-56",
  brand: "min-w-36",
  market: "min-w-36",
  primary_kpi: "min-w-36",
  sub_channel: "min-w-32",
};

const widthOf = (f: PaidSearchField) => WIDTHS[f.key as PaidSearchKey] ?? (f.kind === "date" ? "min-w-36" : f.kind === "number" ? "min-w-28" : "min-w-32");

/** One editable cell; numbers and dates are checked when you leave the cell */
function Cell({ field, value, onChange }: { field: PaidSearchField; value: string; onChange: (value: string) => void }) {
  const problem = value ? cleanValue(field, value).problem : undefined;
  const base =
    "h-8 w-full rounded-md border bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
  const border = problem ? "border-red-400 dark:border-red-700" : "border-transparent hover:border-border";
  return (
    <div className="flex items-center gap-1">
      <input
        type={field.kind === "date" ? "date" : "text"}
        inputMode={field.kind === "number" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const cleaned = cleanValue(field, e.target.value.trim());
          if (!cleaned.problem && cleaned.value !== value) onChange(cleaned.value);
        }}
        aria-label={field.header}
        aria-invalid={problem ? true : undefined}
        title={problem}
        className={`${base} ${border} ${field.kind === "number" ? "text-right tabular-nums" : ""}`}
      />
      {field.kind === "url" && /^https?:\/\//i.test(value) && (
        <a href={value} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Open report">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

/** The Paid Search data entry board: type entries in, or upload them from a spreadsheet */
export default function PaidSearchBoard({ canEdit }: { canEdit: boolean }) {
  const [entries, setEntries] = useState<PaidSearchEntry[]>(loadEntries);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => saveEntries(entries), [entries]);

  const updateCell = (id: string, key: PaidSearchKey, value: string) => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: value } : e)));
  const addRow = () => setEntries((prev) => [...prev, emptyEntry(NEW_ROW_DEFAULTS)]);
  const removeRow = (entry: PaidSearchEntry) => {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    toast.success("Entry removed", {
      description: entry.campaign_name || undefined,
      action: { label: "Undo", onClick: () => setEntries((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry])) },
    });
  };
  const importEntries = (added: PaidSearchEntry[]) => {
    setEntries((prev) => [...prev, ...added]);
    const ids = new Set(added.map((e) => e.id));
    toast.success(`Imported ${added.length} ${added.length === 1 ? "entry" : "entries"}`, {
      action: { label: "Undo", onClick: () => setEntries((prev) => prev.filter((e) => !ids.has(e.id))) },
      duration: 10_000,
    });
  };
  const notConnected = (service: string) =>
    toast.info(`${service} sync isn't connected yet`, { description: "The button is in place; syncing will be added when the integration is built." });

  return (
    <section className={`${DASH_CARD} flex flex-col overflow-hidden`} aria-labelledby="paid-search-board-title">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-muted-foreground" />
          <h2 id="paid-search-board-title" className="text-sm font-semibold text-foreground">
            Paid Search board
          </h2>
          <span className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload spreadsheet
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => notConnected("HubSpot")}>
              <RefreshCw className="h-4 w-4" />
              Sync HubSpot
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => notConnected("Google")}>
              <RefreshCw className="h-4 w-4" />
              Sync Google
            </Button>
            <Button size="sm" className="gap-1.5" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Add row
            </Button>
          </div>
        )}
      </div>

      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left font-medium text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr className="border-b border-border">
              <th className="w-10 px-2 py-2 text-right">#</th>
              {PAID_SEARCH_FIELDS.map((f) => (
                <th key={f.key} className={`whitespace-nowrap px-2 py-2 ${f.kind === "number" ? "text-right" : ""}`}>
                  {f.header}
                </th>
              ))}
              {canEdit && <th className="w-10 px-2 py-2" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={PAID_SEARCH_FIELDS.length + 2} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No entries yet. {canEdit ? "Add a row or upload a spreadsheet." : ""}
                </td>
              </tr>
            ) : (
              entries.map((entry, i) => (
                <tr key={entry.id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{i + 1}</td>
                  {PAID_SEARCH_FIELDS.map((f) => (
                    <td key={f.key} className={`px-1 py-1 ${widthOf(f)}`}>
                      {canEdit ? (
                        <Cell field={f} value={entry[f.key]} onChange={(v) => updateCell(entry.id, f.key, v)} />
                      ) : (
                        <span className={`block px-2 ${f.kind === "number" ? "text-right tabular-nums" : ""}`}>{entry[f.key] || "-"}</span>
                      )}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-1 py-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => removeRow(entry)}
                        aria-label={`Remove ${entry.campaign_name || `row ${i + 1}`}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canEdit && <PaidSearchUpload open={uploadOpen} onOpenChange={setUploadOpen} onImport={importEntries} />}
    </section>
  );
}
