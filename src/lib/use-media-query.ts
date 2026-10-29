"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result. `false` during SSR and hydration, so markup that
 * depends on it must render a safe default first (e.g. the desktop layout
 * hidden behind CSS breakpoints, or nothing).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
