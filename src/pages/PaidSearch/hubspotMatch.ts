// Linking Paid Search board rows to HubSpot campaigns, so a HubSpot sync can fill their leads, MQLs and SQLs.
//
// The board's names come from the ad platforms ("NA - Desk Booking - Main LP") and HubSpot's follow its own
// pattern ("DF - AWR - Paid - Desk Booking - Main LP", "WA - AWR - AU Paid Bing - Safety Mgm Software"), so names
// are matched on their parts: brand code, paid, Google vs Bing, market, then the words they share.

import type { HubSpotCampaign } from "@/types/hubspot";
import type { PaidSearchEntry } from "./paidSearchFields";

/** The code a HubSpot campaign name starts with, by board brand (as in the backend's CAMPAIGN_BRANDS) */
const BRAND_CODES: Record<string, string[]> = {
  othership: ["OS"],
  deskflex: ["DF"],
  workaware: ["WA", "WA/AU"],
  tillerstack: ["TS"],
  k9sky: ["K9"],
  jadian: ["JD"],
  "zoo office": ["ZO"],
  daas: ["DS", "DAAS"],
  zenadrone: ["ZD"],
  zenatech: ["ZT"],
};

/** Market words, all written as one code */
const MARKETS: Record<string, string> = {
  na: "NA",
  "north america": "NA",
  us: "NA",
  usa: "NA",
  canada: "NA",
  au: "AU",
  australia: "AU",
  uk: "UK",
  "united kingdom": "UK",
  london: "UK",
  ge: "GE",
  germany: "GE",
  de: "GE",
  kr: "KR",
  korea: "KR",
  latam: "LATAM",
};

/** Words that say nothing about which campaign it is */
const STOP_WORDS = new Set(["awr", "aws", "pos", "paid", "ppc", "ads", "ad", "bing", "google", "the", "and", "of", "-", ""]);

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9/]+/)
    .filter((w) => !STOP_WORDS.has(w));

/** The market codes a text names ("AU - Safety ..." -> AU, "London" -> UK) */
function marketsIn(text: string): Set<string> {
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const found = new Set<string>();
  for (const [word, code] of Object.entries(MARKETS)) if (lower.includes(` ${word} `)) found.add(code);
  return found;
}

/** The brand code a HubSpot campaign name starts with ("WA/AU - ..." -> WA/AU) */
const codeOf = (name: string) => name.match(/^\s*\[?([A-Za-z0-9/]{1,6})\]?(?=[\s\-–—])/)?.[1]?.toUpperCase() ?? null;

const isPaid = (name: string) => /\b(paid|ppc|sem|google ads|bing)\b/i.test(name);
const isBing = (text: string) => /\b(bing|microsoft)\b/i.test(text);

/**
 * How well a HubSpot campaign fits a board row; null when it can't be the one (other brand, not paid, other
 * platform, or another market).
 */
export function matchScore(entry: PaidSearchEntry, campaign: HubSpotCampaign): number | null {
  const name = campaign.name;
  const codes = BRAND_CODES[entry.brand.trim().toLowerCase()];
  const code = codeOf(name);
  if (!codes || !code || !codes.includes(code)) return null;
  if (!isPaid(name)) return null;
  // Google and Bing are separate HubSpot campaigns
  if (isBing(entry.sub_channel) !== isBing(name)) return null;

  let score = 10;
  const rowMarkets = new Set([...marketsIn(entry.market), ...marketsIn(entry.campaign_name)]);
  // "WA/AU - ..." is WorkAware Australia
  if (code === "WA/AU") {
    if (rowMarkets.size && !rowMarkets.has("AU")) return null;
    score += 5;
  }
  const campaignMarkets = marketsIn(name.replace(/^\s*\S+/, "")); // not the brand code
  if (campaignMarkets.size) {
    // A HubSpot campaign for another market is never the one
    if (![...campaignMarkets].some((m) => rowMarkets.has(m))) return null;
    score += 5;
  }

  // Words in common ("desk booking main lp"), market words aside
  const campaignWords = new Set(words(name.replace(/^\s*\S+/, "")).filter((w) => !MARKETS[w]));
  score += words(entry.campaign_name).filter((w) => !MARKETS[w] && campaignWords.has(w)).length;
  return score;
}

/**
 * The row brand's paid HubSpot campaigns, for picking by hand: the ones that fit (matchScore) first, best first,
 * then the brand's other paid campaigns (other platform or market) by name.
 */
export function brandCampaigns(entry: PaidSearchEntry, campaigns: HubSpotCampaign[]): HubSpotCampaign[] {
  const codes = BRAND_CODES[entry.brand.trim().toLowerCase()];
  if (!codes) return [];
  return campaigns
    .filter((c) => {
      const code = codeOf(c.name);
      return code !== null && codes.includes(code) && isPaid(c.name);
    })
    .map((c) => ({ c, score: matchScore(entry, c) ?? -1 }))
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c);
}

/** The HubSpot campaign that fits a row best; null when none fits, or two fit equally well */
export function bestMatch(entry: PaidSearchEntry, campaigns: HubSpotCampaign[]): HubSpotCampaign | null {
  let best: HubSpotCampaign | null = null;
  let bestScore = -1;
  let tied = false;
  for (const c of campaigns) {
    const score = matchScore(entry, c);
    if (score === null) continue;
    if (score > bestScore) {
      best = c;
      bestScore = score;
      tied = false;
    } else if (score === bestScore) tied = true;
  }
  return tied ? null : best;
}

/** Leads, MQLs and SQLs to date: first touch (the backend's default attribution), else last touch */
export function funnelCounts(campaign: HubSpotCampaign): { leads: string; mqls: string; sqls: string } | null {
  const funnel = campaign.funnel?.first_touch ?? campaign.funnel?.last_touch;
  if (!funnel) return null;
  return { leads: String(funnel.lead ?? 0), mqls: String(funnel.mql ?? 0), sqls: String(funnel.sql ?? 0) };
}

export interface HubSpotFillResult {
  entries: PaidSearchEntry[];
  /** Rows linked automatically this time */
  linked: number;
  /** Rows whose MQLs/SQLs were set */
  filled: number;
  /** Rows with no HubSpot campaign */
  unmatched: number;
}

/**
 * Links each row to its HubSpot campaign (a link someone chose is kept; rows without one are matched by name) and
 * sets its leads, MQLs and SQLs from that campaign.
 */
export function fillFromHubSpot(entries: PaidSearchEntry[], campaigns: HubSpotCampaign[]): HubSpotFillResult {
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  let linked = 0;
  let filled = 0;
  let unmatched = 0;
  const next = entries.map((entry) => {
    let campaign = entry.hubspot_campaign_id ? byId.get(entry.hubspot_campaign_id) : undefined;
    let updated = entry;
    if (!campaign && entry.hubspot_link !== "none") {
      // No link yet, or the linked campaign is gone from HubSpot
      const match = bestMatch(entry, campaigns);
      if (match) {
        campaign = match;
        linked++;
        updated = { ...updated, hubspot_campaign_id: match.id, hubspot_link: "auto" };
      } else if (entry.hubspot_campaign_id) {
        updated = { ...updated, hubspot_campaign_id: undefined, hubspot_link: undefined };
      }
    }
    const counts = campaign ? funnelCounts(campaign) : null;
    if (!campaign) {
      unmatched++;
      return updated;
    }
    if (counts) {
      filled++;
      updated = { ...updated, ...counts };
    }
    return updated;
  });
  return { entries: next, linked, filled, unmatched };
}
