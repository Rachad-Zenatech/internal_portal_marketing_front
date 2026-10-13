import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CalendarDays,
  FileText,
  Globe,
  Handshake,
  Link2,
  Mail,
  Megaphone,
  Newspaper,
  Rocket,
  Search,
  Send,
  Share2,
  Star,
  Store,
} from "lucide-react";

export interface ChannelStyle {
  icon: LucideIcon;
  /** Tinted background + icon colour for icon tiles */
  tile: string;
  /** Solid colour for small dots and bars */
  dot: string;
}

// Each channel gets its own colour and icon so it's recognisable at a glance across pages.
// Class names are written out in full so Tailwind can find them.
const STYLES: Record<string, ChannelStyle> = {
  PAID_SEARCH: { icon: Search, tile: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400", dot: "bg-blue-500" },
  PAID_SOCIAL: { icon: Share2, tile: "bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400", dot: "bg-pink-500" },
  SEO: { icon: Globe, tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400", dot: "bg-emerald-500" },
  CONTENT_MARKETING: { icon: FileText, tile: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400", dot: "bg-amber-500" },
  EMAIL_MARKETING: { icon: Mail, tile: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400", dot: "bg-sky-500" },
  MARKETING_AUTOMATION: { icon: Bot, tile: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400", dot: "bg-violet-500" },
  EVENTS: { icon: CalendarDays, tile: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400", dot: "bg-indigo-500" },
  PARTNERSHIPS: { icon: Handshake, tile: "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400", dot: "bg-teal-500" },
  AFFILIATES: { icon: Link2, tile: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400", dot: "bg-cyan-500" },
  INFLUENCER_MARKETING: { icon: Star, tile: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-400", dot: "bg-fuchsia-500" },
  PR_COMMUNICATIONS: { icon: Newspaper, tile: "bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400", dot: "bg-orange-500" },
  OUTBOUND_MARKETING: { icon: Send, tile: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400", dot: "bg-rose-500" },
  PRODUCT_LED_GROWTH: { icon: Rocket, tile: "bg-lime-50 text-lime-700 dark:bg-lime-950/60 dark:text-lime-400", dot: "bg-lime-500" },
  MARKETPLACE: { icon: Store, tile: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-400", dot: "bg-yellow-500" },
  OTHER: { icon: Megaphone, tile: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300", dot: "bg-gray-400" },
};

export function channelStyle(code: string | null | undefined): ChannelStyle {
  return (code && STYLES[code]) || STYLES.OTHER;
}

/** Funnel stage colours, used by the goal stepper */
export const FUNNEL_STAGE_STYLES: Record<string, string> = {
  AWARENESS: "bg-sky-500 text-white border-sky-500",
  CONSIDERATION: "bg-violet-500 text-white border-violet-500",
  CONVERSION: "bg-emerald-500 text-white border-emerald-500",
  RETENTION: "bg-amber-500 text-white border-amber-500",
};
