"use client";

import { MapClient, type MapClientProps } from "./map-client";
import type { BrowserFacets, BrowserFilter } from "@/lib/queries/recordings";
import { MapFilterBar } from "./map-filter-bar";

/**
 * Filter bar + the drawn neighborhood map. (Until 2026-10-29 this
 * lazy-loaded a ~700 KB Mapbox street map; the drawn map is a few KB of
 * our own code and needs no outside service.)
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
