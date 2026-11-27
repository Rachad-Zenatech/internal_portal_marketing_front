import { useState } from "react";
import { format, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { getGoogleMarketingReport, getGoogleReportingBrands } from "@/services/googleReportingService";
import { queryKeys } from "@/services/queryKeys";
import type { GoogleReportFilters } from "@/types/googleReporting";

function initialFilters(): GoogleReportFilters {
  const end = subDays(new Date(), 4);
  return { brand: "daas", date_from: format(subDays(end, 6), "yyyy-MM-dd"), date_to: format(end, "yyyy-MM-dd") };
}

export function useGoogleReporting() {
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(draft);
  const brands = useQuery({ queryKey: queryKeys.googleReportingBrands(), queryFn: ({ signal }) => getGoogleReportingBrands(signal), retry: false });
  const report = useQuery({
    queryKey: queryKeys.googleMarketingReport(applied.brand, applied.date_from, applied.date_to),
    queryFn: ({ signal }) => getGoogleMarketingReport(applied, signal),
    enabled: !!brands.data?.length,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const days = (Date.parse(draft.date_to) - Date.parse(draft.date_from)) / 86_400_000;
  const valid = !!draft.brand && Number.isFinite(days) && days >= 0 && days <= 365 && draft.date_to < format(new Date(), "yyyy-MM-dd");
  const load = () => {
    if (!valid) return;
    if (JSON.stringify(draft) === JSON.stringify(applied)) void report.refetch();
    else setApplied({ ...draft });
  };
  return { draft, setDraft, valid, load, brands, report };
}
