"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function AppToaster() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      richColors
      closeButton
      position={mobile ? "bottom-center" : "top-right"}
      toastOptions={{
        className: "rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100",
      }}
    />
  );
}
