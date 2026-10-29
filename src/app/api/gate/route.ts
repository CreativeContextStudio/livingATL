import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import {
  GATE_COOKIE,
  GATE_COOKIE_MAX_AGE_S,
  secretsEqual,
  signGateCookie,
} from "@/lib/access";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/safe-next";

/**
 * Demo password gate handler — "fake security" for the public preview.
 *
 * Receives the password form POST from `/gate`, checks it against
 * SITE_GATE_PASSWORD, and on success sets the opaque `la_gate` cookie that
 * `src/proxy.ts` checks. The real password never lands in the cookie — the
 * cookie is an HMAC-signed expiry keyed by SITE_GATE_TOKEN (src/lib/access.ts),
 * verified in the proxy — the token itself never leaves the server.
 *
 * Both env vars are server-only (never NEXT_PUBLIC_*).
 */

// Brute-force brake on password guesses, per client IP (per instance — the
// Vercel Firewall rule on this path is the global limit).
const checkRateLimit = createRateLimiter([
  { limit: 5, windowMs: 60_000 },
  { limit: 30, windowMs: 60 * 60_000 },
]);

function backToGate(req: NextRequest, error: "1" | "rate", next: string) {
  const url = new URL("/gate", req.nextUrl.origin);
  url.searchParams.set("error", error);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const password = process.env.SITE_GATE_PASSWORD;
  const token = process.env.SITE_GATE_TOKEN;

  const form = await req.formData();
  const next = safeNextPath(form.get("next"));
  const submitted = form.get("password");

  if (!checkRateLimit(clientIp(req)).ok) return backToGate(req, "rate", next);

  const ok =
    !!password &&
    !!token &&
    typeof submitted === "string" &&
    secretsEqual(submitted, password);

  if (!ok) return backToGate(req, "1", next);

  const res = NextResponse.redirect(new URL(next, req.nextUrl.origin), {
    status: 303,
  });
  res.cookies.set(GATE_COOKIE, signGateCookie(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_COOKIE_MAX_AGE_S,
  });
  return res;
}
