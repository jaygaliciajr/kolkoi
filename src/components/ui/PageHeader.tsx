import Link from "next/link";
import type { ReactNode } from "react";

type Breadcrumb = {
  label: string;
  href?: string;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  filters,
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  filters?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("space-y-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Page breadcrumbs" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-text">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-text/90" : ""}>{crumb.label}</span>
                )}
                {!isLast ? <span>/</span> : null}
              </span>
            );
          })}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-[clamp(1.75rem,2vw+1rem,2.375rem)] font-semibold tracking-tight text-text">
            {title}
          </h1>
          {subtitle ? <p className="max-w-3xl text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {filters ? (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface/70 p-3 backdrop-blur-sm">
          {filters}
        </div>
      ) : null}
    </header>
  );
}
