export const campaignNumber = (value: number | null) => value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function campaignMoney(value: number | null, currency: string | null) {
  if (value === null) return "—";
  return currency ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value) : campaignNumber(value);
}

export const campaignPercent = (value: number | null) => value === null ? "—" : `${campaignNumber(value)}%`;
export const campaignLabel = (value: string) => value.replaceAll("_", " ");
