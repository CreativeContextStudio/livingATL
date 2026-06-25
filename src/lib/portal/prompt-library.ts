/**
 * Portal empty-state prompt library.
 *
 * Grounded in the corpus's canonical narrators, neighborhoods, events, and
 * institutions (see `livingatl-pipeline/scripts/config.py` for the canonical
 * vocabulary and `evals/ai-portal/evals.jsonl` for the eval-confirmed
 * material). Every prompt names something real that lives in the archive:
 * a named narrator, a named neighborhood, a named event, or a named
 * institution.
 *
 * Scope: the corpus covers 1914–1977. Prompts about post-1977 Atlanta
 * (1996 Olympics, BeltLine, MARTA beyond early desegregation, etc.) do not
 * belong here. Famous Atlantans who are referenced but not interviewed —
 * MLK Sr., MLK Jr., Maynard Jackson — get absence-shaped prompts only
 * sparingly, because the Portal's absence discipline is already strong and
 * more useful user-facing prompts ask about who DID sit for the mic.
 *
 * Size: ~30 prompts per group, drawn from the 15-eval canon (known-answered
 * topics) and expanded via config.py's theme/neighborhood/event taxonomies.
 *
 * Voice: conversational but grounded. Specific over generic — "what did
 * narrators remember about Auburn Avenue nightlife in the 1940s" beats
 * "tell me about Auburn Avenue". Under ~95 characters per prompt so the
 * existing chip-style card keeps a clean two-line max.
 */

export type GroupKey = "era" | "neighborhood" | "person";

export type PromptGroupAccent = {
  /** Accent stripe in the EmptyState group card (the `h-px w-6` rule). */
  stripe: string;
  /** Hover border color on individual prompt buttons. */
  hoverBorder: string;
  /** Left-border color on conversation <li>s whose turn originated from
   *  this group. Caller combines this with `border-l-2`. */
  leftBorder: string;
};

export type PromptGroup = {
  key: GroupKey;
  label: string;
  accent: PromptGroupAccent;
  prompts: ReadonlyArray<string>;
};

