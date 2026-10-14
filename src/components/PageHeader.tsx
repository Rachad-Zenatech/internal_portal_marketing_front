import type { ReactNode } from "react";

export type PageTone = "violet" | "sky" | "emerald" | "amber" | "rose" | "slate";

// Full class names so Tailwind keeps them: a soft wash of the tone behind the header, and a matching icon tile
const TONES: Record<PageTone, { band: string; tile: string }> = {
  violet: {
    band: "from-violet-100/80 via-white to-sky-50/70 border-violet-100 dark:from-violet-950/60 dark:via-card dark:to-card dark:border-violet-900/50",
    tile: "bg-violet-600 text-white shadow-violet-600/30 dark:bg-violet-500",
  },
  sky: {
    band: "from-sky-100/80 via-white to-indigo-50/60 border-sky-100 dark:from-sky-950/60 dark:via-card dark:to-card dark:border-sky-900/50",
    tile: "bg-sky-600 text-white shadow-sky-600/30 dark:bg-sky-500",
  },
  emerald: {
    band: "from-emerald-100/80 via-white to-teal-50/60 border-emerald-100 dark:from-emerald-950/60 dark:via-card dark:to-card dark:border-emerald-900/50",
    tile: "bg-emerald-600 text-white shadow-emerald-600/30 dark:bg-emerald-500",
  },
  amber: {
    band: "from-amber-100/80 via-white to-orange-50/60 border-amber-100 dark:from-amber-950/50 dark:via-card dark:to-card dark:border-amber-900/50",
    tile: "bg-amber-500 text-white shadow-amber-500/30 dark:bg-amber-500",
  },
  rose: {
    band: "from-rose-100/80 via-white to-pink-50/60 border-rose-100 dark:from-rose-950/50 dark:via-card dark:to-card dark:border-rose-900/50",
    tile: "bg-rose-600 text-white shadow-rose-600/30 dark:bg-rose-500",
  },
  slate: {
    band: "from-slate-100 via-white to-white border-slate-200 dark:from-zinc-800/80 dark:via-card dark:to-card dark:border-zinc-800",
    tile: "bg-slate-800 text-white shadow-slate-800/20 dark:bg-zinc-200 dark:text-zinc-900",
  },
};

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon: React.ElementType;
  tone?: PageTone;
  /** Buttons on the right; they wrap under the title on small screens */
  actions?: ReactNode;
  /** Extra content under the title, e.g. badges or key facts */
  children?: ReactNode;
}

/** The coloured banner at the top of a page: icon, title, what the page is for, and its main actions */
export default function PageHeader({ title, description, icon: Icon, tone = "violet", actions, children }: PageHeaderProps) {
  const colours = TONES[tone];
  return (
    <header className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 sm:p-6 ${colours.band}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg sm:h-12 sm:w-12 ${colours.tile}`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-zinc-50">{title}</h1>
            {description && <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-zinc-400">{description}</p>}
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
      </div>
    </header>
  );
}
