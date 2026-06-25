/**
 * Neighborhood palette for the Timeline folio's neighborhood tags.
 *
 * Unlike themes (21 values with semantic families → curated per-slot
 * palette), neighborhoods are 30+ canonical place names with no
 * meaningful grouping to preserve visually. A deterministic hash from
 * the neighborhood string into an 8-color palette gives each place
 * a consistent hue across renders while keeping the palette small
 * enough to read as "neighborhoods" rather than "a second chromatic
 * field competing with themes."
 *
 * Colors are picked as earthy Atlanta-ish tones that sit deliberately
 * outside the theme palette's warm/red/gold axis — slate, sage,
 * burgundy, mustard, rose, turquoise, forest, plum. Saturated enough
 * to read on a 15-20% alpha tint across light / dark / geist surfaces
 * without needing theme-scoped variants.
 */

const NEIGHBORHOOD_PALETTE = [
  "#3B7EA1", // slate blue
  "#7D9864", // sage
  "#A05C4A", // burnt sienna
  "#C19A3A", // mustard
  "#B8738A", // dusty rose
  "#3A8C9A", // turquoise
  "#5B7C5E", // forest
  "#8A5E76", // plum
] as const;

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic color assignment — same neighborhood always resolves
 *  to the same hue. */
export function neighborhoodColor(name: string): string {
  if (!name) return NEIGHBORHOOD_PALETTE[0];
  return NEIGHBORHOOD_PALETTE[hashString(name) % NEIGHBORHOOD_PALETTE.length];
}
