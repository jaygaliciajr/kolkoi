"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

type AnimatedNumberFormat = "number" | "currency" | "percent";

function formatValue(value: number, format: AnimatedNumberFormat, currency: string, maximumFractionDigits: number) {
  if (format === "currency") {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits,
      minimumFractionDigits: maximumFractionDigits,
    }).format(value);
  }

  if (format === "percent") {
    return new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }).format(value / 100);
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(value);
}

export function AnimatedNumber({
  value,
  format = "number",
  className,
  duration = 0.75,
  currency = "PHP",
  maximumFractionDigits = 0,
}: {
  value: number;
  format?: AnimatedNumberFormat;
  className?: string;
  duration?: number;
  currency?: string;
  maximumFractionDigits?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const formatted = useTransform(motionValue, (latest) =>
    formatValue(latest, format, currency, maximumFractionDigits),
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [currency, duration, format, maximumFractionDigits, motionValue, prefersReducedMotion, value]);

  return <motion.span className={className}>{formatted}</motion.span>;
}
