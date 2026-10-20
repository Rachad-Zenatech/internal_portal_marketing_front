import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/components/dashboard/csv";
import ConfirmBar from "@/components/imports/ConfirmBar";
import FileDropZone from "@/components/imports/FileDropZone";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useApplyEventBudgets,
  usePreviewEventBudgets,
} from "@/hooks/useInitiatives";
import { getInitiatives } from "@/services/initiativesService";
import type { InitiativeListItem } from "@/types/initiatives";
import type {
  EventBudgetPreview,
  EventBudgetPreviewRow,
  EventBudgetRowStatus,
} from "@/types/eventBudgets";
import { formatMoney, isoToday } from "./format";

const STATUS: Record<
  EventBudgetRowStatus,
  { label: string; className: string }
> = {
  UPDATE: {
    label: "Will update",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
  },
  UNCHANGED: {
    label: "No change",
    className:
      "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  ERROR: {
    label: "Problem",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
  },
};
const FILTERS: { value: EventBudgetRowStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All rows" },
  { value: "UPDATE", label: "Will update" },
  { value: "UNCHANGED", label: "No change" },
  { value: "ERROR", label: "Problems" },
];
const TEMPLATE_HEADER = [
  "Event code",
  "Event",
  "Budget",
  "Currency",
  "Travel budget",
];

const plural = (n: number, [one, many]: [string, string]) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;
const amount = (value: number | null, currency: string | null) =>
  value === null ? "-" : formatMoney(value, currency ?? "USD");

/** "$20,000 → $25,000", or just the value when it doesn't change */
function Change({
  before,
  after,
  beforeCurrency,
  afterCurrency,
}: {
  before: number | null;
  after: number | null;
  beforeCurrency: string | null;
  afterCurrency: string | null;
}) {
  const same = before === after && beforeCurrency === afterCurrency;
  if (same)
    return (
      <span className="text-muted-foreground">
        {amount(after, afterCurrency)}
      </span>
    );
  return (
    <span className="whitespace-nowrap">
      <span
        className={`text-muted-foreground ${before === null ? "" : "line-through decoration-muted-foreground/60"}`}
      >
        {before === null ? "None" : amount(before, beforeCurrency)}
      </span>
      <span className="px-1 text-muted-foreground">→</span>
      <span className="font-medium text-foreground">
        {amount(after, afterCurrency)}
      </span>
    </span>
  );
}

