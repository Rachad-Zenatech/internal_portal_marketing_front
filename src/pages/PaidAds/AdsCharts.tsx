// Charts for the Paid Advertising page. Need CHART_VARS on a wrapper (ChartCard has it).
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LegendItem } from "@/components/dashboard/ChartCard";
import { compactMoney } from "@/components/dashboard/tones";
import type { AdPlatform, AdsPlatformRow, AdsTimePoint } from "@/types/ads";
import { fmtCount, fmtMoney, PLATFORM_LABELS, PLATFORM_MARK } from "./adsDisplay";
import { formatRange, pointLabel } from "./overviewDisplay";

const TIP = "min-w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md";

function TipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="mt-1 flex items-center justify-between gap-4">
      <LegendItem color={color} label={label} />
      <span className="font-medium tabular-nums">{value}</span>
    </p>
  );
}

// Tailwind tile colours as plain colours for the SVG axis ticks
const MARK_FILL: Record<AdPlatform, string> = {
  GOOGLE_ADS: "#2563eb",
  BING_ADS: "#0d9488",
  LINKEDIN_ADS: "#0369a1",
  META_ADS: "#4f46e5",
  YOUTUBE_ADS: "#dc2626",
  TIKTOK_ADS: "#18181b",
  X_ADS: "#27272a",
  REDDIT_ADS: "#ea580c",
  DISPLAY_PROGRAMMATIC: "#64748b",
  OTHER: "#94a3b8",
};

function PlatformTick({ x = 0, y = 0, payload, compact }: { x?: number | string; y?: number | string; payload?: { value?: unknown }; compact: boolean }) {
  const platform = payload?.value as AdPlatform | undefined;
  if (!platform) return null;
  const mark = PLATFORM_MARK[platform];
  const label = PLATFORM_LABELS[platform].replace(/ Ads$/, "");
  return (
    <g transform={`translate(${Number(x)},${Number(y) + 4})`}>
      <rect x={-9} y={0} width={18} height={18} rx={4} fill={MARK_FILL[platform]} />
      <text x={0} y={12.5} textAnchor="middle" fontSize={mark.text.length > 1 ? 8 : 10} fontWeight={700} fill="#fff">
        {mark.text}
      </text>
      {!compact && (
        <text x={0} y={32} textAnchor="middle" fontSize={11} fill="currentColor">
          {label}
        </text>
      )}
    </g>
  );
}

export function PlatformBudgetLegend() {
  return (
    <div className="flex items-center gap-4">
      <LegendItem color="var(--chart-budget)" label="Allocated budget" />
      <LegendItem color="var(--chart-spend)" label="Ad spend" />
    </div>
  );
}

/** Allocated budget and spend side by side for each platform */
export function PlatformBudgetChart({ rows, currency, height = 260 }: { rows: AdsPlatformRow[]; currency: string; height?: number }) {
  const data = rows.map((r) => ({ platform: r.platform, budget: r.allocated_budget ?? 0, spend: r.spend ?? 0, row: r }));
  const compact = data.length > 6;
  return (
    <div style={{ height }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: compact ? 4 : 18, left: 0 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="platform" tickLine={false} axisLine={false} interval={0} tick={(props) => <PlatformTick {...props} compact={compact} />} />
          <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !point) return null;
              const used = point.row.budget_used_percent;
              return (
                <div className={TIP}>
                  <p className="mb-1 font-semibold">{PLATFORM_LABELS[point.platform]}</p>
                  <TipRow color="var(--chart-budget)" label="Allocated budget" value={fmtMoney(point.row.allocated_budget, currency)} />
                  <TipRow color="var(--chart-spend)" label="Ad spend" value={fmtMoney(point.row.spend, currency)} />
                  {used !== null && <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{Math.round(used)}% of allocation spent</p>}
                </div>
              );
            }}
          />
          <Bar dataKey="budget" name="Allocated budget" fill="var(--chart-budget)" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="spend" name="Ad spend" fill="var(--chart-spend)" radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendLeadsLegend() {
  return (
    <div className="flex items-center gap-4">
      <LegendItem color="var(--chart-spend)" label="Ad spend (left)" />
      <LegendItem color="var(--series-3)" label="Verified leads (right)" />
    </div>
  );
}

/** Spend as bars on the left axis, verified leads as a line on its own right axis */
export function SpendLeadsChart({ points, bucket, currency, height = 260 }: { points: AdsTimePoint[]; bucket: "day" | "week" | "month"; currency: string; height?: number }) {
  const data = points.map((p) => ({ ...p, label: pointLabel(p.start, bucket) }));
  const unit = bucket === "day" ? "Day" : bucket === "week" ? "Week" : "Month";
  return (
    <div style={{ height }} className="w-full min-w-0 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis yAxisId="spend" tickLine={false} axisLine={false} width={56} tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <YAxis yAxisId="leads" orientation="right" tickLine={false} axisLine={false} width={40} allowDecimals={false} tick={{ fill: "currentColor", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !point) return null;
              return (
                <div className={TIP}>
                  <p className="mb-1 font-semibold">
                    {unit} {formatRange(point.start, point.end)}
                  </p>
                  <TipRow color="var(--chart-spend)" label="Ad spend" value={fmtMoney(point.spend, currency)} />
                  <TipRow color="var(--series-3)" label="Verified leads" value={fmtCount(point.verified_leads)} />
                  <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">Platform conversions: {fmtCount(point.conversions)}</p>
                </div>
              );
            }}
          />
          <Bar yAxisId="spend" dataKey="spend" name="Ad spend" fill="var(--chart-spend)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line yAxisId="leads" dataKey="verified_leads" name="Verified leads" type="monotone" stroke="var(--series-3)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
