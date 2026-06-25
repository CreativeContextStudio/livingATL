/**
 * Interactive Timeline — 21-theme color palette (PRD §7.3.1, Phase 2 P2).
 *
 * Every moment in the corpus carries 1-3 themes from THEME_TAXONOMY
 * (scripts/config.py). The Timeline surfaces a moment's primary theme
 * (themes[0]) as the dot's fill color so clusters read topically at a
 * glance — "reds are justice, blues are institutions, greens are daily
 * life."
 *
 * Structure: five semantic families plus CIVIL_RIGHTS as its own anchor
 * (the single highest-density theme in the corpus; promoted out of the
 * Justice family so it has visual priority).
 *
 *   Anchor              civil_rights
 *   Justice + Struggle  segregation · integration · politics · crime
 *   Place + Movement    housing · urban_renewal · migration · transportation
 *   Daily Life          family · community · religion · food_culture · health
 *   Work + Institutions education · employment · business · military
 *   Culture             music · arts · sports
 *
 * Each theme has three surface variants (light / dark / geist) tuned so
 * the dot renders legibly against the current theme's card surface:
 *   - light : #FFF8F5 warm-white ABS light surface
 *   - dark  : #232326 charcoal (lifted, not true-black)
 *   - geist : #FFFFFF neutral shadcn default
 *
 * Values are emitted as CSS custom properties `--theme-color-<slug>` in
 * `globals.css` under each `[data-theme=...]` block, so a single
 * `var(--theme-color-civil-rights)` reference in a component resolves
 * to the correct variant at paint time with zero JS.
 */

export type ThemeKey =
  | "civil_rights"
  | "segregation"
  | "integration"
  | "politics"
  | "crime"
  | "housing"
  | "urban_renewal"
  | "migration"
  | "transportation"
  | "family"
  | "community"
  | "religion"
  | "food_culture"
  | "health"
  | "education"
  | "employment"
  | "business"
  | "military"
  | "music"
  | "arts"
  | "sports";

type PaletteEntry = {
  light: string;
  dark: string;
  geist: string;
};

// NOTE: mirror of the `--theme-color-*` custom properties in globals.css.
// These literals have no runtime consumers (components resolve via the
// `var(--theme-color-*)` helpers below), but globals.css is the source of
// truth — keep this map in sync if you retune either. Vibrant 2026-06-25:
// saturated variations within each family hue so the per-theme chips read
// as one system with the vivid 5-family dot palette.
export const THEME_COLORS: Record<ThemeKey, PaletteEntry> = {
  // Anchor — the single highest-density theme.
  civil_rights:    { light: "#E5345B", dark: "#FF5C7E", geist: "#E11D48" },

  // Justice + Struggle — vivid rose-reds
  segregation:     { light: "#D8324F", dark: "#FF6E76", geist: "#DC2626" },
  integration:     { light: "#EF5A78", dark: "#FF7E98", geist: "#F43F5E" },
  politics:        { light: "#C82A63", dark: "#F25A92", geist: "#BE123C" },
  crime:           { light: "#B11E44", dark: "#E8466F", geist: "#9F1239" },

  // Place + Movement — vivid greens
  housing:         { light: "#12A05E", dark: "#2DD08A", geist: "#059669" },
  urban_renewal:   { light: "#17B86A", dark: "#4FE0A0", geist: "#10B981" },
  migration:       { light: "#0C8A66", dark: "#22C29A", geist: "#0D9488" },
  transportation:  { light: "#3DA82B", dark: "#66D84E", geist: "#65A30D" },

  // Daily Life + Community — vivid amber-golds
  family:          { light: "#ED9A00", dark: "#FFB930", geist: "#D97706" },
  community:       { light: "#F8B81E", dark: "#FFD04D", geist: "#F59E0B" },
  religion:        { light: "#CE8400", dark: "#E5A52E", geist: "#B45309" },
  food_culture:    { light: "#C9A60E", dark: "#DCC44E", geist: "#CA8A04" },
  health:          { light: "#E08800", dark: "#FFA94D", geist: "#EAB308" },

  // Work + Institutions — vivid teals / blues
  education:       { light: "#1593A6", dark: "#3FC6D6", geist: "#0891B2" },
  employment:      { light: "#128AB0", dark: "#36B6DC", geist: "#0E7490" },
  business:        { light: "#1E78C8", dark: "#4DA3F0", geist: "#2563EB" },
  military:        { light: "#3A5FC0", dark: "#6E86E8", geist: "#4F46E5" },

  // Culture + Expression — vivid violets / magentas
  music:           { light: "#7B36C2", dark: "#A35BE6", geist: "#7E22CE" },
  arts:            { light: "#8B3FD4", dark: "#B16BEE", geist: "#9333EA" },
  sports:          { light: "#C13C8E", dark: "#E86CB6", geist: "#DB2777" },
};

