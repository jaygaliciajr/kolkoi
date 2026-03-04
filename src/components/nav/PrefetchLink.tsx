"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";
import { useEffect, useRef } from "react";

import { startRouteProgress } from "@/components/nav/RouteProgress";

type PrefetchLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    prefetchOnMount?: boolean;
  };

function hrefToString(href: LinkProps["href"]) {
  return typeof href === "string" ? href : href.pathname ?? "";
}

export function PrefetchLink({ href, onMouseEnter, onFocus, onClick, prefetchOnMount = false, prefetch = true, ...props }: PrefetchLinkProps) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement | null>(null);
  const hrefString = hrefToString(href);

  useEffect(() => {
    if (!prefetch || !prefetchOnMount || !hrefString) return;
    router.prefetch(hrefString);
  }, [hrefString, prefetch, prefetchOnMount, router]);

  useEffect(() => {
    if (!prefetch || !hrefString || !ref.current || typeof IntersectionObserver === "undefined") return;

    const node = ref.current;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        router.prefetch(hrefString);
        observer.disconnect();
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hrefString, prefetch, router]);

  return (
    <Link
      ref={ref}
      href={href}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        if (prefetch && hrefString) router.prefetch(hrefString);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        if (prefetch && hrefString) router.prefetch(hrefString);
        onFocus?.(event);
      }}
      onClick={(event) => {
        startRouteProgress();
        onClick?.(event);
      }}
      {...props}
    />
  );
}
