/**
 * Formatting helpers for the Collection Browser (§7.1) and downstream surfaces.
 * Keep these pure so both RSCs and client components can import them.
 */

/** "1h 08m" / "23m" / "45s" */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** 1906 → "1900s". 1917 → "1910s". */
export function yearToDecade(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

/** Format a recording_date iso string + precision into display text. */
export function formatRecordingDate(
  dateIso: string | null | undefined,
  precision: "year" | "month" | "exact" | "estimated" | null | undefined,
): string {
  if (!dateIso) return "Date unknown";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "Date unknown";
  // UTC throughout: dates are stored as midnight UTC, so a local read turns
  // 1977-01-01 into 1976 in every US browser.
  const y = d.getUTCFullYear();
  if (precision === "year" || precision === "estimated") {
    return precision === "estimated" ? `c. ${y}` : `${y}`;
  }
  const month = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  if (precision === "month") return `${month} ${y}`;
  return `${month} ${d.getUTCDate()}, ${y}`;
}

/** Return the set of decades a recording's moments span, as "1900s", "1910s", ... */
export function decadesFromMoments(
  moments: ReadonlyArray<{
    era_start_year?: number | null;
    era_end_year?: number | null;
  }> | null | undefined,
): string[] {
  if (!moments || moments.length === 0) return [];
  const decades = new Set<string>();
  for (const m of moments) {
    const start = m.era_start_year;
    const end = m.era_end_year ?? start;
    if (start == null || end == null) continue;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    for (let y = Math.floor(lo / 10) * 10; y <= hi; y += 10) {
      decades.add(`${y}s`);
    }
  }
  return [...decades].sort();
}

/** Return the earliest and latest era years across moments — for card display. */
export function eraRangeFromMoments(
  moments: ReadonlyArray<{
    era_start_year?: number | null;
    era_end_year?: number | null;
  }> | null | undefined,
): string | null {
  if (!moments || moments.length === 0) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const m of moments) {
    if (typeof m.era_start_year === "number") lo = Math.min(lo, m.era_start_year);
    if (typeof m.era_end_year === "number") hi = Math.max(hi, m.era_end_year);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
}

// A period after one of these doesn't end a sentence: initials ("E. Bernard
// West", "L.D. Milton") and the abbreviations the briefs use.
const ABBREVIATION_RE =
  /(?:^|[\s(.'"])(?:[A-Z]|c|ca|b|d|Dr|Mr|Mrs|Ms|Jr|Sr|St|Rev|Gov|Gen|Col|Capt|Lt|Sgt|Ga|Ala|Mt|No|vs|approx|e\.g|i\.e)\.$/;

/** Split prose into sentences without breaking at initials or abbreviations. */
export function splitSentences(prose: string): string[] {
  const text = prose.replace(/\s+/g, " ").trim();
  const out: string[] = [];
  let start = 0;
  for (const m of text.matchAll(/[.!?]['"’”)]?(?= +['"‘“(]?[A-Z0-9])/g)) {
    const end = m.index + m[0].length;
    const sentence = text.slice(start, end);
    if (m[0][0] === "." && ABBREVIATION_RE.test(text.slice(start, m.index + 1))) continue;
    out.push(sentence.trim());
    start = end;
  }
  if (start < text.length) out.push(text.slice(start).trim());
  return out.filter(Boolean);
}

// Opening sentences that only restate catalog facts the card already shows
// (clip number, length, interview date): "Clip 1 of 3.", "About 34
// minutes.", "A 63-minute oral history recorded October 9, 1978.", "The
// December 7, 1978 E. Bernard West interview with …".
const BOOKKEEPING_RE =
  /^(?:Clip \d+ of \d+\b|(?:About |Approximately |Roughly )?\d+ minutes\.|A \d+-minute oral history\b|The (?:[A-Z][a-z]+ (?:\d{1,2}, )?)?\d{4} .{0,80}?\binterview with\b)/;

/**
 * One-line summary for a recording card: the first sentence that says what
 * the recording is about, cut at a word boundary to `maxLen`.
 */
export function cardSummary(prose: string | null | undefined, maxLen = 220): string {
  if (!prose) return "";
  const sentences = splitSentences(prose);
  if (sentences.length === 0) return "";
  let line = sentences.find((s) => !BOOKKEEPING_RE.test(s)) ?? sentences[0];
  // "Covers: the 1934 strike; …" reads as a list once the lead-ins are gone.
  line = line.replace(/^Covers:?\s+(\S)/, (_, c: string) => c.toUpperCase());
  if (line.length <= maxLen) return line;
  const cut = line.slice(0, maxLen - 1);
  const atWord = cut.slice(0, Math.max(cut.lastIndexOf(" "), maxLen * 0.6));
  return atWord.replace(/[\s,;:—–-]+$/, "") + "…";
}

/** Matches `1952-2015`, `1948-`, `1948`, or `-2015` — the year-range
 *  shapes that catalog creator strings pack next to a name. */
const YEAR_TOKEN_RE = /^-?\d{0,4}(?:\s*-\s*\d{0,4})?$/;

function isYearToken(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  if (!/\d/.test(trimmed)) return false;
  return YEAR_TOKEN_RE.test(trimmed);
}

/**
 * Render a stored "Last, First [Middle][, YYYY-YYYY][, Last2, First2, …]"
 * catalog creator value as a single "First Last" name.
 *
 * Drops embedded year tokens (interviewer sidebar, transcript labels, and
 * related surfaces don't want dates mixed into names) and drops everything
 * past the first creator so multi-interviewer fields like
 * `"Kuhn, Clifford M., 1952-2015, West, E. Bernard"` render as just
 * `"Clifford M. Kuhn"`. Single-name or no-comma inputs pass through
 * unchanged.
 */
export function formatSpeakerName(stored: string | null | undefined): string {
  if (!stored) return "";
  const tokens = stored
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !isYearToken(p));
  if (tokens.length === 0) return stored.trim();
  if (tokens.length === 1) return tokens[0];
  const [last, first] = tokens;
  return `${first} ${last}`;
}

/**
 * Strip the AHC street address from a publisher string. Source catalog entries
 * bake "…, 130 West Paces Ferry Rd., Atlanta, Georgia 30305" onto the publisher
 * name; the address adds nothing the researcher needs in-app.
 */
export function formatPublisher(stored: string | null | undefined): string {
  if (!stored) return "";
  const cleaned = stored
    .replace(/,?\s*130 West Paces Ferry Rd\.?,?\s*Atlanta,?\s*Georgia\s*30305\.?\s*$/i, "")
    .trim()
    .replace(/[,;]\s*$/, "");
  // Living Atlanta recordings are a WRFG / AHC co-publication; the catalog
  // only credits AHC. Surface both and break the AHC line onto its own row
  // for readability.
  const wrfgPrefixed = /^wrfg\b/i.test(cleaned)
    ? cleaned
    : `WRFG + ${cleaned}`;
  return wrfgPrefixed.replace(/,\s*Atlanta History Center/i, "\nAtlanta History Center");
}

/**
 * Reduce a catalog title like "Oral history interview of Ruby Owens, clip 1 of 1"
 * to a Browser-card-appropriate form: strip the boilerplate prefix and return
 * the remainder. Returns the original if nothing matches.
 */
/**
 * Short label + link for a catalog rights statement ("… licensed under a
 * Creative Commons, Attribution-NonCommercial-NoDerivs CC BY-NC-ND license,
 * http://creativecommons.org/licenses/by-nc-nd/4.0/."). Null when the
 * statement names no Creative Commons license.
 */
export function licenseLink(rights: string | null | undefined): { label: string; href: string } | null {
  const match = rights?.match(/https?:\/\/creativecommons\.org\/licenses\/([a-z-]+)\/([\d.]+)\/?/i);
  if (!match) return null;
  const [, terms, version] = match;
  return {
    label: `CC ${terms.toUpperCase()} ${version}`,
    href: `https://creativecommons.org/licenses/${terms.toLowerCase()}/${version}/`,
  };
}

export function titleForCard(title: string | null | undefined): string {
  if (!title) return "Untitled recording";
  return title
    .replace(/^Oral history interview (?:with |of )/i, "")
    .replace(/^Oral history (?:with |of )/i, "")
    .trim();
}
