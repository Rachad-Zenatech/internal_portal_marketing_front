import { CircleAlert, CircleCheck, FileSpreadsheet, PenLine, Plane, Receipt, Timer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInitiativeImports } from "@/hooks/useImports";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useSpendLines } from "@/hooks/useSpend";
import type { InitiativeListItem } from "@/types/initiatives";
import type { SpendSource } from "@/types/spend";
import { formatDate, formatMoney } from "../Initiatives/format";
import NavanSyncStatus from "./NavanSyncStatus";

// Statuses whose cost is in (the invoice has arrived); the rest is awaiting invoices
const ACTUAL = new Set(["INVOICED", "PAID"]);

interface SourceRow {
  key: string;
  icon: React.ElementType;
  label: string;
  /** What this source covers */
  covers: string;
  amount: number | null;
  /** How fresh it is, or what's missing */
  detail: React.ReactNode;
  /** Shown as missing in the completeness check */
  missing?: string;
}

/**
 * An event's cost by where it comes from, each type of cost from exactly one source so nothing is counted twice:
 * Navan for flights, hotels and cars; the cost sheet for booth and supplier costs; the staff time calculator; costs
 * entered by hand. A completeness check says what's still missing, which is the usual reason an ROI is wrong.
 */
export default function CostSources({ initiative }: { initiative: InitiativeListItem }) {
  const { data: lines, isLoading } = useSpendLines(initiative.id);
  const { data: imports } = useInitiativeImports(initiative.id);
  const { data: reference } = useReferenceData();
  const currency = initiative.currency;
  const subChannel = reference?.sub_channels.find((s) => s.id === initiative.sub_channel_id)?.code;

  if (isLoading || !lines) return <Skeleton className="h-56 w-full rounded-xl" />;

  const inCurrency = lines.filter((l) => l.currency === currency);
  const otherCurrency = lines.length - inCurrency.length;
  const sum = (sources: SpendSource[]) => {
    const matching = inCurrency.filter((l) => sources.includes(l.source));
    return matching.length ? matching.reduce((total, l) => total + l.amount, 0) : null;
  };
  const money = (n: number) => formatMoney(n, currency);

  // The current cost sheet: the latest upload still in place, numbered among all confirmed uploads
  const confirmed = (imports ?? []).filter((b) => b.confirmed_at && b.status !== "UNDONE").sort((a, b) => (a.confirmed_at ?? "").localeCompare(b.confirmed_at ?? ""));
  const latest = confirmed[confirmed.length - 1];
  const version = (latest as { version?: number } | undefined)?.version ?? confirmed.length;

  const navan = sum(["NAVAN"]);
  // Navan costs by category (flights, hotels, cars, other travel), e.g. "Flights $5,366 · Hotels $1,693"
  const navanParts = new Map<string, number>();
  for (const l of inCurrency.filter((line) => line.source === "NAVAN")) {
    navanParts.set(l.category_name, (navanParts.get(l.category_name) ?? 0) + l.amount);
  }
  const estimate = initiative.navan_estimate_amount;
  const sheet = sum(["COST_SHEET_UPLOAD"]);
  const staff = sum(["STAFF_CALCULATOR"]);
  const manual = sum(["MANUAL"]);
  const travelFeed = sum(["TRAVEL_FEED"]);
  const ads = sum(["GOOGLE_ADS", "MICROSOFT_ADS"]);
  // In-person events usually involve travel, so no Navan bookings is worth a second look
  const inPerson = subChannel === "IN_PERSON_EVENTS" || subChannel === "SPONSORSHIPS";

  const rows: SourceRow[] = [
    {
      key: "navan",
      icon: Plane,
      label: "Navan",
      covers: "Flights, hotels and cars",
      amount: navan,
      detail: (
        <span className="flex flex-col gap-1">
          {navanParts.size > 0 && (
            <span>
              {[...navanParts].map(([name, amount]) => `${name} ${money(amount)}`).join(" · ")}
            </span>
          )}
          {estimate !== null && estimate !== undefined && (
            <span>
              Navan estimate {money(estimate)}
              {navan !== null ? `, ${Math.round((navan / (estimate || 1)) * 100)}% of it booked so far` : ", nothing booked yet"}
            </span>
          )}
          {navan === null && (
            <span className={inPerson && travelFeed === null ? "text-amber-700 dark:text-amber-400" : undefined}>
              No Navan bookings for this event yet
              {inPerson && travelFeed === null ? ". Check its Navan event name if people have booked." : "."}
            </span>
          )}
          <NavanSyncStatus />
        </span>
      ),
      // Travel from the travel system counts too: the event isn't missing its travel
      missing: inPerson && navan === null && travelFeed === null ? "Navan travel" : undefined,
    },
    {
      key: "sheet",
      icon: FileSpreadsheet,
      label: "Cost sheet",
      covers: "Booth, space, show services, shipping, print, giveaways, catering, badges",
      amount: sheet,
      detail: latest ? (
        <>
          Uploaded {formatDate((latest.confirmed_at ?? "").slice(0, 10))} (v{version}){latest.edited_count > 0 ? `, ${latest.edited_count} edited here since` : ""}
        </>
      ) : (
        <span className="text-amber-700 dark:text-amber-400">Not uploaded yet. Upload the event's cost sheet below.</span>
      ),
      missing: latest ? undefined : "the cost sheet",
    },
    {
      key: "staff",
      icon: Timer,
      label: "Staff time",
      covers: "People's time on the event",
      amount: staff,
      detail: staff === null ? <span className="text-amber-700 dark:text-amber-400">None recorded. Add it with the staff time calculator below.</span> : "From the staff time calculator",
      missing: staff === null ? "staff time" : undefined,
    },
    { key: "manual", icon: PenLine, label: "Entered by hand", covers: "One-off invoices and card payments", amount: manual, detail: manual === null ? "None" : "Added on the cost sheet below" },
    ...(travelFeed !== null
      ? [{ key: "travel", icon: Plane, label: "Travel system", covers: "Travel booked through the travel system", amount: travelFeed, detail: "Sent by the travel system" }]
      : []),
    ...(ads !== null ? [{ key: "ads", icon: Receipt, label: "Ad platforms", covers: "Google Ads and Microsoft Ads spend", amount: ads, detail: "From ad results" }] : []),
    {
      key: "zoho",
      icon: Receipt,
      label: "Zoho Expense",
      covers: "Per diems, Ubers and meals",
      amount: null,
      detail: "Not connected yet. Put these in the cost sheet or add them by hand for now.",
    },
  ];

  const total = inCurrency.reduce((t, l) => t + l.amount, 0);
  const awaiting = inCurrency.filter((l) => !ACTUAL.has(l.status)).reduce((t, l) => t + l.amount, 0);
  const missing = rows.map((r) => r.missing).filter((m): m is string => Boolean(m));

  return (
    <section className="flex flex-col gap-3" aria-labelledby="cost-sources-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 id="cost-sources-title" className="text-base font-semibold text-foreground">
          Cost by source
        </h3>
        {missing.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="h-4 w-4 shrink-0" />
            Every source is in
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
            <CircleAlert className="h-4 w-4 shrink-0" />
            Still missing: {missing.join(", ")}. The total and ROI are too low until it's in.
          </span>
        )}
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 px-3 py-2.5 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:items-center">
              <div className="flex min-w-0 items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.covers}</p>
                </div>
              </div>
              <div className="col-span-2 row-start-2 min-w-0 pl-6.5 text-xs text-muted-foreground sm:col-span-1 sm:row-start-auto sm:pl-0">{r.detail}</div>
              <span className={`row-start-1 text-right text-sm tabular-nums sm:row-start-auto ${r.amount === null ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                {r.amount === null ? "-" : money(r.amount)}
              </span>
            </li>
          );
        })}
        <li className="flex items-center justify-between gap-4 bg-muted/40 px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Total event cost</p>
            <p className="text-xs text-muted-foreground">
              ROI uses this{awaiting > 0 ? ` · ${money(awaiting)} of it is awaiting invoices` : ""}
              {otherCurrency > 0 ? ` · ${otherCurrency} ${otherCurrency === 1 ? "cost" : "costs"} in another currency not counted` : ""}
            </p>
          </div>
          <span className="text-base font-semibold tabular-nums text-foreground">{money(total)}</span>
        </li>
      </ul>
    </section>
  );
}
