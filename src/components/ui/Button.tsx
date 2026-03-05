"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { buttonBase, focusRing, shadowSoft, transitionFast } from "@/lib/ui/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:opacity-95 active:opacity-90",
  secondary:
    "border border-border bg-surface text-text hover:bg-surface-2",
  ghost:
    "text-text hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-95 active:opacity-90",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ButtonInner({ loading, leftIcon, rightIcon, children }: Pick<ButtonProps, "loading" | "leftIcon" | "rightIcon" | "children">) {
  return (
    <>
      <span className="inline-flex h-4 w-4 items-center justify-center">{loading ? <Spinner /> : leftIcon ?? null}</span>
      <span>{children}</span>
      <span className="inline-flex h-4 w-4 items-center justify-center">{rightIcon ?? null}</span>
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  const isDisabled = disabled || loading;

  const classes = [
    buttonBase,
    focusRing,
    shadowSoft,
    transitionFast,
    variantClass[variant],
    sizeClass[size],
    "active:scale-[0.98] active:shadow-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (reduceMotion) {
    return (
      <button {...props} disabled={isDisabled} className={classes}>
        <ButtonInner loading={loading} leftIcon={leftIcon} rightIcon={rightIcon}>
          {children}
        </ButtonInner>
      </button>
    );
  }

  return (
    <motion.button
      {...(props as Record<string, unknown>)}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.08 }}
      disabled={isDisabled}
      className={classes}
    >
      <ButtonInner loading={loading} leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </ButtonInner>
    </motion.button>
  );
}
