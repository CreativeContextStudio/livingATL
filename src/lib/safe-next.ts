/**
 * Open-redirect guard for the gate's `?next=` value. Shared by `/gate` (which
 * echoes it into the form) and `/api/gate` (which redirects to it).
 *
 * A prefix check alone is not enough: `/\evil.com` starts with `/` but the URL
 * parser treats `\` like `/`, so `new URL("/\\evil.com", origin)` resolves to
 * `https://evil.com/`. We resolve against a sentinel origin and only accept
 * the result if it stayed on that origin, then return the path + query + hash
 * so deep links (`/player/X?t=812`) survive the login round-trip.
 */
const SENTINEL_ORIGIN = "http://gate.invalid";
const MAX_NEXT_LENGTH = 2048;

export function safeNextPath(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.length > MAX_NEXT_LENGTH) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  // Backslashes and control characters (tab/newline are silently stripped by
  // the URL parser) have no legitimate use in an in-app path.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";

  let url: URL;
  try {
    url = new URL(value, SENTINEL_ORIGIN);
  } catch {
    return "/";
  }
  if (url.origin !== SENTINEL_ORIGIN) return "/";
  // Dot-segment normalization can collapse `/a/../..//evil.com` into the
  // protocol-relative `//evil.com`, so re-check the normalized path.
  if (url.pathname.startsWith("//")) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
