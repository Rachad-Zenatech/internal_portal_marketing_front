// Paid Search board: its columns, and reading a spreadsheet of them (headers must match exactly)

export type PaidSearchFieldKind = "text" | "date" | "number" | "url";

export interface PaidSearchField {
  key: string;
  header: string;
  kind: PaidSearchFieldKind;
}

/** Every column on the board, in spreadsheet order */
export const PAID_SEARCH_FIELDS = [
  { key: "brand", header: "Brand", kind: "text" },
  { key: "market", header: "Market/Region", kind: "text" },
  { key: "period_start", header: "Period Start", kind: "date" },
  { key: "period_end", header: "Period End", kind: "date" },
  { key: "channel", header: "Channel", kind: "text" },
  { key: "sub_channel", header: "Sub-Channel", kind: "text" },
  { key: "campaign_name", header: "Campaign Name", kind: "text" },
  { key: "primary_kpi", header: "Primary KPI", kind: "text" },
  { key: "budget_allocated", header: "Budget Allocated ($)", kind: "number" },
  { key: "actual_spend", header: "Actual Spend", kind: "number" },
  { key: "impressions", header: "Impressions", kind: "number" },
  { key: "clicks", header: "Clicks", kind: "number" },
  { key: "ctr", header: "CTR (%)", kind: "number" },
  { key: "cpc", header: "CPC ($)", kind: "number" },
  { key: "ads_conversions", header: "Ads Conv.", kind: "number" },
  { key: "hs_contacts", header: "HS contact", kind: "number" },
  { key: "ads_conv_rate", header: "Ads Conv Rate", kind: "number" },
  { key: "cpl", header: "CPL ($)", kind: "number" },
  { key: "mqls", header: "MQLs", kind: "number" },
  { key: "sqls", header: "SQLs", kind: "number" },
  { key: "last_update", header: "Last Update", kind: "date" },
  { key: "status", header: "Status", kind: "text" },
  { key: "report_link", header: "Report Link", kind: "url" },
  { key: "tracking_detail", header: "Tracking Detail", kind: "text" },
] as const satisfies readonly PaidSearchField[];

export type PaidSearchKey = (typeof PAID_SEARCH_FIELDS)[number]["key"];

/** One row on the board; every value is kept as typed text so half-filled rows can be saved */
export type PaidSearchEntry = { id: string } & Record<PaidSearchKey, string>;

export const newEntryId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export const emptyEntry = (defaults: Partial<Record<PaidSearchKey, string>> = {}): PaidSearchEntry => {
  const entry = { id: newEntryId() } as PaidSearchEntry;
  for (const f of PAID_SEARCH_FIELDS) entry[f.key] = defaults[f.key] ?? "";
  return entry;
};

/** "  actual   SPEND " and "Actual Spend" are the same header */
const normalizeHeader = (h: string) => h.replace(/\s+/g, " ").trim().toLowerCase();

const EXPECTED = new Map<string, PaidSearchField>(PAID_SEARCH_FIELDS.map((f) => [normalizeHeader(f.header), f]));

/** A sheet whose headers are not exactly the board's columns */
export class HeaderMismatchError extends Error {
  missing: string[];
  unexpected: string[];
  duplicated: string[];
  /** The sheet whose header row came closest, for a workbook */
  sheetName?: string;
  constructor(missing: string[], unexpected: string[], duplicated: string[]) {
    const parts = [
      missing.length && `missing ${missing.map((h) => `"${h}"`).join(", ")}`,
      unexpected.length && `not expected ${unexpected.map((h) => `"${h}"`).join(", ")}`,
      duplicated.length && `repeated ${duplicated.map((h) => `"${h}"`).join(", ")}`,
    ].filter(Boolean);
    super(`The spreadsheet's columns don't match the Paid Search fields: ${parts.join("; ")}.`);
    this.name = "HeaderMismatchError";
    this.missing = missing;
    this.unexpected = unexpected;
    this.duplicated = duplicated;
  }
}

export interface ParsedRow {
  /** Row number in the spreadsheet (header is row 1) */
  row_number: number;
  entry: PaidSearchEntry;
  /** What's wrong with it; a row with problems is not imported */
  problems: string[];
}

