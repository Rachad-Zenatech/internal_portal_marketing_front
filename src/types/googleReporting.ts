export interface GoogleReportingBrand {
  code: string;
  name: string;
  has_ads: boolean;
}

export interface GoogleReportSection {
  status: "ok" | "empty" | "unavailable" | "error";
  rows: Record<string, string | number>[];
  totals: Record<string, number>;
  message: string | null;
  time_zone: string | null;
  currency: string | null;
}

export interface GoogleReportFilters {
  brand: string;
  date_from: string;
  date_to: string;
}

export interface GoogleMarketingReport {
  brand: GoogleReportingBrand;
  date_from: string;
  date_to: string;
  fetched_at: string;
  ga4: GoogleReportSection;
  search_console: GoogleReportSection;
  ads: GoogleReportSection;
}
