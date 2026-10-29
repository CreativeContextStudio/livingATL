import { createHash } from "node:crypto";

/**
 * Invite links carry a random token; the database stores only its SHA-256
 * (hex). Shared with `livingatl-pipeline/scripts/invites.py`, which mints
 * tokens with `secrets.token_urlsafe(32)` and stores `sha256(token).hexdigest()`.
 */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Shape check before touching the database (token_urlsafe(32) → 43 chars). */
export function looksLikeInviteToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(token);
}
