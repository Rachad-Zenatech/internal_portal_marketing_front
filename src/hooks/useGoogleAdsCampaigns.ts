import { useMemo, useState } from "react";
import type { GoogleAdsCampaign } from "@/types/googleReporting";

export type CampaignSort = "spend" | "clicks" | "conversions" | "name";
const PAGE_SIZE = 25;

export function useGoogleAdsCampaigns(campaigns: GoogleAdsCampaign[]) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CampaignSort>("spend");
  const [pageIndex, setPageIndex] = useState(0);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = campaigns.filter((row) => `${row.campaign_name} ${row.campaign_id} ${row.status} ${row.channel}`.toLowerCase().includes(term));
    return matches.sort((a, b) => {
      const difference = sort === "name" ? 0 : b[sort] - a[sort];
      return difference || a.campaign_name.localeCompare(b.campaign_name) || a.campaign_id.localeCompare(b.campaign_id);
    });
  }, [campaigns, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageIndex, pages - 1);
  const chartRows = useMemo(() => [...filtered].filter((row) => row.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 10), [filtered]);
  const updateSearch = (value: string) => { setSearch(value); setPageIndex(0); };
  const updateSort = (value: CampaignSort) => { setSort(value); setPageIndex(0); };
  return { search, updateSearch, sort, updateSort, filtered, chartRows, page, pages, setPage: setPageIndex,
    rows: filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) };
}
