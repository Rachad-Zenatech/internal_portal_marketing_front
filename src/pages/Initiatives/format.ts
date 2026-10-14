import { countryName } from "@/lib/countries";

export function formatBudget(amount: number | null, currency: string) {
  if (amount === null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string | null) {
  if (!value) return null;
  // Dates arrive as YYYY-MM-DD; parse as local to avoid a timezone shift
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDates(start: string | null, end: string | null) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return "—";
}

/** "City, Country" for an event; "Online" for virtual events and webinars without a location */
export function formatEventLocation(city: string | null, countryCode: string | null, online: boolean) {
  const place = [city, countryName(countryCode)].filter(Boolean).join(", ");
  if (place) return place;
  return online ? "Online" : "—";
}

/** "3 days" for an inclusive date range, or null when either date is missing */
export function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  return days === 1 ? "1 day" : `${days} days`;
}

/** Up to two initials for an avatar, e.g. "Jane Doe" -> "JD" */
export function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** Compact range for tight spaces: "Nov 4 – 6, 2026", "Nov 28 – Dec 2, 2026", or the full range across years */
export function formatDateRangeShort(start: string | null, end: string | null) {
  if (!start || !end || start.slice(0, 4) !== end.slice(0, 4)) return formatDates(start, end);
  const [y, m1, d1] = start.split("-").map(Number);
  const [, m2, d2] = end.split("-").map(Number);
  const month = (m: number) => new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
  if (start === end) return formatDate(start);
  return m1 === m2 ? `${month(m1)} ${d1} – ${d2}, ${y}` : `${month(m1)} ${d1} – ${month(m2)} ${d2}, ${y}`;
}

/** Today's local date as YYYY-MM-DD, comparable with API dates */
export function isoToday() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const inDays = (n: number) => (n === 1 ? "tomorrow" : `in ${n} days`);
const daysAgo = (n: number) => (n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);

/** Where today sits between the start and end dates: a 0–100 percentage (null when there's no range) and a caption */
export function timelineProgress(start: string | null, end: string | null, today = isoToday()) {
  if (start && end) {
    const total = daysBetween(start, end) + 1;
    if (today < start) return { percent: 0, label: `Starts ${inDays(daysBetween(today, start))}` };
    if (today > end) return { percent: 100, label: `Ended ${daysAgo(daysBetween(end, today))}` };
    const day = daysBetween(start, today) + 1;
    return { percent: Math.round((day / total) * 100), label: `Day ${day} of ${total}` };
  }
  if (start) {
    if (today < start) return { percent: null, label: `Starts ${inDays(daysBetween(today, start))}` };
    return { percent: null, label: `Running for ${daysBetween(start, today) + 1} days · no end date` };
  }
  if (end) {
    if (today > end) return { percent: null, label: `Ended ${daysAgo(daysBetween(end, today))}` };
    return { percent: null, label: today === end ? "Ends today" : `Ends ${inDays(daysBetween(today, end))}` };
  }
  return null;
}

/** A cost in its own currency, with cents only when there are any: "$4,500", "£12.50" */
export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

/** A difference with its sign: "+$500", "−$200", "$0" */
export function formatVariance(amount: number, currency: string) {
  if (amount === 0) return formatMoney(0, currency);
  return `${amount > 0 ? "+" : "−"}${formatMoney(Math.abs(amount), currency)}`;
}

/** "Oct 2026" from a YYYY-MM-DD date */
export function formatMonth(value: string) {
  const [y, m] = value.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
