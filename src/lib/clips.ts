/**
 * Shareable clips — `/player/<catalog>?t=12:04&end=13:34`. Pure helpers shared
 * by the Player (playback window, share links) and the share-card image.
 */
import { cleanSegmentText, formatTimestamp, parseShareTime } from "@/lib/player";

/** Longest clip a link may describe; longer ranges are clamped. */
export const MAX_CLIP_SECONDS = 600;
/** Length of the one-click "share a clip from here" option. */
export const QUICK_CLIP_SECONDS = 90;

export type ClipRange = { start: number; end: number };

/** Parse `t` / `end` URL params into a valid clip, or null. */
export function parseClipRange(
  t: string | null | undefined,
  end: string | null | undefined,
): ClipRange | null {
  const start = parseShareTime(t);
  const stop = parseShareTime(end);
  if (start === null || stop === null || stop <= start) return null;
  return { start, end: Math.min(stop, start + MAX_CLIP_SECONDS) };
}

/**
 * Did this page view arrive from a shared link? The clip must be in the URL
 * the document loaded with (not reached by moving around the site), and the
 * visitor must have come from outside it.
 */
export function isSharedClipArrival({
  loadedUrl,
  currentUrl,
  referrer,
}: {
  loadedUrl: string | undefined;
  currentUrl: string;
  referrer: string;
}): boolean {
  if (loadedUrl !== currentUrl) return false;
  return !referrer || new URL(referrer).host !== new URL(currentUrl).host;
}

type TimedSegment = { start: number; end: number; text: string };

/** Clip covering whole segments `first..last` (indices, any order). */
export function clipForSegments(
  segments: TimedSegment[],
  first: number,
  last: number,
): ClipRange | null {
  const [a, b] = first <= last ? [first, last] : [last, first];
  const from = segments[a];
  const to = segments[b];
  if (!from || !to) return null;
  const start = Math.floor(from.start);
  return { start, end: Math.min(Math.ceil(to.end), start + MAX_CLIP_SECONDS) };
}

/** Same page URL with the clip's `t` / `end` set (other params kept). */
export function clipHref(href: string, clip: ClipRange): string {
  const url = new URL(href);
  url.searchParams.set("t", formatTimestamp(clip.start));
  url.searchParams.set("end", formatTimestamp(clip.end));
  return url.toString();
}

/** Spoken text inside the clip, trimmed to `maxChars` at a word boundary. */
export function clipQuote(
  segments: TimedSegment[],
  clip: ClipRange,
  maxChars = 220,
): string {
  const text = segments
    .filter((s) => s.end > clip.start && s.start < clip.end)
    .map((s) => cleanSegmentText(s.text))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : maxChars).trimEnd()}…`;
}
