/**
 * Shared category-color contract for organization and historical-event chips
 * rendered on the Player Metadata sidebar (§7.2) and — eventually — the
 * Browser filter drawer. Keeping the lookup tables here means new category
 * values or palette tweaks only touch one file.
 *
 * Chip style shape mirrors the Tailwind utility trio used by the existing
 * Theme chip in `player/metadata-sidebar.tsx` (border + tinted bg + readable
 * fg). Each map entry also carries the human-readable `label` that gets
 * rendered as the group subheading so consumers don't re-derive the display
 * string from snake_case on every render.
 *
 * Colors follow a "tag role" intuition rather than brand allegiance:
 *  - Civic / civil rights / gov lean on primary + sky + indigo (trust hues)
 *  - Violence / disaster / war use destructive + rose (danger hues)
 *  - Economic / business / urban use amber + stone (material hues)
 *  - Cultural / sport / community use emerald + violet + teal (expressive hues)
 * Tailwind arbitrary `-500/10` (bg) and `-500/30` (border) with a `-700`
 * dark-mode-visible foreground render legibly in both light and dark modes
 * that ship today; no new CSS custom properties are introduced.
 */

export type OrganizationCategory =
  | "education"
  | "religious"
  | "civil_rights"
  | "fraternal"
  | "cultural_sports"
  | "business"
  | "media"
  | "healthcare"
  | "labor"
  | "military_veteran"
  | "political"
  | "government"
  | "community";

export type HistoricalEventCategory =
  | "racial_violence"
  | "civil_rights"
  | "education_milestones"
  | "economic_shifts"
  | "migration_demographics"
  | "urban_development"
  | "war_military"
  | "natural_disaster"
  | "cultural_milestones"
  | "political_event"
  | "sports_milestones"
  | "public_health"
  | "other";

export type CategoryStyle = {
  /** Background utility class(es) for the chip surface. */
  bg: string;
  /** Foreground utility class(es) for chip text — must clear WCAG AA on `bg`
   *  in both the light and dark themes that ship today. */
  text: string;
  /** Border utility class(es); paired with the outline Badge variant. */
  border: string;
  /** Display label shown as the group subheading (pre-humanized so consumers
   *  don't re-derive snake_case at render time). */
  label: string;
};

export const ORG_CATEGORY_STYLES: Record<OrganizationCategory, CategoryStyle> = {
  education: {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30",
    label: "Education",
  },
  religious: {
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/30",
    label: "Religious",
  },
  civil_rights: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    label: "Civil rights",
  },
  fraternal: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-500/30",
    label: "Fraternal",
  },
  cultural_sports: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    label: "Cultural & sports",
  },
  business: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    label: "Business",
  },
  media: {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-500/30",
    label: "Media",
  },
  healthcare: {
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/30",
    label: "Healthcare",
  },
  labor: {
    bg: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500/30",
    label: "Labor",
  },
  military_veteran: {
    bg: "bg-stone-500/15",
    text: "text-stone-700 dark:text-stone-300",
    border: "border-stone-500/40",
    label: "Military & veteran",
  },
  political: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/30",
    label: "Political",
  },
  government: {
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    label: "Government",
  },
  community: {
    bg: "bg-lime-500/10",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-500/40",
    label: "Community",
  },
};

// Insertion order here drives the Metadata-sidebar render order for event
// chip groups (see groupByCategory in metadata-sidebar.tsx —
// `Object.keys(EVENT_CATEGORY_STYLES)` sets the canonical sequence).
// Editorial priority: lead with generative categories (cultural, urban,
// economic), end with the hardest-weight category (racial_violence) so
// the sidebar reads in an arc from what built Atlanta to what hurt it.
export const EVENT_CATEGORY_STYLES: Record<
  HistoricalEventCategory,
  CategoryStyle
> = {
  cultural_milestones: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    label: "Cultural milestones",
  },
  urban_development: {
    bg: "bg-stone-500/15",
    text: "text-stone-700 dark:text-stone-300",
    border: "border-stone-500/40",
    label: "Urban development",
  },
  economic_shifts: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    label: "Economic shifts",
  },
  education_milestones: {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30",
    label: "Education milestones",
  },
  political_event: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/30",
    label: "Political event",
  },
  civil_rights: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    label: "Civil rights",
  },
  sports_milestones: {
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/30",
    label: "Sports milestones",
  },
  public_health: {
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/30",
    label: "Public health",
  },
  migration_demographics: {
    bg: "bg-lime-500/10",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-500/40",
    label: "Migration & demographics",
  },
  war_military: {
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    label: "War & military",
  },
  natural_disaster: {
    bg: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500/40",
    label: "Natural disaster",
  },
  other: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    label: "Other",
  },
  racial_violence: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    label: "Racial violence",
  },
};

/**
 * Fallback chip style used when an unexpected / unmapped category string
 * sneaks through (e.g. pipeline ships a new taxonomy value before the web
 * app catches up). Muted palette so it reads as "uncategorized" rather
 * than as a mis-classified known category.
 */
export const UNKNOWN_CATEGORY_STYLE: CategoryStyle = {
  bg: "bg-muted",
  text: "text-muted-foreground",
  border: "border-border",
  label: "Other",
};

/**
 * Theme palette. Themes are a closed vocabulary (see
 * `livingatl-pipeline/scripts/config.py::THEME_TAXONOMY`), so we assign
 * hues by meaning rather than hash: civil-rights / segregation lean on
 * the urgency palette, civic / educational themes lean cool, cultural
 * themes lean expressive. Unrecognized themes fall through to the
 * neighborhood palette via a stable hash so new pipeline values render
 * as legible chips until they get a semantic mapping.
 */
