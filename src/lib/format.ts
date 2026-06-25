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
  const y = d.getFullYear();
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

/**
 * First line of a prose AI summary, for the card preview.
 * Splits on sentence boundaries; falls back to the first 180 chars.
 */
export function firstSentence(prose: string | null | undefined, maxLen = 220): string {
  if (!prose) return "";
  const trimmed = prose.trim();
  const m = trimmed.match(/^([^.!?]+[.!?])\s+/);
  const first = m ? m[1] : trimmed.slice(0, maxLen);
  return first.length > maxLen ? first.slice(0, maxLen - 1).trimEnd() + "…" : first;
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
export function titleForCard(title: string | null | undefined): string {
  if (!title) return "Untitled recording";
  return title
    .replace(/^Oral history interview (?:with |of )/i, "")
    .replace(/^Oral history (?:with |of )/i, "")
    .trim();
}
