import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  CircleAlert,
  Gauge,
  Landmark,
  Lightbulb,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  Target,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import ChartCard from "@/components/dashboard/ChartCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DonutChart, { foldIntoOther } from "@/components/dashboard/DonutChart";
import InsightCard from "@/components/dashboard/InsightCard";
import KpiCard, { KpiGrid } from "@/components/dashboard/KpiCard";
import {
  CHART_VARS,
  compactMoney,
  DASH_CARD,
} from "@/components/dashboard/tones";
import { formatMoney } from "../Initiatives/format";
import { BudgetActualChart, BudgetChartLegend } from "../Budgets/BudgetCharts";
import {
  MOCK_ACTIVITY,
  MOCK_ATTENTION,
  MOCK_CHANNEL_SPEND,
  MOCK_CURRENCY,
  MOCK_HIGHLIGHTS,
  MOCK_KPIS,
  MOCK_MONTHS,
  MOCK_PERIOD,
  MOCK_REVIEWS,
  MOCK_TREND,
  type ActivityKind,
  type AttentionStatus,
} from "./dashboardMock";

const money = (n: number) => formatMoney(n, MOCK_CURRENCY);
/** "$102K": short enough for a highlight card */
const wholeK = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: MOCK_CURRENCY,
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(n);
const changeLabel = `vs. ${MOCK_PERIOD.compareLabel}`;

