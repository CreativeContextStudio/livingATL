import { NextResponse, type NextRequest } from "next/server";

import { GATE_COOKIE, canViewArchive, resolveAccess } from "@/lib/access";
import { buildCsp } from "@/lib/csp";

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
 * exports `proxy` + `config`. Only the function was renamed in v16 — the
 * matcher export is still `config` (an export named anything else is ignored
 * and the proxy runs on every request).
 */

/**
 * Paths reachable without the demo password. The gate page + its POST handler
 * must be open (else there's no way in), plus the liveness probe and the
 * Sentry tunnel.
 */
const GATE_ALLOWLIST: Array<RegExp> = [
  /^\/gate$/, // password entry page
  /^\/api\/gate$/, // password POST handler
  /^\/invite\/[^/]+$/, // per-person invite links (F-invite) — own token check
  /^\/api\/health$/, // liveness probe
  /^\/api\/revalidate$/, // pipeline cache webhook — own bearer-token auth
  /^\/monitoring(\/.*)?$/, // Sentry tunnel
  /^\/audio\//, // same-origin audio proxy → R2 (next.config rewrite); content already public
];

const PREVIEW_ALLOWLIST: Array<RegExp> = [
  /^\/$/, // landing page
  /^\/preview(\/.*)?$/, // preview status page
  /^\/api\/health$/, // liveness probe
  /^\/api\/revalidate$/, // pipeline cache webhook — own bearer-token auth
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
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isFrameworkAsset(pathname)) return NextResponse.next();

  // Fresh CSP nonce per response (src/lib/csp.ts). Next reads the policy
  // from the *request* headers to nonce its scripts, and the browser
  // enforces the copy on the *response*.
  const csp = buildCsp({
    nonce: Buffer.from(crypto.randomUUID()).toString("base64"),
    isDev: process.env.NODE_ENV === "development",
    isHttps: request.nextUrl.protocol === "https:",
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const withCsp = <T extends NextResponse>(response: T): T => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };
  const next = () => withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  const rewrite = (url: URL) =>
    withCsp(NextResponse.rewrite(url, { request: { headers: requestHeaders } }));

  // Same rule the route/page backstops use — see src/lib/access.ts. The demo
  // password gate takes precedence over preview mode when configured.
  const access = resolveAccess(request.cookies.get(GATE_COOKIE)?.value);
  if (canViewArchive(access)) return next();

  const allowlist = access === "gate-required" ? GATE_ALLOWLIST : PREVIEW_ALLOWLIST;
  if (allowlist.some((rx) => rx.test(pathname))) return next();

  // API callers get a machine-readable 403, not the gate/preview HTML page
  // (which would arrive as a 200 and break JSON/SSE clients). `preview_mode`
  // is the code the Portal client already recognizes.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { reason: access === "preview" ? "preview_mode" : "gate_required" },
      { status: 403 },
    );
  }

  if (access === "gate-required") {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = "/gate";
    // Keep the query string so deep links (`/player/X?t=812`) survive login.
    gateUrl.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return rewrite(gateUrl);
  }

  // access === "preview"
  const url = request.nextUrl.clone();
  url.pathname = "/preview";
  url.search = "";
  return rewrite(url);
}

export const config = {
  // Skip known framework buckets at the matcher level too. The in-function
  // guard is the backstop — both layers because the matcher regex syntax is
  // picky and a silent miss breaks every asset request. Exact filenames only:
  // an extension pattern like `.*\.png$` would also let `/player/X.png`
  // past the gate.
  matcher: [
    "/((?!_next/|__nextjs_|favicon\\.ico|icon\\.png|apple-icon\\.png|robots\\.txt|sitemap\\.xml).*)",
  ],
};