/** Semantic family grouping, used by the Timeline's legend swatch row. */
export const THEME_FAMILIES = [
  {
    key: "justice",
    label: "Justice",
    anchor: "civil_rights" as ThemeKey,
    members: [
      "civil_rights",
      "segregation",
      "integration",
      "politics",
      "crime",
    ] as ThemeKey[],
  },
  {
    key: "place",
    label: "Place",
    anchor: "housing" as ThemeKey,
    members: ["housing", "urban_renewal", "migration", "transportation"] as ThemeKey[],
  },
  {
    key: "daily-life",
    label: "Daily Life",
    anchor: "community" as ThemeKey,
    members: ["family", "community", "religion", "food_culture", "health"] as ThemeKey[],
  },
  {
    key: "institutions",
    label: "Institutions",
    anchor: "education" as ThemeKey,
    members: ["education", "employment", "business", "military"] as ThemeKey[],
  },
  {
    key: "culture",
    label: "Culture",
    anchor: "music" as ThemeKey,
    members: ["music", "arts", "sports"] as ThemeKey[],
  },
] as const;

/** Type guard — validates that a raw theme string is one of the 21. */
export function isThemeKey(value: string | null | undefined): value is ThemeKey {
  return value != null && value in THEME_COLORS;
}

/** Turn a snake_case theme key into a kebab-case CSS slug.
 *  `food_culture` → `food-culture` */
export function themeSlug(key: ThemeKey): string {
  return key.replace(/_/g, "-");
}

/** CSS var reference for a theme key. Returns a fallback when the key
 *  isn't in the taxonomy — belt-and-braces for rows that slip through
 *  the ingest validator. Inline-safe; resolves at paint time based on
 *  the active `data-theme` attribute. */
export function themeColorVar(key: string | null | undefined): string {
  if (!isThemeKey(key)) return "var(--theme-color-default)";
  return `var(--theme-color-${themeSlug(key)})`;
}

/** Human-readable theme label — underscores → spaces, kept lowercase
 *  so it composes inside uppercase kickers / labels naturally. */
export function themeLabel(key: string): string {
  return key.replace(/_/g, " ");
}

/** Key discriminant for THEME_FAMILIES — the 5 top-level buckets the
 *  Timeline legend and family filter use. */
export type FamilyKey = (typeof THEME_FAMILIES)[number]["key"];

/** All family keys in legend order. Exported so callers iterate without
 *  having to re-derive from THEME_FAMILIES. */
export const FAMILY_KEYS = THEME_FAMILIES.map((f) => f.key) as readonly FamilyKey[];

/** Type guard — accepts a raw string and narrows to FamilyKey. */
export function isFamilyKey(value: string | null | undefined): value is FamilyKey {
  return value != null && FAMILY_KEYS.includes(value as FamilyKey);
}

/** CSS var reference for a family's color. Resolves to the dedicated
 *  `--family-color-<key>` token (a muted, harmonized 5-color palette
 *  decoupled from the louder 21-theme hues) so the moment dots, events
 *  band, and legend swatches read calm. Inline-safe; resolves at paint
 *  time against the active `data-theme`. */
export function familyColorVar(key: FamilyKey | null | undefined): string {
  if (!isFamilyKey(key)) return "var(--family-color-default)";
  return `var(--family-color-${key})`;
}

/** Theme → family reverse lookup built once at module load. Used by the
 *  family filter to decide whether a moment (which carries theme keys,
 *  not family keys) matches an active family selection. */
const THEME_TO_FAMILY: Record<ThemeKey, FamilyKey> = (() => {
  const map = {} as Record<ThemeKey, FamilyKey>;
  for (const family of THEME_FAMILIES) {
    for (const member of family.members) {
      map[member] = family.key;
    }
  }
  return map;
})();

/** Which of the 5 families a given theme key belongs to. Typed total —
 *  every theme is guaranteed to live in exactly one family (enforced by
 *  the `THEME_FAMILIES` definition above). */
export function themeKeyToFamily(theme: ThemeKey): FamilyKey {
  return THEME_TO_FAMILY[theme];
}

/** Historical event `category` → family mapping. Unmapped / "other"
 *  categories return null so callers can apply a neutral fallback color
 *  (events band) or pass-through behavior (filter). The category type
 *  itself lives in components/shared/category-colors.ts, but we key on
 *  raw strings here to accept the free-form category field from the
 *  pipeline payload without a hard import cycle. */
const CATEGORY_TO_FAMILY: Record<string, FamilyKey> = {
  racial_violence: "justice",
  civil_rights: "justice",
  political_event: "justice",
  migration_demographics: "place",
  urban_development: "place",
  natural_disaster: "place",
  public_health: "daily-life",
  education_milestones: "institutions",
  economic_shifts: "institutions",
  war_military: "institutions",
  cultural_milestones: "culture",
  sports_milestones: "culture",
};

export function familyForEventCategory(
  category: string | null | undefined,
): FamilyKey | null {
  if (!category) return null;
  return CATEGORY_TO_FAMILY[category] ?? null;
}

/** Build a CSS `background` value for a moment's dot. Every dot is a
 *  solid fill in its *family* color — the canvas collapses the 21 themes
 *  down to the 5 family hues so clusters read calm at a glance (2026-06-25
 *  refinement; replaced the earlier per-theme conic-gradient pies, which
 *  put up to 21 saturated hues on the same band). The moment's primary
 *  theme (themes[0]) decides the family; the detail folio still surfaces
 *  every individual theme as a chip. */
export function themeDotBackground(themes: string[]): string {
  const primary = themes.find((t): t is ThemeKey => isThemeKey(t));
  if (!primary) return familyColorVar(null);
  return familyColorVar(themeKeyToFamily(primary));
}
