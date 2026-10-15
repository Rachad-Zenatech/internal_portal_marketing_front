import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: React.ElementType;
  /** Small text above the title, e.g. a back link or the section the page is in */
  eyebrow?: ReactNode;
  /** Buttons on the right; they wrap under the title on small screens */
  actions?: ReactNode;
  /** Extra content under the title, e.g. badges or key facts */
  children?: ReactNode;
}

/** The top of a page: title, what the page is for, and its main actions — the same plain header as the other portals */
export default function PageHeader({ title, description, icon: Icon, eyebrow, actions, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-4 sm:pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="mb-1.5 text-xs font-medium text-muted-foreground">{eyebrow}</div>}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-xs sm:flex">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h1 className="min-w-0 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        </div>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{description}</p>}
        {children && <div className="mt-3">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </header>
  );
}
