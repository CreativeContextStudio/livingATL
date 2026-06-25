import "server-only";

import { NextResponse, type NextRequest } from "next/server";

/**
 * Demo password gate handler — "fake security" for the public preview.
 *
 * Receives the password form POST from `/gate`, checks it against
 * SITE_GATE_PASSWORD, and on success sets the opaque `la_gate` cookie that
 * `src/proxy.ts` checks. The real password never lands in the cookie — the
 * cookie carries SITE_GATE_TOKEN, an opaque value compared in the proxy.
 *
 * Both env vars are server-only (never NEXT_PUBLIC_*).
 */

const COOKIE_NAME = "la_gate";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Constant-time string compare — same helper as `api/revalidate/route.ts`. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Open-redirect guard: only same-origin absolute paths. */
function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function POST(req: NextRequest) {
  const password = process.env.SITE_GATE_PASSWORD;
  const token = process.env.SITE_GATE_TOKEN;

  const form = await req.formData();
  const next = safeNext(form.get("next"));
  const submitted = form.get("password");

  const ok =
    !!password &&
    !!token &&
    typeof submitted === "string" &&
    timingSafeEqual(submitted, password);

  if (!ok) {
    const failUrl = new URL("/gate", req.nextUrl.origin);
    failUrl.searchParams.set("error", "1");
    failUrl.searchParams.set("next", next);
    return NextResponse.redirect(failUrl, { status: 303 });
  }

  const res = NextResponse.redirect(new URL(next, req.nextUrl.origin), {
    status: 303,
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
