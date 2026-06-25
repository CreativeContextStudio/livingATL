import {
  THEME_FAMILIES,
  isThemeKey,
  type ThemeKey,
} from "@/lib/theme-colors";
import type { TimelineMoment } from "@/lib/queries/timeline";

/**
 * Facet computation for the Timeline filter bar.
 *
 * Both functions derive counts from the already-fetched moment array —
 * no new DB query needed. Results drive the option lists in the
 * Themes / Neighborhoods multi-select popovers so a viewer can see at a
 * glance which tags are dense and which are rare.
 */

export type ThemeFacet = { key: ThemeKey; count: number };
export type NeighborhoodFacet = { name: string; count: number };

/** Themes grouped by family (Justice / Place / ...), anchor listed
 *  first within each group, each slot carrying a live count of
 *  matching moments in the corpus. Themes with zero matches are
 *  preserved — the viewer sees the full palette and can tell which
 *  buckets are empty. */
export function computeThemeFacets(moments: TimelineMoment[]): Array<{
  family: (typeof THEME_FAMILIES)[number];
  facets: ThemeFacet[];
}> {
  const counts = new Map<ThemeKey, number>();
  for (const m of moments) {
    for (const t of m.themes) {
      if (!isThemeKey(t)) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return THEME_FAMILIES.map((family) => ({
    family,
    facets: family.members.map((key) => ({
      key,
      count: counts.get(key) ?? 0,
    })),
  }));
}

/** Neighborhoods sorted by count desc. Names are the free-form
 *  canonical strings from `metadata_extracted.neighborhoods` — we
 *  don't normalize further here. */
export function computeNeighborhoodFacets(
  moments: TimelineMoment[],
): NeighborhoodFacet[] {
  const counts = new Map<string, number>();
  for (const m of moments) {
    for (const n of m.neighborhoods) {
      if (!n) continue;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