function PreviewTable({ rows }: { rows: EventBudgetPreviewRow[] }) {
  if (rows.length === 0)
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No rows to show.
      </p>
    );
  const cell = "px-3 py-2.5 align-top";
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
          <tr>
            {["Row", "Event", "Budget", "Travel budget", "Result"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr
              key={r.row_number}
              className={
                r.status === "ERROR"
                  ? "bg-red-50/40 dark:bg-red-950/10"
                  : undefined
              }
            >
              <td className={`${cell} tabular-nums text-muted-foreground`}>
                {r.row_number}
              </td>
              <td className={`${cell} max-w-64`}>
                <span className="block truncate font-medium text-foreground">
                  {r.event_name ?? r.event_text}
                </span>
                {r.event_code && (
                  <span className="block text-xs text-muted-foreground">
                    {r.event_code}
                  </span>
                )}
              </td>
              <td className={`${cell} tabular-nums`}>
                {r.initiative_id ? (
                  <Change
                    before={r.old_budget}
                    after={r.new_budget}
                    beforeCurrency={r.old_currency}
                    afterCurrency={r.new_currency}
                  />
                ) : (
                  "-"
                )}
              </td>
              <td className={`${cell} tabular-nums`}>
                {r.initiative_id ? (
                  <Change
                    before={r.old_travel_budget}
                    after={r.new_travel_budget}
                    beforeCurrency={r.old_currency}
                    afterCurrency={r.new_currency ?? r.old_currency}
                  />
                ) : (
                  "-"
                )}
              </td>
              <td className={cell}>
                <span
                  className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS[r.status].className}`}
                >
                  {STATUS[r.status].label}
                </span>
                {r.message && (
                  <span className="mt-1 block text-xs text-red-700 dark:text-red-400">
                    {r.message}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Set many events' budgets from one spreadsheet: Event (code or name), Budget, and optionally Currency and Travel
 * budget. Every row is shown before anything is saved; rows with problems are skipped.
 */
export default function EventBudgetUpload({
  open,
  onOpenChange,
  channelId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    (EventBudgetPreview & { filename: string }) | null
  >(null);
  const [filter, setFilter] = useState<EventBudgetRowStatus | "ALL">("ALL");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const check = usePreviewEventBudgets();
  const apply = useApplyEventBudgets();

  const reset = () => {
    setFile(null);
    setFileError(null);
    setPreview(null);
    setFilter("ALL");
    setApplyError(null);
  };
  const close = () => {
    onOpenChange(false);
    reset();
  };

  const checkFile = () => {
    if (!file) return;
    check.mutate(file, {
      onSuccess: (result) => {
        setPreview({ ...result, filename: file.name });
        setFilter(result.counts.ERROR > 0 ? "ERROR" : "ALL");
      },
      onError: (err) => setFileError(err.message || "Could not read the file."),
    });
  };

  const toUpdate = preview?.rows.filter((r) => r.status === "UPDATE") ?? [];
  const save = () => {
    setApplyError(null);
    apply.mutate(
      toUpdate.map((r) => ({
        initiative_id: r.initiative_id as string,
        budget_amount: r.new_budget as number,
        currency: r.new_currency as string,
        travel_budget_amount: r.new_travel_budget,
      })),
      {
        onSuccess: (result) => {
          toast.success(
            `Updated ${plural(result.updated, ["event's budget", "events' budgets"])}`,
          );
          close();
        },
        onError: (err) =>
          setApplyError(err.message || "Could not save the budgets."),
      },
    );
  };

  // A sheet of every event with its current budget, ready to edit and upload
  const template = async () => {
    setDownloading(true);
    try {
      const events: InitiativeListItem[] = [];
      for (let offset = 0; ; offset += 200) {
        const batch = await getInitiatives({
          channel_id: channelId,
          limit: 200,
          offset,
        });
        events.push(...batch.items);
        if (batch.items.length === 0 || events.length >= batch.total) break;
      }
      downloadCsv(
        `event-budgets-${isoToday()}.csv`,
        TEMPLATE_HEADER,
        events.map((e) => [
          e.event_code,
          e.name,
          e.budget_amount,
          e.currency,
          e.travel_budget_amount,
        ]),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not download the template.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const shown = preview
    ? preview.rows.filter((r) => filter === "ALL" || r.status === filter)
    : [];
  const counts = preview?.counts;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-4xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Upload event budgets</SheetTitle>
          <SheetDescription>
            Set the budget of many events at once from a spreadsheet. You'll see
            every change before anything is saved.
          </SheetDescription>
          <ol className="mt-2 flex flex-wrap gap-2 text-xs" aria-label="Steps">
            {["Choose file", "Check the changes", "Import"].map((label, i) => {
              const current = (preview ? 1 : 0) === i;
              return (
                <li
                  key={label}
                  aria-current={current ? "step" : undefined}
                  className={`rounded-full border px-2.5 py-0.5 ${current ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300" : "border-border text-muted-foreground"}`}
                >
                  {i + 1}. {label}
                </li>
              );
            })}
          </ol>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {!preview ? (
            <section className="flex flex-col gap-4">
              <FileDropZone
                file={file}
                onFileChange={(picked) => {
                  setFile(picked);
                  setFileError(null);
                }}
                disabled={check.isPending}
                error={fileError}
              />
              <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p>
                  One row per event:{" "}
                  <span className="font-medium text-foreground">Event</span>{" "}
                  (its code, e.g. EVT-2026-0012, or its exact name) and its{" "}
                  <span className="font-medium text-foreground">Budget</span>.
                  Optional:{" "}
                  <span className="font-medium text-foreground">Currency</span>{" "}
                  and{" "}
                  <span className="font-medium text-foreground">
                    Travel budget
                  </span>
                  , which has to stay below the budget. Blank optional cells
                  keep what the event has.
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto w-fit gap-1.5 p-0"
                  onClick={() => void template()}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download every event with its current budget
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                {fileError && file && (
                  <Button type="button" variant="outline" onClick={reset}>
                    Try another file
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={checkFile}
                  disabled={!file || check.isPending || Boolean(fileError)}
                >
                  {check.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Check file
                </Button>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">
                  {preview.filename}
                </p>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Show rows"
                >
                  {FILTERS.map((f) => {
                    const n =
                      f.value === "ALL"
                        ? preview.rows.length
                        : (counts?.[f.value] ?? 0);
                    return (
                      <button
                        key={f.value}
                        type="button"
                        aria-pressed={filter === f.value}
                        onClick={() => setFilter(f.value)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${filter === f.value ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        {f.label} <span className="tabular-nums">{n}</span>
                      </button>
                    );
                  })}
                </div>
                {preview.ignored_columns.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Not read: {preview.ignored_columns.join(", ")}.
                  </p>
                )}
              </div>

              <PreviewTable rows={shown} />

              {applyError && (
                <p
                  role="alert"
                  className="text-sm text-red-600 dark:text-red-400"
                >
                  {applyError}
                </p>
              )}
              <ConfirmBar
                count={toUpdate.length}
                noun={["event budget", "event budgets"]}
                pending={apply.isPending}
                onConfirm={save}
                onCancel={close}
                onChooseAnother={reset}
                note={
                  [
                    counts && counts.ERROR > 0
                      ? `${plural(counts.ERROR, ["row", "rows"])} with problems won't be saved.`
                      : "",
                    counts && counts.UNCHANGED > 0
                      ? `${plural(counts.UNCHANGED, ["event is", "events are"])} already up to date.`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
