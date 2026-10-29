/**
 * Neighborhood ("place") pages — `/places/<slug>` (F-places). Neighborhood
 * names are the canonical values in `metadata_extracted.neighborhoods`
 * (scripts/config.py NEIGHBORHOOD_CANONICAL); slugs are derived, never
 * stored, and resolved back against the current facet list.
 */

/** "Sweet Auburn" → "sweet-auburn"; "Pittsburgh & Mechanicsville" → "pittsburgh-and-mechanicsville". */
export function placeSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function placeHref(name: string): string {
  return `/places/${placeSlug(name)}`;
}

/** The canonical neighborhood name for a slug, or null. */
export function placeFromSlug(names: readonly string[], slug: string): string | null {
  return names.find((n) => placeSlug(n) === slug) ?? null;
}
