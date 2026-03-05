"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { focusRing, transitionFast } from "@/lib/ui/tokens";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const label = mounted ? (isDark ? "Dark" : "Light") : "Theme";
  const actionLabel = mounted
    ? isDark
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-3 text-muted shadow-[var(--shadow-soft)]",
        "hover:bg-surface-2 hover:text-text",
        transitionFast,
        focusRing,
        className,
      )}
      aria-label={actionLabel}
      title={actionLabel}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
          <path d="m5.6 5.6 1.4 1.4" />
          <path d="m17 17 1.4 1.4" />
          <path d="m5.6 18.4 1.4-1.4" />
          <path d="m17 7 1.4-1.4" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
      {!compact ? <span className="hidden text-xs font-medium text-text sm:inline">{label}</span> : null}
    </button>
  );
}
