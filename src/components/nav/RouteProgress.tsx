"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { startRouteProgress, stopRouteProgress, subscribeRouteProgress } from "@/components/nav/routeProgressStore";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeRouteProgress((next) => setPending(next));
  }, []);

  useEffect(() => {
    stopRouteProgress();
  }, [pathname, searchParams]);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (pending) {
      timerRef.current = window.setTimeout(() => setVisible(true), 150);
      return;
    }

    timerRef.current = window.setTimeout(() => setVisible(false), 16);
  }, [pending]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="route-progress"
          className="fixed left-0 right-0 top-0 z-[80] h-0.5 origin-left bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"
          initial={{ scaleX: 0, opacity: 0.9 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0.1 : 0.35,
            ease: "easeOut",
          }}
        />
      ) : null}
    </AnimatePresence>
  );
}

export { startRouteProgress };
