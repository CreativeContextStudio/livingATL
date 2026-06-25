"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { capturePageview } from "@/lib/analytics/posthog";

/**
 * Fires a `$pageview` event on every App Router navigation. The Next.js
 * App Router does client-side navigations that don't trigger a browser
 * page-load, so PostHog's built-in auto-pageview doesn't fire — we have
 * to observe `usePathname` + `useSearchParams` ourselves.
 *
 * `useSearchParams` opts the subtree into dynamic rendering, so we wrap
 * the inner component in `<Suspense>` per the Next.js guidance — without
 * it, the whole app bails out of static rendering.
 */
export function PostHogPageviewProvider() {
  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    capturePageview(url);
  }, [pathname, searchParams]);

  return null;
}
