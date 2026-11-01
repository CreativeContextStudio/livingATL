/**
 * What may leave the site as text: share-card images and printed story cards
 * travel without the Player's pre-playback note, so a passage flagged in
 * `sensitivity_review.flagged_spans` is never quoted on them. They fall back
 * to the authored `card_line` and a "Content note" label instead. The audio
 * and the on-site transcript stay exactly as spoken.
 *
 * Flagged spans are authored by hand and can miss a passage, so the n-word is
 * also checked in the text itself as a backstop.
 */
import { clipQuote, type ClipRange } from "@/lib/clips";
import { contentNotesFor } from "@/lib/player";

const SLUR = /\bnigg(?:er|a|ah|uh)s?\b/i;

type Span = { start: number; end: number; category: string; severity?: string | null };
type Segment = { start: number; end: number; text: string };
type Quote = { text: string; start_time: number; end_time?: number };

export function hasSlur(text: string): boolean {
  return SLUR.test(text);
}

/** Can this passage be quoted away from the Player? */
export function canQuoteOffSite(
  text: string,
  spans: ReadonlyArray<Span>,
  start: number,
  end: number,
): boolean {
  return !hasSlur(text) && contentNotesFor(spans, start, end).length === 0;
}

/** Key quotes carry a start and sometimes an end; assume a sentence or two. */
const QUOTE_FALLBACK_SECONDS = 30;

export type ShareCardText = {
  /** The speaker's words, or null when the card shows `line` instead. */
  quote: string | null;
  line: string;
  /** This link points at a flagged passage: label the card. */
  contentNote: boolean;
};

const MAX_QUOTE_CHARS = 200;

/**
 * Text for a share card. A clip quotes its own words; a plain recording link
 * quotes its first key quote that's safe to take off-site.
 */
export function shareCardText({
  clip,
  segments,
  keyQuotes,
  cardLine,
  flaggedSpans,
}: {
  clip: ClipRange | null;
  segments: Segment[];
  keyQuotes: Quote[];
  cardLine: string;
  flaggedSpans: ReadonlyArray<Span>;
}): ShareCardText {
  if (clip) {
    const quote = clipQuote(segments, clip, MAX_QUOTE_CHARS);
    return canQuoteOffSite(quote, flaggedSpans, clip.start, clip.end)
      ? { quote, line: cardLine, contentNote: false }
      : { quote: null, line: cardLine, contentNote: true };
  }
  const safe = keyQuotes.find((q) =>
    canQuoteOffSite(q.text, flaggedSpans, q.start_time, q.end_time ?? q.start_time + QUOTE_FALLBACK_SECONDS),
  );
  return { quote: safe ? safe.text.slice(0, MAX_QUOTE_CHARS) : null, line: cardLine, contentNote: false };
}
