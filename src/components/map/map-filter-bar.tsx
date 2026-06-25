"use client";

import { FilterTabs } from "@/components/browser/filter-tabs";
import type {
  BrowserFacets,
  BrowserFilter,
} from "@/lib/queries/recordings";

/**
 * Map uses the same tabbed filter UI as the Browser. The only job here
 * is the search-param → `active` shape mapping (map page reads
 * `params.org_cat` → `filter.orgCategory`; FilterTabs expects the
 * snake_case URL keys).
 */
export function MapFilterBar({
  facets,
  filter,
}: {
  facets: BrowserFacets;
  filter: BrowserFilter;
}) {
  return (
    <FilterTabs
      facets={facets}
      active={{
        decade: filter.decade,
        neighborhood: filter.neighborhood,
        theme: filter.theme,
        org_cat: filter.orgCategory,
        event_cat: filter.eventCategory,
      }}
    />
  );
}
