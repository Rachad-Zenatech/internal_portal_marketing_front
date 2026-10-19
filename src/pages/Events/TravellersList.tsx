import type { LucideIcon } from "lucide-react";
import { Car, Hotel, Luggage, Plane, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventTravellers } from "@/hooks/useEventManagement";
import type { EventTraveller, NavanBookingType } from "@/types/eventManagement";
import { MUTED } from "../Initiatives/detailStyles";
import { formatDateRangeShort, formatMoney } from "../Initiatives/format";

const BOOKING_TYPES: Record<NavanBookingType, { label: string; icon: LucideIcon }> = {
  FLIGHT: { label: "Flight", icon: Plane },
  HOTEL: { label: "Hotel", icon: Hotel },
  CAR: { label: "Car", icon: Car },
  RAIL: { label: "Rail", icon: TrainFront },
  OTHER: { label: "Other", icon: Luggage },
};

function Booked({ types }: { types: NavanBookingType[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Booked">
      {types.map((type) => {
        const { label, icon: Icon } = BOOKING_TYPES[type] ?? BOOKING_TYPES.OTHER;
        return (
          <li
            key={type}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </li>
        );
      })}
    </ul>
  );
}

function dates(person: EventTraveller) {
  return person.first_travel || person.last_travel ? formatDateRangeShort(person.first_travel, person.last_travel) : "-";
}

/** The people on the event's active Navan bookings: cards on phones, a table from medium screens up */
export default function TravellersList({ initiativeId }: { initiativeId: string }) {
  const { data: travellers, isLoading, error, refetch } = useEventTravellers(initiativeId);

  const header = (
    <div className="flex flex-col gap-1">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">
        <Plane className="h-4 w-4" aria-hidden />
        Travelling (from Navan)
        {travellers && travellers.length > 0 && <span className={`font-normal ${MUTED}`}>{travellers.length}</span>}
      </h3>
      <p className={`text-xs ${MUTED}`}>From Navan bookings. People invited who haven't booked yet don't show here.</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (error || !travellers) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <div className="flex items-center gap-3">
          <p className={`text-sm ${MUTED}`}>Could not load the travellers.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (travellers.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <p className={`rounded-lg border border-dashed border-slate-200 p-4 text-sm dark:border-zinc-700 ${MUTED}`}>
          No one has booked travel in Navan for this event yet.
        </p>
      </div>
    );
  }

  const currency = travellers[0].currency;
  const total = travellers.reduce((sum, person) => sum + person.amount, 0);

  return (
    <div className="flex flex-col gap-3">
      {header}

      {/* Phones: one card per person */}
      <ul className="flex flex-col gap-2 md:hidden">
        {travellers.map((person, i) => (
          <li key={`${person.name}-${i}`} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-zinc-100">{person.name}</p>
                {person.department && <p className={`text-xs ${MUTED}`}>{person.department}</p>}
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900 dark:text-zinc-100">
                {formatMoney(person.amount, person.currency)}
              </span>
            </div>
            <Booked types={person.booking_types} />
            <p className={`text-xs ${MUTED}`}>{dates(person)}</p>
          </li>
        ))}
      </ul>

      {/* Medium screens and up: a table */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className={`border-b border-slate-200 text-left text-xs dark:border-zinc-800 ${MUTED}`}>
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Department</th>
              <th className="px-3 py-2 font-medium">Booked</th>
              <th className="px-3 py-2 font-medium">Dates</th>
              <th className="px-3 py-2 text-right font-medium">Travel cost</th>
            </tr>
          </thead>
          <tbody>
            {travellers.map((person, i) => (
              <tr key={`${person.name}-${i}`} className="border-b border-slate-100 last:border-0 dark:border-zinc-800/60">
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-zinc-100">{person.name}</td>
                <td className={`px-3 py-2 ${MUTED}`}>{person.department || "-"}</td>
                <td className="px-3 py-2">
                  <Booked types={person.booking_types} />
                </td>
                <td className={`whitespace-nowrap px-3 py-2 ${MUTED}`}>{dates(person)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-900 dark:text-zinc-100">{formatMoney(person.amount, person.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={`text-xs ${MUTED}`}>
        Total travel booked: <span className="font-medium text-slate-900 dark:text-zinc-100">{formatMoney(total, currency)}</span>
      </p>
    </div>
  );
}
