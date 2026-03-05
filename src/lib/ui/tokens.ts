export const designTokens = {
  spacing: {
    "2xs": "0.375rem",
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "2.5rem",
    "3xl": "3rem",
  },
  radii: {
    sm: "0.625rem",
    md: "0.875rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    full: "9999px",
  },
  shadows: {
    soft: "0 16px 42px -24px rgba(15, 23, 42, 0.28)",
    elevated: "0 20px 56px -26px rgba(15, 23, 42, 0.34)",
    focus: "0 0 0 3px rgba(79, 70, 229, 0.18)",
  },
  typography: {
    hero: "clamp(1.75rem, 2vw + 1rem, 2.375rem)",
    heading: "clamp(1.125rem, 1vw + 1rem, 1.5rem)",
    body: "0.95rem",
    caption: "0.78rem",
  },
  motion: {
    fast: "150ms",
    base: "200ms",
    slow: "280ms",
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
} as const;

export const transitionFast =
  "transition-[background-color,color,border-color,opacity,transform,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)]";
export const transitionMed =
  "transition-[background-color,color,border-color,opacity,transform,box-shadow] duration-[var(--motion-base)] ease-[var(--ease-standard)]";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

export const shadowSoft = "shadow-[var(--shadow-soft)]";

export const cardBase =
  "rounded-[var(--radius-2xl)] border border-border/70 bg-surface/80 text-text backdrop-blur-md";

export const cardHover =
  "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--shadow-elevated)] active:scale-[0.99] motion-reduce:transform-none";

export const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-xl)] px-4 font-medium disabled:cursor-not-allowed disabled:opacity-60";

export const inputBase =
  "w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted";

export const badgeBase =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide";

export const pageContainer = "mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8";
export const sectionStack = "space-y-6";
