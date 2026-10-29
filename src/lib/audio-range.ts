/** Largest byte range one `/audio` response carries (see the route). */
export const MAX_AUDIO_CHUNK = 4 * 1024 * 1024;

/**
 * Cap a `Range` header to MAX_AUDIO_CHUNK bytes: `bytes=a-b` and the
 * open-ended `bytes=a-` (what media elements send) become at most
 * `bytes=a-(a+chunk-1)`. Suffix (`bytes=-n`) and multi-range headers pass
 * through unchanged.
 */
export function cappedRange(header: string | null): string | null {
  if (!header) return null;
  const m = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!m) return header;
  const start = Number(m[1]);
  const wanted = m[2] === "" ? Infinity : Number(m[2]);
  return `bytes=${start}-${Math.min(wanted, start + MAX_AUDIO_CHUNK - 1)}`;
}
