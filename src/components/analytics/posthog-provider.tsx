"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { capturePageview } from "@/lib/analytics/posthog";

/**
 * Fires a `$pageview` event on every App Router navigation. The Next.js
 * App Router does client-side navigations that don't trigger a browser
 * page-load, so PostHog's built-in auto-pageview doesn't fire — we have
 * to observe `usePathname` ourselves.
 *
 * Keyed on the pathname only. Query-string changes within a page (Timeline
 * pan/zoom, Browse filters and search) are interactions, not page views —
 * counting them flooded `$pageview` and skewed every per-page metric. The
 * query string at the moment of navigation is still recorded in the URL.
 */
export function PostHogPageviewProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    capturePageview(`${pathname}${window.location.search}`);
  }, [pathname]);

  return null;
}
