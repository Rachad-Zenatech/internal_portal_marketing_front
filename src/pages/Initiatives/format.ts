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
