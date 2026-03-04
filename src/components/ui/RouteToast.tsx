"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function RouteToast() {
  const params = useSearchParams();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const info = params.get("info");
    const success = params.get("success");
    const error = params.get("error");

    const key = `${info ?? ""}|${success ?? ""}|${error ?? ""}`;
    if (!info && !success && !error) return;
    if (lastKey.current === key) return;
    lastKey.current = key;

    if (info === "org-selected") {
      toast.info("Organization selected.");
      return;
    }

    if (success) {
      toast.success(success.replaceAll("-", " "));
      return;
    }

    if (error) {
      toast.error(error.replaceAll("-", " "));
    }
  }, [params]);

  return null;
}