export interface ParsedSheet {
  filename: string;
  /** The workbook sheet the rows came from */
  sheetName?: string;
  rows: ParsedRow[];
}

/** Checks the header row: every board column exactly once, nothing else (order doesn't matter, blank trailing headers are ignored) */
export function matchHeaders(headers: string[]): (PaidSearchField | null)[] {
  const seen = new Set<string>();
  const unexpected: string[] = [];
  const duplicated: string[] = [];
  const mapping = headers.map((raw) => {
    const norm = normalizeHeader(raw);
    if (!norm) return null;
    const field = EXPECTED.get(norm);
    if (!field) {
      unexpected.push(raw.trim());
      return null;
    }
    if (seen.has(field.key)) duplicated.push(field.header);
    seen.add(field.key);
    return field;
  });
  const missing = PAID_SEARCH_FIELDS.filter((f) => !seen.has(f.key)).map((f) => f.header);
  if (missing.length || unexpected.length || duplicated.length) throw new HeaderMismatchError(missing, unexpected, duplicated);
  return mapping;
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** 0.0507 -> "0.05", 3 -> "3": at most 2 decimals */
const roundText = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Spreadsheet cell to text: dates as YYYY-MM-DD, links as their address, formulas as their result.
 * A number shown as a percentage (0.05 shown as 5%) is read as the percentage, 5.
 */
function cellText(value: unknown, numFmt?: string): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return isoDate(value);
  if (typeof value === "number") return roundText(numFmt?.includes("%") ? value * 100 : value);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("formula" in v || "sharedFormula" in v) return "result" in v ? cellText(v.result, numFmt) : "";
    if ("result" in v) return cellText(v.result, numFmt);
    if ("hyperlink" in v) return String(v.hyperlink ?? v.text ?? "");
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((p: { text?: string }) => p.text ?? "").join("");
    if ("text" in v) return String(v.text ?? "");
    if ("error" in v) return "";
  }
  return String(value).trim();
}

/** ".", "-", "N/A" and the like mean "nothing here yet" */
const isBlank = (text: string) => /^(|\.+|-+|\u2014|\u2013|n\/?a|tbd|none)$/i.test(text.trim());

/** "$1,234.50", "12%", "1 234" -> "1234.50", "12", "1234"; null when it isn't a number */
export function cleanNumber(text: string): string | null {
  if (isBlank(text)) return "";
  const stripped = text.replace(/[$£€,%\s]/g, "");
  if (stripped === "") return "";
  return Number.isFinite(Number(stripped)) ? stripped : null;
}

