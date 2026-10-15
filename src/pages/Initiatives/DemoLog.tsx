import { useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, MoreHorizontal, Pencil, Plus, Presentation, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteDemo, useDemos, useDemoSummary, useUpdateDemo } from "@/hooks/useDemos";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/lib/AuthContext";
import type { Demo, DemoCount, DemoSummary } from "@/types/demos";
import type { InitiativeListItem } from "@/types/initiatives";
import { Section } from "./detailParts";
import { MUTED } from "./detailStyles";
import DemoDialog from "./DemoDialog";
import { formatMoney } from "./format";

const TYPE_STYLES: Record<string, string> = {
  BOOTH: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  LIVE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
};

// Further along the funnel reads stronger: grey (none yet / not a fit) → blue → green
function outcomeTone(code: string, rank: number) {
  if (code === "CUSTOMER") return "text-emerald-700 dark:text-emerald-400";
  if (rank >= 3) return "text-blue-700 dark:text-blue-300";
  if (rank >= 1) return "text-slate-800 dark:text-zinc-200";
  return "text-slate-500 dark:text-zinc-400";
}

const percent = (value: number | null) => (value === null ? "—" : `${Number.isInteger(value) ? value : value.toFixed(1)}%`);

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Figure({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-zinc-800">
      <div className={`text-xs font-medium ${MUTED}`}>{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-zinc-100">{value}</div>
      {hint && <div className={`mt-0.5 text-xs ${MUTED}`}>{hint}</div>}
    </div>
  );
}

/** Demos → follow-ups → deals → customers, each bar sized against the number of demos */
function Funnel({ summary }: { summary: DemoSummary }) {
  const { funnel } = summary;
  const steps = [
    { label: "Demos", value: funnel.demos, tone: "bg-violet-500 dark:bg-violet-400" },
    { label: "Follow-up or further", value: funnel.follow_ups, tone: "bg-sky-500 dark:bg-sky-400" },
    { label: "Deal opened", value: funnel.deals, tone: "bg-blue-600 dark:bg-blue-400" },
    { label: "Became a customer", value: funnel.customers, tone: "bg-emerald-600 dark:bg-emerald-400" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Where the demos led</h4>
      {steps.map((step) => (
        <div key={step.label} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-700 dark:text-zinc-300">{step.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
            <span className={`block h-full rounded-full ${step.tone}`} style={{ width: `${funnel.demos ? (step.value / funnel.demos) * 100 : 0}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums text-slate-900 dark:text-zinc-100">{step.value}</span>
        </div>
      ))}
      <p className={`text-xs ${MUTED}`}>
        {funnel.demos - funnel.with_outcome > 0 && `${funnel.demos - funnel.with_outcome} without an outcome yet. `}
        {summary.follow_up_rate !== null && `${percent(summary.follow_up_rate)} of demos with a known outcome led to a follow-up or further.`}
      </p>
    </div>
  );
}

function Breakdown({ title, counts }: { title: string; counts: DemoCount[] }) {
  const largest = Math.max(...counts.map((c) => c.count), 1);
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{title}</h4>
      {counts.length === 0 ? (
        <p className={`text-sm ${MUTED}`}>—</p>
      ) : (
        counts.slice(0, 6).map((c) => (
          <div key={c.key || c.name} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="truncate text-slate-700 dark:text-zinc-300" title={c.name}>
              {c.name}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
              <span className="block h-full rounded-full bg-slate-400 dark:bg-zinc-500" style={{ width: `${(c.count / largest) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums text-slate-900 dark:text-zinc-100">{c.count}</span>
          </div>
        ))
      )}
    </div>
  );
}

/** Edit / delete for one demo */
function DemoActions({ initiative, demo }: { initiative: InitiativeListItem; demo: Demo }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteDemo = useDeleteDemo(initiative.id);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for the demo${demo.company ? ` to ${demo.company}` : ""}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-red-600 focus:text-red-600 dark:text-red-400">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DemoDialog initiative={initiative} demo={demo} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this demo?</AlertDialogTitle>
            <AlertDialogDescription>
              {demo.demo_type_name}
              {demo.company ? ` for ${demo.company}` : ""} on {formatWhen(demo.demo_at)}. The demo count and cost per demo update straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDemo.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteDemo.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteDemo.mutate(demo.id, {
                  onSuccess: () => {
                    toast.success("Demo deleted");
                    setConfirmOpen(false);
                  },
                  onError: (err) => toast.error(err.message || "Could not delete the demo."),
                });
              }}
            >
              {deleteDemo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** The outcome, changeable in place — the quickest way to update demos after the event */
function OutcomeCell({ initiative, demo, editable }: { initiative: InitiativeListItem; demo: Demo; editable: boolean }) {
  const { data: reference } = useReferenceData();
  const updateDemo = useUpdateDemo(initiative.id);
  const label = <span className={`text-sm font-medium ${outcomeTone(demo.outcome_code, demo.outcome_rank)}`}>{demo.outcome_name}</span>;
  if (!editable) return label;
  return (
    <Select
      value={String(demo.outcome_id)}
      onValueChange={(v) =>
        updateDemo.mutate(
          { demoId: demo.id, data: { outcome_id: Number(v) }, quiet: true },
          { onError: (err) => toast.error(err.message || "Could not update the outcome.") },
        )
      }
      disabled={updateDemo.isPending}
    >
      <SelectTrigger size="sm" className="h-8 w-48" aria-label={`Outcome of the demo${demo.company ? ` to ${demo.company}` : ""}`}>
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper">
        {(reference?.demo_outcomes ?? []).map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One sentence that reads like the CEO's example, saying which cost it's based on */
function CostStory({ summary }: { summary: DemoSummary }) {
  const money = (value: number) => formatMoney(value, summary.currency);
  if (summary.total === 0 || summary.cost_per_demo === null) return null;
  const strong = "font-semibold text-slate-900 dark:text-zinc-100";
  return (
    <div className="flex flex-col gap-1 text-sm text-slate-700 dark:text-zinc-300">
      <p>
        {money(summary.expected_cost)} expected cost (estimates included) ÷ {summary.total} {summary.total === 1 ? "demo" : "demos"} given ={" "}
        <span className={strong}>{money(summary.cost_per_demo)} per demo</span>.{" "}
        {summary.funnel.customers > 0 && summary.cost_per_customer !== null ? (
          <>
            {summary.funnel.customers} became {summary.funnel.customers === 1 ? "a customer" : "customers"} through demos:{" "}
            <span className={strong}>{money(summary.cost_per_customer)} per customer</span>.
          </>
        ) : (
          "None has become a customer through a demo yet."
        )}
      </p>
      {/* After the event, or once invoices arrive, the same figures on what has actually been invoiced or paid */}
      {(summary.event_ended || summary.actual_cost > 0) && summary.cost_per_demo_actual !== null && (
        <p>
          On {money(summary.actual_cost)} invoiced or paid so far: <span className={strong}>{money(summary.cost_per_demo_actual)} per demo</span>
          {summary.cost_per_customer_actual !== null && (
            <>
              {" "}
              and <span className={strong}>{money(summary.cost_per_customer_actual)} per customer</span>
            </>
          )}
          .{summary.event_ended && summary.actual_cost < summary.expected_cost && " Some invoices may still be on their way."}
        </p>
      )}
    </div>
  );
}

export default function DemoLog({ initiative }: { initiative: InitiativeListItem }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("INITIATIVES_UPDATE");
  const demos = useDemos(initiative.id);
  const summary = useDemoSummary(initiative.id);
  const [logOpen, setLogOpen] = useState(false);

  // Products come from the log itself: the product shown, or the brand when none was noted.
  // Only demos given count, as in the API: already happened and not a no-show
  const byProduct = useMemo<DemoCount[]>(() => {
    const counts = new Map<string, number>();
    const now = new Date();
    for (const d of demos.data ?? []) {
      if (d.outcome_code === "NO_SHOW" || new Date(d.demo_at) > now) continue;
      const name = d.product_note || d.brand_name || "Not noted";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ key: name, name, count })).sort((a, b) => b.count - a.count);
  }, [demos.data]);

  const action = canEdit ? (
    <Button size="sm" className="gap-2" onClick={() => setLogOpen(true)}>
      <Plus className="h-4 w-4" />
      Log a demo
    </Button>
  ) : undefined;

  if (demos.isLoading || summary.isLoading) {
    return (
      <Section title="Demos" icon={Presentation} action={action}>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Section>
    );
  }

  if (demos.error || summary.error || !summary.data) {
    return (
      <Section title="Demos" icon={Presentation} action={action}>
        <div className="flex items-center gap-3">
          <p className={`text-sm ${MUTED}`}>Could not load the demos.</p>
          <Button variant="outline" size="sm" onClick={() => Promise.all([demos.refetch(), summary.refetch()])}>
            Try again
          </Button>
        </div>
      </Section>
    );
  }

  const s = summary.data;
  const list = demos.data ?? [];
  const money = (value: number | null) => (value === null ? "—" : formatMoney(value, s.currency));
  const typeLine = s.by_type.map((t) => `${t.count} ${t.name.replace(" demo", "").toLowerCase()}`).join(" · ");

  return (
    <>
      <Section title="Demos" icon={Presentation} action={action}>
        {list.length === 0 ? (
          <p className={`text-sm ${MUTED}`}>
            No demos logged yet. Log each demo as it happens — the count, cost per demo and how many became customers fill in automatically.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Figure label="Demos given" value={s.total} hint={typeLine || undefined} />
              <Figure
                label="Companies demoed"
                value={s.companies_demoed}
                hint={s.companies_demoed < s.total ? `Some companies had more than one demo` : undefined}
              />
              <Figure label="Cost per demo" value={money(s.cost_per_demo)} hint={`On ${money(s.expected_cost)} expected cost`} />
              <Figure
                label="Customers via demos"
                value={s.funnel.customers}
                hint={s.customer_rate === null ? undefined : `${percent(s.customer_rate)} of demos given`}
              />
              <Figure label="Cost per customer via demos" value={money(s.cost_per_customer)} hint="Not every customer the event won" />
            </div>

            {(s.upcoming > 0 || s.no_shows > 0) && (
              <p className={`text-sm ${MUTED}`}>
                {s.upcoming > 0 && `${s.upcoming} booked for later — ${s.upcoming === 1 ? "it counts" : "they count"} once ${s.upcoming === 1 ? "it happens" : "they happen"}.`}
                {s.upcoming > 0 && s.no_shows > 0 && " "}
                {s.no_shows > 0 && `${s.no_shows} ${s.no_shows === 1 ? "no-show isn't" : "no-shows aren't"} counted.`}
              </p>
            )}

            <CostStory summary={s} />
            {s.mixed_currencies && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Some costs are in another currency and aren't included in the cost per demo.
              </p>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Funnel summary={s} />
              <Breakdown title="By product" counts={byProduct} />
              <Breakdown title="By staff member" counts={s.by_given_by} />
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">When</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="whitespace-nowrap">Given by</TableHead>
                    <TableHead>Outcome</TableHead>
                    {canEdit && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap tabular-nums text-slate-700 dark:text-zinc-300">
                        {formatWhen(d.demo_at)}
                        {/* Booked for later: not a demo given yet */}
                        {new Date(d.demo_at) > new Date() && (
                          <Badge variant="outline" className="ml-2 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300">
                            Upcoming
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_STYLES[d.demo_type_code] ?? ""}>
                          {d.demo_type_name.replace(" demo", "")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[16rem]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-slate-900 dark:text-zinc-100">{d.company ?? <span className={MUTED}>Not recorded</span>}</span>
                          {d.hubspot_url && (
                            <a
                              href={d.hubspot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                              aria-label={`Open ${d.company ?? "this demo"} in HubSpot`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        {d.note && <div className={`truncate text-xs ${MUTED}`}>{d.note}</div>}
                      </TableCell>
                      <TableCell className="max-w-[14rem]">
                        <div className="truncate text-slate-700 dark:text-zinc-300">{d.product_note ?? d.brand_name ?? "—"}</div>
                        {d.product_note && d.brand_name && <div className={`text-xs ${MUTED}`}>{d.brand_name}</div>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-700 dark:text-zinc-300">{d.given_by_name ?? "—"}</TableCell>
                      <TableCell>
                        <OutcomeCell initiative={initiative} demo={d} editable={canEdit} />
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <DemoActions initiative={initiative} demo={d} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Section>

      {canEdit && <DemoDialog initiative={initiative} open={logOpen} onOpenChange={setLogOpen} />}
    </>
  );
}