export const THEME_STYLES: Record<string, CategoryStyle> = {
  civil_rights: {
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    label: "Civil rights",
  },
  segregation: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    label: "Segregation",
  },
  integration: {
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/30",
    label: "Integration",
  },
  education: {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30",
    label: "Education",
  },
  housing: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    label: "Housing",
  },
  employment: {
    bg: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500/40",
    label: "Employment",
  },
  religion: {
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/30",
    label: "Religion",
  },
  family: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    label: "Family",
  },
  community: {
    bg: "bg-lime-500/10",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-500/40",
    label: "Community",
  },
  music: {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-500/30",
    label: "Music",
  },
  arts: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-500/30",
    label: "Arts",
  },
  politics: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/30",
    label: "Politics",
  },
  health: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    label: "Health",
  },
  migration: {
    bg: "bg-stone-500/15",
    text: "text-stone-700 dark:text-stone-300",
    border: "border-stone-500/40",
    label: "Migration",
  },
  urban_renewal: {
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    label: "Urban renewal",
  },
  transportation: {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30",
    label: "Transportation",
  },
  business: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-500/40",
    label: "Business",
  },
  crime: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    label: "Crime",
  },
  sports: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    label: "Sports",
  },
  military: {
    bg: "bg-stone-500/15",
    text: "text-stone-700 dark:text-stone-300",
    border: "border-stone-500/40",
    label: "Military",
  },
  food_culture: {
    bg: "bg-pink-500/10",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-500/30",
    label: "Food culture",
  },
};

/**
 * Neighborhood palette. Neighborhoods aren't categorized the way orgs and
 * events are, so we pick from a fixed hue palette and map each canonical
 * name to a slot via a stable hash. Each neighborhood reads as distinct
 * without loading brand meaning onto any one place name.
 */
const NEIGHBORHOOD_PALETTE: CategoryStyle[] = [
  {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30",
    label: "",
  },
  {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    label: "",
  },
  {
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/30",
    label: "",
  },
  {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    label: "",
  },
  {
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/30",
    label: "",
  },
  {
    bg: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-500/30",
    label: "",
  },
  {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-500/30",
    label: "",
  },
  {
    bg: "bg-lime-500/10",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-500/40",
    label: "",
  },
  {
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/30",
    label: "",
  },
  {
    bg: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500/40",
    label: "",
  },
];

/**
 * Hex equivalents of `NEIGHBORHOOD_PALETTE`, same index order. Mapbox
 * renders into a `<canvas>` so Tailwind utility classes don't resolve at
 * paint time — the Map client reads from this array to color pins,
 * polygons, and corridors with the same hue each neighborhood's Browser /
 * Player chip uses. Values mirror Tailwind's default -500 ramp (Tailwind
 * 4 keeps the same scale).
 */
const NEIGHBORHOOD_PALETTE_HEX: readonly string[] = [
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#d946ef", // fuchsia-500
  "#84cc16", // lime-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
];

function hashIndex(s: string, mod: number): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i += 1) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % mod;
}

export function neighborhoodStyle(name: string): CategoryStyle {
  return NEIGHBORHOOD_PALETTE[hashIndex(name, NEIGHBORHOOD_PALETTE.length)];
}

/**
 * Hex color for a neighborhood — same slot as `neighborhoodStyle(name)`,
 * so map pins / polygons / corridors match each neighborhood's Browser
 * chip hue exactly. Use when the target renderer can't consume Tailwind
 * classes (Mapbox canvas paint expressions, canvas 2D draws, etc.).
 */
export function neighborhoodColor(name: string): string {
  return NEIGHBORHOOD_PALETTE_HEX[
    hashIndex(name, NEIGHBORHOOD_PALETTE_HEX.length)
  ];
}

/**
 * Theme chip style. Uses `THEME_STYLES` for the 21-item canonical
 * vocabulary; unknown themes (e.g. pipeline ships a new value before the
 * web app catches up) fall through to a hash slot on the neighborhood
 * palette offset by one so they're readable but don't land on the same
 * slot as a neighborhood of the same name.
 */
export function themeStyle(theme: string): CategoryStyle {
  if (theme in THEME_STYLES) return THEME_STYLES[theme];
  const idx = (hashIndex(theme, NEIGHBORHOOD_PALETTE.length) + 1)
    % NEIGHBORHOOD_PALETTE.length;
  return NEIGHBORHOOD_PALETTE[idx];
}

/** Turn `"cultural_sports"` into `"Cultural sports"`. Used for category
 *  subheadings when the value isn't in the lookup table, and as a general
 *  snake_case → Title-case helper for label fallbacks. */
export function humanizeCategory(category: string): string {
  if (!category) return "";
  const spaced = category.replace(/_/g, " ").trim();
  if (!spaced) return "";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Safe lookup for organization styles; falls through to the muted
 *  fallback when the category isn't recognized so new pipeline values
 *  don't throw. */
export function organizationStyle(category: string): CategoryStyle {
  if (category in ORG_CATEGORY_STYLES) {
    return ORG_CATEGORY_STYLES[category as OrganizationCategory];
  }
  return { ...UNKNOWN_CATEGORY_STYLE, label: humanizeCategory(category) };
}

/** Safe lookup for historical-event styles; same fallback pattern as
 *  `organizationStyle`. */
export function historicalEventStyle(category: string): CategoryStyle {
  if (category in EVENT_CATEGORY_STYLES) {
    return EVENT_CATEGORY_STYLES[category as HistoricalEventCategory];
  }
  return { ...UNKNOWN_CATEGORY_STYLE, label: humanizeCategory(category) };
}