export const PROMPT_LIBRARY: ReadonlyArray<PromptGroup> = [
  {
    key: "era",
    accent: {
      stripe: "bg-amber-500/70",
      hoverBorder: "hover:border-amber-500/50",
      leftBorder: "border-l-amber-500/70",
    },
    label: "By era",
    prompts: [
      "What did Atlanta feel like in the 1940s?",
      "How did life change for Black Atlantans from the 1920s to the 1970s?",
      "What do narrators remember about the 1906 Atlanta Race Massacre?",
      "What did interviewees witness during the 1917 Great Fire?",
      "How did the Great Depression reshape daily life in Atlanta?",
      "What was the 1934 Textile Workers' Strike like for mill families?",
      "How did World War I change Atlanta's Black business district?",
      "What did narrators remember about WWII on the home front?",
      "What was the Jim Crow streetcar like before desegregation?",
      "How did narrators describe the arrival of electricity in their homes?",
      "What do interviews say about the 1946 Columbia, Tennessee race riot's aftermath in Atlanta?",
      "How did narrators describe the first Black voter registration drives?",
      "What did Atlanta look like during Prohibition and early bootlegging?",
      "How did wages and working hours change between the 1920s and 1960s?",
      "What do narrators say about the 1930s fight to unionize cotton mills?",
      "How did segregation in public accommodations end, according to narrators?",
      "What was it like to grow up poor in 1920s Atlanta?",
      "How did radio change entertainment for Atlanta families in the 1930s?",
      "What did narrators remember about the Angelo Herndon trial?",
      "How did housing change after University Homes opened in 1937?",
      "What do interviews say about returning Black veterans after WWII?",
      "How did Atlanta's streetcars and buses desegregate in the 1950s?",
      "What was the 1960s school integration fight like from the inside?",
      "How did the New Deal reach working-class Atlantans?",
      "What do narrators say about voting rights victories in the 1940s?",
      "What did Black Atlantans do for fun in the pre-WWII years?",
      "How did medicine and home remedies work before hospitals were open to all?",
      "How did the cotton economy shape early 20th-century Atlanta life?",
    ],
  },
  {
    key: "neighborhood",
    accent: {
      stripe: "bg-emerald-500/70",
      hoverBorder: "hover:border-emerald-500/50",
      leftBorder: "border-l-emerald-500/70",
    },
    label: "By neighborhood",
    prompts: [
      "Tell me about the music scene on Auburn Avenue.",
      "What was Summerhill like before the stadium?",
      "What do narrators remember about Sweet Auburn in its heyday?",
      "How did Cabbagetown's mill workers live in the 1930s?",
      "What was it like to move into University Homes in 1937?",
      "How did narrators describe the Pittsburgh neighborhood in the 1920s?",
      "What businesses lined Auburn Avenue before urban renewal?",
      "What do interviews say about Beaver Slide before it was cleared?",
      "How did Vine City change between the 1930s and the 1970s?",
      "What was the Old Fourth Ward like when narrators were growing up?",
      "How did narrators describe West End before integration?",
      "What do interviews say about the Georgian Terrace Hotel from staff who worked there?",
      "What was Buckhead like from the perspective of Black workers in white homes?",
      "How did Mechanicsville families experience the Depression?",
      "What do narrators remember about Courtland Street boarding houses?",
      "How did narrators describe Atlanta University Center in the 1930s and 40s?",
      "What do interviews say about Wheat Street Baptist Church's role on Auburn Avenue?",
      "What was the Decatur area like for rural-to-urban migrants?",
      "How did the Exposition Cotton Mills shape life in its surrounding neighborhood?",
      "What do narrators say about East Point before annexation?",
      "How did narrators describe Boulevard and Memorial Drive in the 1920s?",
      "What was the Royal Peacock and Auburn Avenue nightlife like?",
      "How did Collier Heights grow into a Black middle-class enclave?",
      "What do interviews say about the block around Fulton Bag & Cotton Mill?",
      "How did narrators describe Hunter Street before it was renamed?",
      "What do interviews say about segregated Grant Park and Piedmont Park?",
      "How did the Ashby Street corridor change across the decades?",
      "What do narrators remember about the Black side of Marietta Street?",
    ],
  },
  {
    key: "person",
    accent: {
      stripe: "bg-primary/70",
      hoverBorder: "hover:border-primary/50",
      leftBorder: "border-l-primary/70",
    },
    label: "By person or movement",
    prompts: [
      "What did interviewees remember about the 1906 Race Massacre?",
      "What jobs were available to Black women in Atlanta in the 1950s?",
      "Who was Dorothy Bolden and how did she start the Domestic Workers Union?",
      "How does Alice Adams describe organizing with the NDWUA?",
      "What did Ruby Owens witness over her 102 years in Atlanta?",
      "How did L.D. Milton build Citizens Trust Bank on Auburn Avenue?",
      "What was William Holmes Borders's role in Atlanta's civil rights fight?",
      "How did Clarence Bacote teach Black Atlantans about voting?",
      "Which narrators describe personal encounters with the Ku Klux Klan?",
      "What did Arthur Idlett remember about playing for the Atlanta Black Crackers?",
      "How did Nannie Washburn come to join the Communist Party?",
      "What does Marian Doom say about Atlanta's washerwomen and domestic workers?",
      "How did narrators describe the Angelo Herndon trial and its meaning?",
      "Who organized the first Black voter registration drives in Atlanta?",
      "What did narrators say about John Hope and Morehouse College?",
      "How did the NAACP show up in narrators' lives?",
      "What role did Wheat Street Baptist Church play in Atlanta organizing?",
      "How did the SCLC figure into narrators' memories of the movement?",
      "Who were the washerwomen organizers narrators remember by name?",
      "What did narrators say about Eugene Talmadge and Georgia politics?",
      "How does James 'Red' Moore describe Atlanta baseball's Black leagues?",
      "What do narrators remember about E. Bernard West, who conducted many interviews?",
      "Who fought for school integration from inside Atlanta schools?",
      "What do narrators say about Booker T. Washington High School?",
      "How did Heman Perry build Atlanta's early Black insurance industry?",
      "Which narrators describe the Atlanta Civic and Political League's work?",
      "How did narrators describe Clayton Yates and the Yates and Milton Drugstore?",
      "What did women narrators say about organizing domestic labor?",
      "How did narrators describe the All-Citizens Registration Committee?",
    ],
  },
] as const;

/**
 * Deterministic "default slice" returned by SSR and the first render. Picks
 * the first N prompts from each group so initial HTML is stable and
 * hydration doesn't warn about a mismatch. The client-side effect in
 * `portal-client.tsx` replaces this with a real random sample on mount.
 */
export function defaultSlice(n: number): ReadonlyArray<PromptGroup> {
  return PROMPT_LIBRARY.map((g) => ({
    key: g.key,
    label: g.label,
    accent: g.accent,
    prompts: g.prompts.slice(0, n),
  }));
}

/**
 * Fisher-Yates sample — pick `n` distinct elements from `pool` without
 * mutating the source. Used client-side after mount to randomize the
 * visible prompts each session.
 */
export function sample<T>(pool: ReadonlyArray<T>, n: number): T[] {
  const count = Math.min(n, pool.length);
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/**
 * Convenience: sample `n` prompts from each group and return a
 * `PromptGroup[]` with the same label structure the EmptyState renders.
 */
export function samplePerGroup(n: number): PromptGroup[] {
  return PROMPT_LIBRARY.map((g) => ({
    key: g.key,
    label: g.label,
    accent: g.accent,
    prompts: sample(g.prompts, n),
  }));
}

/** Group-key → accent lookup, built once from PROMPT_LIBRARY. */
export const ACCENT_BY_KEY: Record<GroupKey, PromptGroupAccent> =
  PROMPT_LIBRARY.reduce(
    (acc, g) => {
      acc[g.key] = g.accent;
      return acc;
    },
    {} as Record<GroupKey, PromptGroupAccent>,
  );
