import Link from "next/link";
import type { ReactNode } from "react";

import { cardBase, cardHover, focusRing, shadowSoft, transitionMed } from "@/lib/ui/tokens";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

type CardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
};

export function Card({ children, className, interactive = true }: CardProps) {
  return (
    <section
      className={cx(
        cardBase,
        shadowSoft,
        "p-6",
        interactive && cx(cardHover, transitionMed),
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "group block",
        cardBase,
        shadowSoft,
        cardHover,
        transitionMed,
        focusRing,
        "relative p-6",
        className,
      )}
    >
      <div className="pr-7">{children}</div>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cx("mb-4 space-y-1", className)}>{children}</div>;
}

export function CardTitle({ children, className }: CardProps) {
  return <h2 className={cx("text-lg font-semibold text-text", className)}>{children}</h2>;
}

export function CardDescription({ children, className }: CardProps) {
  return <p className={cx("text-sm text-muted", className)}>{children}</p>;
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cx("space-y-3", className)}>{children}</div>;
}
