import { NextResponse, type NextRequest } from "next/server";

/**
 * Launch gating — PRD §8.8.
 *
 * When NEXT_PUBLIC_LAUNCH_ENABLED is anything other than the literal string
 * "true", every request that is not on the preview allowlist is rewritten to
 * `/preview`. This is the single source of truth for whether the site is
 * public. Flipping it is a deliberate commit change, not a silent env change.
 *
 * The allowlist is intentionally small. API routes that surface
 * historical-archive content MUST also check the flag themselves (route-level
 * enforcement is the backstop if proxy is ever bypassed — see PRD §8.8).
 *
 * Demo password gate (overlay). When SITE_GATE_TOKEN is set, the site runs in
 * password-gate mode INSTEAD of preview mode: every request not on the gate
 * allowlist is rewritten to `/gate` until the visitor presents a matching
 * `la_gate` cookie (set by `/api/gate` after a correct password). This is
 * "fake security" for a public demo — one shared password, opaque token in the
 * cookie. Leave SITE_GATE_TOKEN unset and the original preview behavior below
 * is unchanged.
 *
 * Next.js 16 note: this file is named `proxy.ts` (not `middleware.ts`) and
 * exports `proxy` + `proxyConfig`. Same capabilities, renamed in v16.
 */

/** Constant-time string compare — same helper as `api/revalidate/route.ts`. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Paths reachable without the demo password. The gate page + its POST handler
 * must be open (else there's no way in), plus the liveness probe and the
 * Sentry tunnel.
 */
const GATE_ALLOWLIST: Array<RegExp> = [
  /^\/gate$/, // password entry page
  /^\/api\/gate$/, // password POST handler
  /^\/api\/health$/, // liveness probe
  /^\/monitoring(\/.*)?$/, // Sentry tunnel
  /^\/audio\//, // same-origin audio proxy → R2 (next.config rewrite); content already public
];

const PREVIEW_ALLOWLIST: Array<RegExp> = [
  /^\/$/, // landing page
  /^\/preview(\/.*)?$/, // preview status page
  /^\/invite\/[^/]+$/, // signed invite token route
  /^\/api\/health$/, // liveness probe
  /^\/monitoring(\/.*)?$/, // Sentry tunnel — never leak into preview HTML
  /^\/audio\//, // same-origin audio proxy → R2 (next.config rewrite); content already public
];

/**
 * Paths that must never be rewritten regardless of launch state. These are
 * Next.js framework internals and static asset buckets; rewriting them
 * breaks the page by replacing CSS/JS/font responses with preview HTML.
 *
 * We guard inside the function (not only via the matcher) because the
 * Next.js 16 matcher regex syntax is strict about negative lookaheads, and
 * a leaky matcher silently rewrites `_next/static/*.css` to `/preview` —
 * the symptom is "the page loads but is completely unstyled".
 */
function isFrameworkAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/__nextjs_") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isFrameworkAsset(pathname)) return NextResponse.next();

  // Demo password gate takes precedence over preview mode when configured.
  const gateToken = process.env.SITE_GATE_TOKEN;
  if (gateToken) {
    if (GATE_ALLOWLIST.some((rx) => rx.test(pathname))) {
      return NextResponse.next();
    }
    const cookie = request.cookies.get("la_gate")?.value ?? "";
    if (cookie && timingSafeEqual(cookie, gateToken)) {
      return NextResponse.next();
    }
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = "/gate";
    gateUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.rewrite(gateUrl);
  }

  const launchEnabled = process.env.NEXT_PUBLIC_LAUNCH_ENABLED === "true";
  if (launchEnabled) return NextResponse.next();

  const isAllowed = PREVIEW_ALLOWLIST.some((rx) => rx.test(pathname));
  if (isAllowed) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/preview";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const proxyConfig = {
  // Skip known framework buckets at the matcher level too. The in-function
  // guard is the backstop — both layers because the matcher regex syntax is
  // picky and a silent miss breaks every asset request.
  matcher: ["/((?!_next/|__nextjs_|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
