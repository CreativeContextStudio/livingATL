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
    slug: "the-day-atlanta-burned",
    title: "The Day Atlanta Burned",
    dek: "May 21, 1917, from a schoolboy, a five-year-old, and the man driving the fire engine.",
    intro: null,
    selection:
      "Draft (2026-11-01): chosen by subject from all 583 chapters; checked for length, flagged passages and transcript loops. See refDocs/livingATL_Path_Proposals.md.",
    steps: [
      { catalogNumber: "MSS 637.012.001", momentIndex: 0, interstitial: null }, // E.B. Baynes — The morning of the Great Fire, May 21, 1917
      { catalogNumber: "MSS 637.097.001", momentIndex: 5, interstitial: null }, // Hugh McDonald — Wheat Street: a fire out of control
      { catalogNumber: "MSS 637.045.001", momentIndex: 0, interstitial: null }, // Marian Doom — The Great Fire of 1917, at age five
      { catalogNumber: "MSS 637.097.001", momentIndex: 6, interstitial: null }, // Hugh McDonald — Nearly caught by the fire on Boulevard
      { catalogNumber: "MSS 637.097.001", momentIndex: 9, interstitial: null }, // Hugh McDonald — From Wheat Street to the big houses on Boulevard
      { catalogNumber: "MSS 637.097.001", momentIndex: 11, interstitial: null }, // Hugh McDonald — Dynamite near Ponce de Leon to stop the fire
      { catalogNumber: "MSS 637.012.001", momentIndex: 9, interstitial: null }, // E.B. Baynes — A night at Brookwood, then home to ashes
    ],
  },
  {
    slug: "both-sides-of-the-picket-line",
    title: "Both Sides of the Picket Line",
    dek: "The 1934 textile strike, told by people who came down on different sides of it.",
    intro: null,
    selection:
      "Draft (2026-11-01): chosen by subject from all 583 chapters; checked for length, flagged passages and transcript loops. See refDocs/livingATL_Path_Proposals.md.",
    steps: [
      { catalogNumber: "MSS 637.058.003", momentIndex: 1, interstitial: null }, // Effie Gray — Effie doubts the organizers' promises
      { catalogNumber: "MSS 637.135.001", momentIndex: 4, interstitial: null }, // Nesbit Spinks — Why Spinks walked out: 'it just wasn't hard in me to be a scab'
      { catalogNumber: "MSS 637.058.001", momentIndex: 1, interstitial: null }, // Effie Gray — The 1934 strike: Effie stays at her post
      { catalogNumber: "MSS 637.135.001", momentIndex: 2, interstitial: null }, // Nesbit Spinks — Tear gas at the railroad gate
      { catalogNumber: "MSS 637.135.001", momentIndex: 9, interstitial: null }, // Nesbit Spinks — Talmadge's betrayal and the man in overalls
      { catalogNumber: "MSS 637.058.003", momentIndex: 7, interstitial: null }, // Effie Gray — FDR on the radio ends the strike
      { catalogNumber: "MSS 637.144.003", momentIndex: 1, interstitial: null }, // Nannie Washburn — Exposition Mill: 'worked to death'
    ],
  },
  {
    slug: "black-crackers-on-the-road",
    title: "Black Crackers on the Road",
    dek: "From kite-cord baseballs to a pennant season, with Satchel Paige and Josh Gibson along the way.",
    intro: null,
    selection:
      "Draft (2026-11-01): chosen by subject from all 583 chapters; checked for length, flagged passages and transcript loops. See refDocs/livingATL_Path_Proposals.md.",
    steps: [
      { catalogNumber: "MSS 637.076.001", momentIndex: 1, interstitial: null }, // Arthur Idlett — Baseballs made of kite cord
      { catalogNumber: "MSS 637.076.001", momentIndex: 4, interstitial: null }, // Arthur Idlett — The day the Crackers faced a young Satchel Paige
      { catalogNumber: "MSS 637.076.001", momentIndex: 6, interstitial: null }, // Arthur Idlett — Boarding at East Point to dodge the Atlanta conductor
      { catalogNumber: "MSS 637.076.002", momentIndex: 3, interstitial: null }, // Arthur Idlett — The white Crackers' hand-me-down uniforms
      { catalogNumber: "MSS 637.002.002", momentIndex: 10, interstitial: null }, // Alice Adams — Alice goes to the ballgame
      { catalogNumber: "MSS 637.105.001", momentIndex: 3, interstitial: null }, // Red Moore — 1938: the Crackers' pennant season
      { catalogNumber: "MSS 637.105.001", momentIndex: 5, interstitial: null }, // Red Moore — 'Learn Spanish': Earl Mann's offer
      { catalogNumber: "MSS 637.105.001", momentIndex: 7, interstitial: null }, // Red Moore — Watching Josh Gibson really hit one
    ],
  },
  {
    slug: "whiskey-dice-and-the-tamale-man",
    title: "Whiskey, Dice, and the Tamale Man",
    dek: "Prohibition Atlanta, where everybody knew a guy.",
    intro: null,
    selection:
      "Draft (2026-11-01): chosen by subject from all 583 chapters; checked for length, flagged passages and transcript loops. See refDocs/livingATL_Path_Proposals.md.",
    steps: [
      { catalogNumber: "MSS 637.006.002", momentIndex: 6, interstitial: null }, // Annie Alexander — 'I've heard of people they say was a bootlegger'
      { catalogNumber: "MSS 637.012.001", momentIndex: 13, interstitial: null }, // E.B. Baynes — Bootleg whiskey and Red Skelton
      { catalogNumber: "MSS 637.058.001", momentIndex: 7, interstitial: null }, // Effie Gray — Bootleggers, dice, and the homebrew that exploded
      { catalogNumber: "MSS 637.076.001", momentIndex: 10, interstitial: null }, // Arthur Idlett — Bootleggers bankroll the team
      { catalogNumber: "MSS 637.012.001", momentIndex: 14, interstitial: null }, // E.B. Baynes — The tamale man's marijuana cigarettes
      { catalogNumber: "MSS 637.047.001", momentIndex: 13, interstitial: null }, // Roy Dunn — Numbers running, and his grandmother's magnifying glass
    ],
  },
  {
    slug: "two-atlantas-one-radio-dial",
    title: "Two Atlantas, One Radio Dial",
    dek: "Blues on Auburn Avenue, country on WSB: one city, split by a color line.",
    intro: null,
    selection:
      "Draft (2026-11-01): chosen by subject from all 583 chapters; checked for length, flagged passages and transcript loops. See refDocs/livingATL_Path_Proposals.md.",
    steps: [
      { catalogNumber: "MSS 637.117.001", momentIndex: 6, interstitial: null }, // Blanche Puckett — Riley's natural gift and the crystal radio
      { catalogNumber: "MSS 637.047.001", momentIndex: 4, interstitial: null }, // Roy Dunn — The Top Hat, the Silver Streak, and the Royal Peacock
      { catalogNumber: "MSS 637.117.001", momentIndex: 4, interstitial: null }, // Blanche Puckett — Square dances in the Ford showrooms
      { catalogNumber: "MSS 637.117.002", momentIndex: 2, interstitial: null }, // Blanche Puckett — How the 'Corn Liquor Still in Georgia' skits were written
      { catalogNumber: "MSS 637.047.001", momentIndex: 5, interstitial: null }, // Roy Dunn — Blues versus frailing
      { catalogNumber: "MSS 637.117.002", momentIndex: 5, interstitial: null }, // Blanche Puckett — Country music's color line in Atlanta
      { catalogNumber: "MSS 637.047.001", momentIndex: 6, interstitial: null }, // Roy Dunn — What the blues does to a room
      { catalogNumber: "MSS 637.047.002", momentIndex: 13, interstitial: null }, // Roy Dunn — What the blues did for us
    ],
  },
  {
    slug: "talking-back",
    title: "Talking Back",
    dek: "Alice Adams and Dorothy Bolden on the rules of working in white kitchens, and how they broke them.",
    intro: null,
    selection:
      "Draft (2026-11-01): chosen by subject from all 583 chapters; checked for length, flagged passages and transcript loops. See refDocs/livingATL_Path_Proposals.md.",
    steps: [
      { catalogNumber: "MSS 637.002.001", momentIndex: 2, interstitial: null }, // Alice Adams — Seven to seven for $4 a week
      { catalogNumber: "MSS 637.002.001", momentIndex: 6, interstitial: null }, // Alice Adams — The Monday-morning rebellion: 'I hired to you, not your husband'
      { catalogNumber: "MSS 637.002.002", momentIndex: 14, interstitial: null }, // Alice Adams — She called them Charles and James, never 'Mister'
      { catalogNumber: "MSS 637.020.002", momentIndex: 9, interstitial: null }, // Dorothy Bolden — 'Part of the family' until company comes
      { catalogNumber: "MSS 637.002.001", momentIndex: 3, interstitial: null }, // Alice Adams — Joining Dorothy Bolden's domestic workers union
    ],
  },
  {
    slug: "home-courtesy-of-the-new-deal",
    title: "Home, Courtesy of the New Deal",
    dek: "America's first public housing, from the neighborhoods it cleared to the people who lived there.",
    intro: null,
    selection:
      "Draft (2026-11-01): chosen by subject from all 583 chapters; checked for length, flagged passages and transcript loops. See refDocs/livingATL_Path_Proposals.md.",
    steps: [
      { catalogNumber: "MSS 637.068.001", momentIndex: 0, interstitial: null }, // Walter Payne — The Titanic, and the neighborhood before Techwood
      { catalogNumber: "MSS 637.102.001", momentIndex: 11, interstitial: null }, // L.D. Milton — Beaver Slide: who lived there, who moved in
      { catalogNumber: "MSS 637.057.001", momentIndex: 2, interstitial: null }, // Clara Gipson — 'They selected families': how you got in
      { catalogNumber: "MSS 637.068.001", momentIndex: 5, interstitial: null }, // Walter Payne — FDR flips the switch at Grant Field
      { catalogNumber: "MSS 637.067.001", momentIndex: 3, interstitial: null }, // Voncele Heggood — Dances twice a week at Clark Howell
      { catalogNumber: "MSS 637.119.001", momentIndex: 1, interstitial: null }, // Willie Rakestraw — $14 rent and a fenced backyard
      { catalogNumber: "MSS 637.057.001", momentIndex: 7, interstitial: null }, // Clara Gipson — 'Now you're scared to go out'
    ],
  },
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
