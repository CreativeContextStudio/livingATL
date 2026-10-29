import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { GATE_COOKIE, signInviteCookie } from "@/lib/access";
import { hashInviteToken, looksLikeInviteToken } from "@/lib/invite-token";
import { findActiveInvite, recordInviteUse } from "@/lib/invites";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/safe-next";

/**
 * Per-person invite link — `/invite/<token>[?next=/player/X]` (PRD §8.8,
 * F-invite). A valid, unrevoked, unexpired invite sets an invite cookie
 * (`v2.<inviteId>.<exp>.<mac>`, signed with SITE_GATE_TOKEN) and redirects
 * in; anything else lands on the gate with an explanation. Tokens are minted
 * and revoked with `livingatl-pipeline/scripts/invites.py`; only their
 * SHA-256 is stored.
 *
 * Invites ride on gate mode: SITE_GATE_TOKEN must be set (it's the signing
 * key). Unset SITE_GATE_PASSWORD to retire the shared password and make the
 * gate invite-only.
 *
 * Link unfurlers (Slack, iMessage) may open the link before the person does;
 * that counts as a use in `use_count` / `last_used_at`.
 */

// Token guessing is hopeless (256-bit), but don't let a script hammer the DB.
const checkRateLimit = createRateLimiter([
  { limit: 10, windowMs: 60_000 },
  { limit: 60, windowMs: 60 * 60_000 },
]);

function toGate(req: NextRequest, error: "invite" | "rate") {
  const url = new URL("/gate", req.nextUrl.origin);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const signingKey = process.env.SITE_GATE_TOKEN;
  if (!signingKey) {
    // No gate configured: public (nothing to grant) or preview (the proxy
    // never routes here). Send them to the front door.
    return NextResponse.redirect(new URL("/", req.nextUrl.origin), { status: 303 });
  }
  if (!checkRateLimit(clientIp(req)).ok) return toGate(req, "rate");

  const { token } = await params;
  if (!looksLikeInviteToken(token)) return toGate(req, "invite");
  const invite = await findActiveInvite(hashInviteToken(token));
  if (!invite) return toGate(req, "invite");
  await recordInviteUse(invite.id);

  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  const value = signInviteCookie(signingKey, invite.id, invite.expiresAt);
  const expiresAt = Number(value.split(".")[2]);
  const res = NextResponse.redirect(new URL(next, req.nextUrl.origin), { status: 303 });
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(GATE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
  });
  return res;
}
