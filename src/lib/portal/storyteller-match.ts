/**
 * Find the storytellers a portal question names (2026-11-14).
 *
 * Chunks carry speaker roles, not names, so "What does Hugh McDonald say
 * about…" didn't steer retrieval to his recordings and Ask missed his own
 * account. The chat route uses this to add the named storyteller's best
 * chunks to the retrieved set.
 *
 * Names come from `speakers.name` in catalog form: "McDonald, Hugh A.",
 * "Moore, Red (James R.)", "Keith, L. D. (Lincoln Dewey), 1899-1989; Keith,
 * Laura Jones". A question matches a person by surname alone, by a given
 * name or initials before the surname ("Hugh McDonald", "L.D. Milton"), or by
 * an honorific ("Mrs. Doom"). Surnames that are everyday words need one of
 * the longer forms.
 */

export type StorytellerRecordings = { name: string; recordingIds: string[] };

type Person = { last: string; given: string[]; initials: string };

/** Surnames that are also common words: never matched alone. */
const COMMON_WORD_SURNAMES = new Set(["gray", "grey", "borders", "doom", "dunn"]);

const HONORIFICS = ["mr", "mrs", "ms", "miss", "dr", "rev", "reverend", "professor", "prof"];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One catalog name can hold several people, separated by ";". */
export function parseCatalogName(name: string): Person[] {
  return name
    .split(";")
    .map((part) => {
      const [lastRaw, ...rest] = part.split(",");
      const last = normalize(lastRaw ?? "");
      // Drop life dates and suffixes ("1899-1989", "Jr.").
      const givenRaw = rest
        .filter((p) => !/^\s*(\d|jr\b|sr\b|ii\b|iii\b)/i.test(p))
        .join(" ");
      const outside = givenRaw.replace(/\([^)]*\)/g, " ");
      const tokens = normalize(givenRaw).split(" ").filter(Boolean);
      const given = tokens.filter((t) => t.length >= 2);
      const initials = normalize(outside)
        .split(" ")
        .filter(Boolean)
        .map((t) => t[0])
        .join("");
      return { last, given, initials };
    })
    .filter((p) => p.last.length >= 2);
}

function personPatterns(p: Person): RegExp[] {
  const last = escape(p.last);
  const patterns: RegExp[] = [];
  if (!COMMON_WORD_SURNAMES.has(p.last)) {
    patterns.push(new RegExp(`\\b${last}\\b`));
  }
  for (const g of p.given) {
    // A given name, then up to two more words (a middle name or initial), then the surname.
    patterns.push(new RegExp(`\\b${escape(g)} (?:\\w+ ){0,2}${last}\\b`));
  }
  if (p.initials.length >= 2) {
    const spaced = p.initials.split("").join(" ");
    patterns.push(new RegExp(`\\b(?:${spaced}|${p.initials}) ${last}\\b`));
  }
  patterns.push(new RegExp(`\\b(?:${HONORIFICS.join("|")}) ${last}\\b`));
  return patterns;
}

/**
 * Storytellers whose name the question contains, each with their recordings.
 * Order follows the input list.
 */
export function matchStorytellers(
  question: string,
  storytellers: StorytellerRecordings[],
): StorytellerRecordings[] {
  const q = normalize(question);
  if (!q) return [];
  return storytellers.filter((s) =>
    parseCatalogName(s.name).some((p) => personPatterns(p).some((re) => re.test(q))),
  );
}
