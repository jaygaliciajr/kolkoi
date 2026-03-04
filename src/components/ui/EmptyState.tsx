import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  icon,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="text-center" interactive={false}>
      <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {icon ?? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
          </svg>
        )}
      </div>
      <CardTitle className="mt-4">{title}</CardTitle>
      <CardDescription className="mt-1">{description}</CardDescription>
      {ctaHref && ctaLabel ? (
        <div className="mt-4">
          <Link href={ctaHref}>
            <Button>{ctaLabel}</Button>
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
