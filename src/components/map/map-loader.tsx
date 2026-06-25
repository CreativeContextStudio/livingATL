"use client";

import dynamic from "next/dynamic";
import type { MapClientProps } from "./map-client";

/**
 * Client-side loader for `MapClient`. Dynamic-imports mapbox-gl (+ the rest
 * of the map chunk, ~700KB) only when this component renders, so the
 * initial `/map` page shell can paint its header + filter bar before the
 * map library streams in. Also keeps the map out of the initial JS for any
 * future layout that mounts it conditionally.
 *
 * `ssr: false` requires this wrapper to be a Client Component — Next 16
 * refuses `next/dynamic` with `ssr: false` from inside a Server Component
 * page.
 */
const MapClient = dynamic(
  () => import("./map-client").then((m) => ({ default: m.MapClient })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Loading map"
        className="h-[60dvh] min-h-[360px] w-full animate-pulse rounded-xl bg-muted/40 lg:h-[70dvh] lg:min-h-[420px]"
      />
    ),
  },
);

export function MapLoader(props: MapClientProps) {
  return <MapClient {...props} />;
}
