"use client";

import { MapClient, type MapClientProps } from "./map-client";
import type { BrowserFacets, BrowserFilter } from "@/lib/queries/recordings";
import { MapFilterBar } from "./map-filter-bar";

/**
 * Filter bar + the neighborhood map: the drawn map first, upgraded to the
 * 3D MapLibre view (our own static map tiles, lazy-loaded) where WebGL
 * works. (Until 2026-10-29 this lazy-loaded a Mapbox street map.)
 */
export function MapLoader({
  facets,
  filter,
  ...mapProps
}: MapClientProps & { facets: BrowserFacets; filter: BrowserFilter }) {
  return (
    <div className="flex flex-col gap-4">
      <MapFilterBar facets={facets} filter={filter} />
      <MapClient {...mapProps} initialNeighborhood={filter.neighborhood} />
    </div>
  );
}
