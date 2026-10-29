"use client";

import dynamic from "next/dynamic";
import type { MapClientProps } from "./map-client";
import type { BrowserFacets, BrowserFilter } from "@/lib/queries/recordings";
import { MapFilterBar } from "./map-filter-bar";
import { useDocumentTheme } from "@/lib/theme-client";

/**
 * Client-side loader for `MapClient`. Dynamic-imports mapbox-gl (+ the rest
 * of the map chunk, ~700KB) only when this component renders, so the
 * initial `/map` page shell can paint its header + filter bar before the
 * map library streams in. The filter bar is rendered here, outside the
 * dynamic chunk, so it really does paint first. Also keeps the map out of the initial JS for any
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

export function MapLoader({
  facets,
  filter,
  ...mapProps
}: MapClientProps & { facets: BrowserFacets; filter: BrowserFilter }) {
  const theme = useDocumentTheme();
  return (
    <div className="flex flex-col gap-4">
      <MapFilterBar facets={facets} filter={filter} />
      {/* Keyed on theme: Mapbox basemap styles can't be swapped without
          re-adding every custom layer, so a theme switch remounts the map. */}
      <MapClient key={theme} {...mapProps} />
    </div>
  );
}