/** YYYY-MM-DD, or the date written another common way; null when it can't be read */
export function cleanDate(text: string): string | null {
  if (isBlank(text)) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  // Excel serial date written as a number
  if (/^\d{5}(\.\d+)?$/.test(text)) return isoDate(new Date(Date.UTC(1899, 11, 30) + Number(text) * 86_400_000));
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3]);
    return `${year}-${pad(Number(us[1]))}-${pad(Number(us[2]))}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/** Checks one value for its column; returns the cleaned value or a problem */
export function cleanValue(field: PaidSearchField, text: string): { value: string; problem?: string } {
  if (field.kind === "number") {
    const n = cleanNumber(text);
    return n === null ? { value: text, problem: `${field.header} "${text}" is not a number.` } : { value: n };
  }
  if (field.kind === "date") {
    const d = cleanDate(text);
    return d === null ? { value: text, problem: `${field.header} "${text}" is not a date.` } : { value: d };
  }
  return { value: text };
}

/** How many board columns a row's cells name (0 to 24) */
function headerScore(cells: string[]): number {
  return new Set(cells.map((c) => EXPECTED.get(normalizeHeader(c))?.key).filter(Boolean)).size;
}

/** How far down a sheet to look for its header row (titles and notes can sit above it) */
const HEADER_SEARCH_ROWS = 20;

/** The row near the top of the sheet most like the header row, and how many board columns it names */
function findHeaderRow(table: string[][]): { index: number; score: number } {
  let best = { index: -1, score: -1 };
  table.slice(0, HEADER_SEARCH_ROWS).forEach((cells, index) => {
    if (!cells.some((c) => c.trim() !== "")) return;
    const score = headerScore(cells);
    if (score > best.score) best = { index, score };
  });
  return best;
}

function rowsToEntries(table: string[][], headerIndex: number): ParsedRow[] {
  const mapping = matchHeaders(table[headerIndex]);
  const out: ParsedRow[] = [];
  table.slice(headerIndex + 1).forEach((cells, i) => {
    if (cells.every((c) => c.trim() === "")) return;
    const entry = emptyEntry();
    const problems: string[] = [];
    mapping.forEach((field, col) => {
      if (!field) return;
      const { value, problem } = cleanValue(field, (cells[col] ?? "").trim());
      entry[field.key as PaidSearchKey] = value;
      if (problem) problems.push(problem);
    });
    // Rows left with only empty formulas or placeholders are not entries
    if (PAID_SEARCH_FIELDS.every((f) => !entry[f.key])) return;
    if (!entry.campaign_name) problems.push("Campaign Name is empty.");
    if (entry.period_start && entry.period_end && entry.period_end < entry.period_start) problems.push("Period End is before Period Start.");
    out.push({ row_number: headerIndex + i + 2, entry, problems });
  });
  if (out.length === 0) throw new Error("The spreadsheet has the right columns but no rows.");
  return out;
}

/** Splits CSV text into rows of cells (handles quoted commas, quotes and line breaks) */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Reads a .csv, or an .xlsx, into board rows. In a workbook every sheet is checked and the one whose header row
 * has the board columns is used. Throws HeaderMismatchError, for the closest sheet, when none match.
 */
export async function parsePaidSearchFile(file: File): Promise<ParsedSheet> {
  const sheets: { name?: string; table: string[][] }[] = [];
  if (file.name.toLowerCase().endsWith(".csv")) {
    sheets.push({ table: parseCsv((await file.text()).trimStart()) }); // trimStart also drops a byte order mark
  } else {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(await file.arrayBuffer());
    } catch {
      throw new Error("Could not read the file. Check it's a valid .xlsx spreadsheet.");
    }
    for (const sheet of workbook.worksheets) {
      const table: string[][] = [];
      sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const cells: string[] = [];
        for (let c = 1; c <= sheet.columnCount; c++) {
          const cell = row.getCell(c);
          cells.push(cellText(cell.value, cell.numFmt));
        }
        table[rowNumber - 1] = cells;
      });
      sheets.push({ name: sheet.name, table: Array.from(table, (r) => r ?? []) });
    }
  }

  // Closest header row first
  const ranked = sheets
    .map((sheet) => ({ ...sheet, header: findHeaderRow(sheet.table) }))
    .filter((sheet) => sheet.header.index !== -1)
    .sort((a, b) => b.header.score - a.header.score);
  if (ranked.length === 0) throw new Error("The spreadsheet is empty.");

  let firstMismatch: HeaderMismatchError | null = null;
  for (const sheet of ranked) {
    try {
      return { filename: file.name, sheetName: sheet.name, rows: rowsToEntries(sheet.table, sheet.header.index) };
    } catch (err) {
      if (!(err instanceof HeaderMismatchError)) throw err;
      if (!firstMismatch) {
        err.sheetName = sheet.name;
        firstMismatch = err;
      }
    }
  }
  throw firstMismatch;
}

/**
 * Every field of an entry as one comparable string, for spotting duplicates.
 * Ignores case, extra spaces and number formatting ("4311" = "4311.00"), so only real differences count.
 */
export function entryFingerprint(entry: PaidSearchEntry): string {
  return PAID_SEARCH_FIELDS.map((f) => {
    const text = (entry[f.key] ?? "").replace(/\s+/g, " ").trim();
    if (f.kind === "number") {
      const n = cleanNumber(text);
      return n === null || n === "" ? text : String(Number(n));
    }
    if (f.kind === "date") return cleanDate(text) ?? text;
    return text.toLowerCase();
  }).join("\u001f");
}
