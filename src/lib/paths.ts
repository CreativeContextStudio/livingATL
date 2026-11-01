/**
 * Curated listening paths (F-paths) — short sequences of brief moments with
 * editorial interstitials, e.g. "Sweet Auburn, 1920s". Steps bind to
 * `catalogNumber` + `momentIndex` (0-based position in
 * `metadata_extracted.brief.moments[]`, stable across re-transcription);
 * the page resolves them against Timeline data, so a step whose moment no
 * longer exists is dropped rather than breaking the page.
 *
 * EDITORIAL SLOTS: `intro` and each step's `interstitial` are steward copy.
 * `null` renders a clearly marked "forthcoming" placeholder. The moment
 * selections below are DRAFTS chosen from the authored briefs by the rule in
 * each path's `selection` note — review and replace freely.
 */
export type PathStep = {
  catalogNumber: string;
  momentIndex: number;
  /** Steward copy shown before this moment; null = placeholder. */
  interstitial: string | null;
};

export type ListeningPath = {
  slug: string;
  title: string;
  /** One line under the title (descriptive, not editorial voice). */
  dek: string;
  /** Steward introduction; null = placeholder. */
  intro: string | null;
  /** How the draft steps were chosen — shown to stewards, not listeners. */
  selection: string;
  steps: PathStep[];
};

export const LISTENING_PATHS: ListeningPath[] = [
  {
    slug: "sweet-auburn-1920s",
    title: "Sweet Auburn, 1920s",
    dek: "Five chapters from the decade Auburn Avenue became the center of Black Atlanta.",
    intro: null,
    selection:
      "Draft: highlighted moments tagged Sweet Auburn / Auburn Avenue whose era overlaps 1920–1929, chronological, shortest-first among same-narrator options.",
    steps: [
      { catalogNumber: "MSS 637.082.001", momentIndex: 2, interstitial: null }, // L.D. & Laura Keith — NAACP meeting and a streetcar assault (1917–1920)
      { catalogNumber: "MSS 637.075.001", momentIndex: 8, interstitial: null }, // Arthur Idlett — Marcus Garvey in Atlanta (1919–1927)
      { catalogNumber: "MSS 637.103.001", momentIndex: 6, interstitial: null }, // L.D. Milton — Yates and Milton Pharmacy at Auburn and Butler (1923–1926)
      { catalogNumber: "MSS 637.103.002", momentIndex: 0, interstitial: null }, // L.D. Milton — Atlanta Daily World origin (1923–1945)
      { catalogNumber: "MSS 637.075.002", momentIndex: 6, interstitial: null }, // Arthur Idlett — KKK parades on Auburn Avenue (1920–1937)
    ],
  },
  {
    slug: "integration-five-voices",
    title: "Integration, in five voices",
    dek: "Five storytellers on how Atlanta's color line held, and how it moved.",
    intro: null,
    selection:
      "Draft: one highlighted moment per narrator, ordered by era start. Alice Adams (a domestic worker on the streetcar) replaced L.D. Milton 2026-11-01 so the path isn't mostly civic leaders: three men, two women.",
    steps: [
      { catalogNumber: "MSS 637.002.001", momentIndex: 9, interstitial: null }, // Alice Adams — Jim Crow on the streetcar (1932–1962)
      { catalogNumber: "MSS 637.104.001", momentIndex: 10, interstitial: null }, // James Moore — 1939 convention, first integrated dining
      { catalogNumber: "MSS 637.021.001", momentIndex: 8, interstitial: null }, // William Holmes Borders — voter registration, first Black police (1946–1953)
      { catalogNumber: "MSS 637.007.002", momentIndex: 5, interstitial: null }, // Clarence Bacote — coalition politics, Ivan Allen (1950–1970)
      { catalogNumber: "MSS 637.006.001", momentIndex: 10, interstitial: null }, // Annie Alexander — civil rights and Martin Luther King (1956–1978)
    ],
  },
];

export function findPath(slug: string): ListeningPath | null {
  return LISTENING_PATHS.find((p) => p.slug === slug) ?? null;
}

/** Key a moment the same way everywhere (path steps, queue ids). */
export function momentKey(catalogNumber: string, momentIndex: number): string {
  return `${catalogNumber}#${momentIndex}`;
}
