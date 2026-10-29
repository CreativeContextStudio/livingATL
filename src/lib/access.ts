/**
 * Who may see the archive surfaces — the single rule shared by `src/proxy.ts`
 * (first line), route handlers and pages (backstops per PRD §8.8), and the
 * shell UI that decides whether surface links are live.
 *
 * Precedence:
 *   1. SITE_GATE_TOKEN set → demo password gate is authoritative. A valid
 *      `la_gate` cookie grants access; anything else needs the gate. The
 *      launch flag is ignored, so dropping the gate is never an accidental
 *      way to go public and an entered visitor isn't locked out when the
 *      launch flag is false.
 *   2. No gate → NEXT_PUBLIC_LAUNCH_ENABLED === "true" means public; anything
 *      else is invite-only preview.
 *
 * The cookie is not the secret: it's `v1.<expiry>.<HMAC-SHA256(token,
 * expiry)>`, so it expires on its own (30 days) and a copied cookie never
 * reveals SITE_GATE_TOKEN. Rotating SITE_GATE_TOKEN invalidates every
 * cookie. (Per-person revocation needs invite tokens — PRD F-invite.)
 *
 * No `next/headers` so the proxy (Node runtime) can call it with
 * `request.cookies`. Server components and route handlers use
 * `access-request.ts`.
 */

import { createHmac, timingSafeEqual as bufferEqual } from "node:crypto";

export const GATE_COOKIE = "la_gate";
export const GATE_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30;

export type AccessState =
  /** Launched; no gate configured. */
  | "public"
  /** Gate configured and the visitor's cookie matches. */
  | "entered"
  /** Gate configured and the visitor hasn't entered the password. */
  | "gate-required"
  /** No gate, not launched: invite-only preview. */
  | "preview";

/** Reads SITE_GATE_TOKEN and NEXT_PUBLIC_LAUNCH_ENABLED; injectable for tests. */
type AccessEnv = { readonly [key: string]: string | undefined };

/**
 * Compare two secrets in constant time without leaking their lengths: both
 * sides are hashed to fixed-size digests first.
 */
export function secretsEqual(a: string, b: string): boolean {
  const digest = (v: string) => createHmac("sha256", "livingatl.compare").update(v).digest();
  return bufferEqual(digest(a), digest(b));
}

function gateMac(token: string, expiresAt: number): string {
  return createHmac("sha256", token).update(`la_gate.v1.${expiresAt}`).digest("base64url");
}

/** Cookie value proving the visitor entered the gate password. */
export function signGateCookie(token: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + GATE_COOKIE_MAX_AGE_S;
  return `v1.${expiresAt}.${gateMac(token, expiresAt)}`;
}

export function verifyGateCookie(
  value: string | undefined,
  token: string,
  now = Date.now(),
): boolean {
  const m = /^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(value ?? "");
  if (!m) return false;
  const expiresAt = Number(m[1]);
  if (expiresAt * 1000 <= now) return false;
  return secretsEqual(m[2], gateMac(token, expiresAt));
}

export function resolveAccess(
  gateCookie: string | undefined,
  env: AccessEnv = process.env,
): AccessState {
  const gateToken = env.SITE_GATE_TOKEN;
  if (gateToken) {
    return verifyGateCookie(gateCookie, gateToken) ? "entered" : "gate-required";
  }
  return env.NEXT_PUBLIC_LAUNCH_ENABLED === "true" ? "public" : "preview";
}

export function canViewArchive(state: AccessState): boolean {
  return state === "public" || state === "entered";
}
