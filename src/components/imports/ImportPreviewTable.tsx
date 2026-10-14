import { Fragment } from "react";
import { AlertCircle, AlertTriangle, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ImportPreviewRowBase, ImportRowStatus } from "@/types/imports";
import { type ImportRowFilter, ROW_STATUS_LABELS, ROW_STATUS_STYLES, ROW_TINTS } from "./importStatus";

export interface ImportPreviewColumn<Row> {
  key: string;
  header: string;
  /** e.g. "text-right" for amounts */
  className?: string;
  render: (row: Row) => React.ReactNode;
}

interface ImportPreviewTableProps<Row extends ImportPreviewRowBase> {
  rows: Row[];
  /** The upload's own columns; Row # and Status come first automatically */
  columns: ImportPreviewColumn<Row>[];
  filter?: ImportRowFilter;
}

const MESSAGE_ICONS: Record<ImportRowStatus, React.ElementType | null> = {
  READY: null,
  READY_WITH_WARNINGS: AlertTriangle,
  DUPLICATE: Copy,
  INVALID: AlertCircle,
};

const MESSAGE_TEXT: Record<ImportRowStatus, string> = {
  READY: "",
  READY_WITH_WARNINGS: "text-amber-700 dark:text-amber-300",
  DUPLICATE: "text-orange-700 dark:text-orange-300",
  INVALID: "text-red-700 dark:text-red-400",
};

/** The rows an upload found: problem rows tinted, with what's wrong written under each. Scrolls inside its card. */
export default function ImportPreviewTable<Row extends ImportPreviewRowBase>({ rows, columns, filter = "ALL" }: ImportPreviewTableProps<Row>) {
  const visible = filter === "ALL" ? rows : rows.filter((row) => row.status === filter);
  const span = columns.length + 2;

  return (
    <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-200 dark:border-zinc-800">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="w-14 px-3 py-2">Row</th>
            <th className="w-28 px-3 py-2">Status</th>
            {columns.map((column) => (
              <th key={column.key} className={`px-3 py-2 ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <td colSpan={span} className="px-3 py-6 text-center text-slate-500 dark:text-zinc-400">
                No rows with this status.
              </td>
            </tr>
          )}
          {visible.map((row) => {
            const Icon = MESSAGE_ICONS[row.status];
            const hasMessages = row.messages.length > 0;
            return (
              <Fragment key={row.row_number}>
                <tr className={`${ROW_TINTS[row.status]} ${hasMessages ? "" : "border-b border-slate-100 dark:border-zinc-800"}`}>
                  <td className="px-3 py-2 tabular-nums text-slate-500 dark:text-zinc-400">{row.row_number}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={ROW_STATUS_STYLES[row.status]}>
                      {ROW_STATUS_LABELS[row.status]}
                    </Badge>
                  </td>
                  {columns.map((column) => (
                    <td key={column.key} className={`px-3 py-2 align-top ${column.className ?? ""}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
                {hasMessages && (
                  <tr className={`${ROW_TINTS[row.status]} border-b border-slate-100 dark:border-zinc-800`}>
                    <td />
                    <td colSpan={span - 1} className="px-3 pb-2">
                      <ul className={`flex flex-col gap-0.5 text-xs ${MESSAGE_TEXT[row.status]}`}>
                        {row.messages.map((message) => (
                          <li key={message} className="flex items-start gap-1.5">
                            {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            {message}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