const STATUS: Record<AttentionStatus, { label: string; className: string }> = {
  AT_RISK: {
    label: "At risk",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  },
  OVER_BUDGET: {
    label: "Over budget",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  },
  UNDERPERFORMING: {
    label: "Underperforming",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
  },
  BEHIND_PLAN: {
    label: "Behind plan",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  },
  NEEDS_REVIEW: {
    label: "Needs review",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

const ACTIVITY_ICON: Record<
  ActivityKind,
  { icon: React.ElementType; className: string }
> = {
  SYNC: {
    icon: Plane,
    className: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
  },
  LEADS: {
    icon: Users,
    className:
      "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  },
  BUDGET: {
    icon: Wallet,
    className:
      "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  },
  EVENT: {
    icon: CalendarDays,
    className:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  INSIGHT: {
    icon: Lightbulb,
    className:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  },
  INITIATIVE: {
    icon: Plus,
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
};

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "currentColor", fontSize: 12 },
} as const;

/** One measure over the months. Leads and revenue get one each: two y-axes on one chart would mislead */
function TrendChart({
  dataKey,
  label,
  color,
  format,
}: {
  dataKey: "leads" | "pipeline";
  label: string;
  color: string;
  format: (v: number) => string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="h-[260px] w-full text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={MOCK_TREND}
            margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={48} tickFormatter={format} />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={({ active, payload }) => {
                const point = active
                  ? (payload?.[0]?.payload as
                      (typeof MOCK_TREND)[number] | undefined)
                  : undefined;
                if (!point) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <p className="font-medium">{point.label}</p>
                    <p className="tabular-nums text-muted-foreground">
                      {label}:{" "}
                      <span className="font-medium text-foreground">
                        {dataKey === "leads"
                          ? point.leads.toLocaleString()
                          : money(point.pipeline)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  count,
  viewAll,
  children,
}: {
  title: string;
  count?: number;
  viewAll?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`${DASH_CARD} flex min-w-0 flex-col overflow-hidden`}
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          {title}{" "}
          {count !== undefined && (
            <span className="text-sm font-normal text-muted-foreground">
              ({count})
            </span>
          )}
        </h2>
        {viewAll && (
          <Link
            to={viewAll}
            className="inline-flex items-center gap-0.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/**
 * The marketing dashboard: spend, budget, leads and ROI at a glance, with what needs attention. MOCK-UP: every
 * figure comes from dashboardMock.ts until the real data is wired in.
 */
export default function MarketingDashboard() {
  const { approvedBudget, actualSpend, remaining, leads, costPerLead, roi } =
    MOCK_KPIS;
  const totalSpend = MOCK_CHANNEL_SPEND.reduce((s, c) => s + c.value, 0);
  const cell = "px-4 py-2.5 align-middle";

  return (
    <div
      className={`flex w-full min-w-0 flex-1 flex-col gap-5 animate-in fade-in duration-300 sm:gap-6 ${CHART_VARS}`}
    >
      <DashboardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Dashboard
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Sample data
            </span>
          </span>
        }
        subtitle="At-a-glance view of marketing performance, spend and outcomes."
        actions={
          <div
            className={`${DASH_CARD} flex items-center gap-3 px-3 py-2 text-sm`}
          >
            <CalendarDays
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <span>
              <span className="font-medium text-foreground">
                {MOCK_PERIOD.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {MOCK_PERIOD.dates}
              </span>
            </span>
            <span className="border-l border-border pl-3 text-muted-foreground">
              Compared with{" "}
              <span className="font-medium text-foreground">
                {MOCK_PERIOD.compareLabel}
              </span>
            </span>
          </div>
        }
      />

      <section aria-label="Key figures">
        <KpiGrid>
          <KpiCard
            label="Budget"
            icon={Landmark}
            tone="blue"
            value={money(approvedBudget.current)}
            change={approvedBudget}
            changeLabel={changeLabel}
            info="Budgets approved for the quarter, across every brand, region and channel."
          />
          <KpiCard
            label="Spend"
            icon={Receipt}
            tone="violet"
            value={money(actualSpend.current)}
            change={actualSpend}
            goodWhen="down"
            changeLabel={changeLabel}
            info="Invoiced and paid costs. Event travel is included in each event's cost but kept outside marketing budgets."
          />
          <KpiCard
            label="Remaining"
            icon={PiggyBank}
            tone="green"
            value={money(remaining.current)}
            change={remaining}
            changeLabel={changeLabel}
            caption={`${Math.round((remaining.current / approvedBudget.current) * 100)}% of the budget left`}
          />
          <KpiCard
            label="Leads"
            icon={Users}
            tone="sky"
            value={leads.current.toLocaleString()}
            change={leads}
            changeLabel={changeLabel}
            caption="From HubSpot"
          />
          <KpiCard
            label="Cost per lead"
            icon={Target}
            tone="orange"
            value={money(costPerLead.current)}
            change={costPerLead}
            goodWhen="down"
            changeLabel={changeLabel}
          />
          <KpiCard
            label="ROI"
            icon={TrendingUp}
            tone="pink"
            value={`${roi.current}%`}
            change={{
              ...roi,
              mode: "absolute",
              formatDiff: (d) => `${Math.abs(d)} pts`,
            }}
            changeLabel={changeLabel}
            info="Closed-won revenue minus spend, divided by spend."
          />
        </KpiGrid>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <ChartCard
          title="Budget vs actual vs prior year"
          subtitle={`By month · ${MOCK_PERIOD.label}, ${MOCK_CURRENCY}`}
          action={<BudgetChartLegend compareLabel={MOCK_PERIOD.compareLabel} />}
        >
          <BudgetActualChart
            data={MOCK_MONTHS}
            currency={MOCK_CURRENCY}
            compareLabel={MOCK_PERIOD.compareLabel}
          />
        </ChartCard>
        <ChartCard
          title="Spend by channel"
          subtitle={`${money(totalSpend)} actual spend · ${MOCK_CURRENCY}`}
        >
          <DonutChart
            items={foldIntoOther(MOCK_CHANNEL_SPEND, 5)}
            currency={MOCK_CURRENCY}
            totalLabel="Total spend"
          />
        </ChartCard>
        <ChartCard
          title="Leads and pipeline revenue"
          subtitle={`By month · ${MOCK_PERIOD.label}`}
          info="Leads and pipeline revenue from HubSpot, shown side by side because they're on different scales."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <TrendChart
              dataKey="leads"
              label="Leads"
              color="var(--series-1)"
              format={(v) => v.toLocaleString()}
            />
            <TrendChart
              dataKey="pipeline"
              label="Pipeline revenue"
              color="var(--series-4)"
              format={(v) => compactMoney(v, MOCK_CURRENCY)}
            />
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        <InsightCard
          icon={Trophy}
          tone="amber"
          label="Top performing initiative"
          title={MOCK_HIGHLIGHTS.topInitiative.name}
          to="/initiatives"
          stats={[
            { label: "Leads", value: MOCK_HIGHLIGHTS.topInitiative.leads },
            { label: "ROI", value: `${MOCK_HIGHLIGHTS.topInitiative.roi}%` },
          ]}
        />
        <InsightCard
          icon={ChartColumn}
          tone="violet"
          label="Highest spend channel"
          title={MOCK_HIGHLIGHTS.topSpendChannel.name}
          to="/paid-ads"
          stats={[
            {
              label: "Spend",
              value: wholeK(MOCK_HIGHLIGHTS.topSpendChannel.spend),
            },
            {
              label: "Share",
              value: `${MOCK_HIGHLIGHTS.topSpendChannel.share}%`,
            },
          ]}
        />
        <InsightCard
          icon={Gauge}
          tone="green"
          label="Best ROI channel"
          title={MOCK_HIGHLIGHTS.bestRoiChannel.name}
          to="/events"
          stats={[
            { label: "ROI", value: `${MOCK_HIGHLIGHTS.bestRoiChannel.roi}%` },
            {
              label: "Per lead",
              value: money(MOCK_HIGHLIGHTS.bestRoiChannel.costPerLead),
            },
          ]}
        />
        <InsightCard
          icon={TriangleAlert}
          tone="red"
          warning
          label="Budget at risk"
          title={MOCK_HIGHLIGHTS.atRisk.name}
          to="/budgets"
          stats={[
            { label: "Used", value: `${MOCK_HIGHLIGHTS.atRisk.used}%` },
            {
              label: "Left",
              value: money(MOCK_HIGHLIGHTS.atRisk.remaining),
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5 xl:col-span-3">
          <SectionCard
            title="Initiatives needing attention"
            count={MOCK_ATTENTION.length}
            viewAll="/initiatives"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Initiative",
                      "Channel",
                      "Owner",
                      "Status",
                      "Next action",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_ATTENTION.map((row) => (
                    <tr key={row.name} className="hover:bg-muted/30">
                      <td className={`${cell} font-medium text-foreground`}>
                        <span className="flex items-center gap-2">
                          <CircleAlert
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          {row.name}
                        </span>
                      </td>
                      <td className={`${cell} text-muted-foreground`}>
                        {row.channel}
                      </td>
                      <td className={`${cell} text-muted-foreground`}>
                        {row.owner}
                      </td>
                      <td className={cell}>
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS[row.status].className}`}
                        >
                          {STATUS[row.status].label}
                        </span>
                      </td>
                      <td className={`${cell} text-muted-foreground`}>
                        {row.nextAction}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Upcoming reviews" count={MOCK_REVIEWS.length}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    {["Date", "Initiative", "Type", "Owner", "Purpose"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left font-medium"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_REVIEWS.map((row) => (
                    <tr key={row.name} className="hover:bg-muted/30">
                      <td
                        className={`${cell} whitespace-nowrap text-muted-foreground`}
                      >
                        <span className="flex items-center gap-2">
                          <CalendarCheck
                            className="h-4 w-4 shrink-0"
                            aria-hidden
                          />
                          {shortDate(row.date)}
                        </span>
                      </td>
                      <td className={`${cell} font-medium text-foreground`}>
                        {row.name}
                      </td>
                      <td className={`${cell} text-muted-foreground`}>
                        {row.type}
                      </td>
                      <td className={`${cell} text-muted-foreground`}>
                        {row.owner}
                      </td>
                      <td className={`${cell} text-muted-foreground`}>
                        {row.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="min-w-0 xl:col-span-2">
          <SectionCard title="Recent activity and insights">
            <ul className="divide-y divide-border">
              {MOCK_ACTIVITY.map((item) => {
                const { icon: Icon, className } = ACTIVITY_ICON[item.kind];
                return (
                  <li
                    key={item.title}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${className}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.detail}
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {item.when}
                    </span>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
