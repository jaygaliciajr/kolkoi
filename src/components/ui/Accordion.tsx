"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { transitionMed } from "@/lib/ui/tokens";

export function Accordion({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/70">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left ${transitionMed}`}
      >
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{title}</p>
          {subtitle ? <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        <span className={`text-slate-500 ${transitionMed} ${open ? "rotate-180" : ""}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
