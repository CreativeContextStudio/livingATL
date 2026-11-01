import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Audio: same-origin `/audio/<stem>.mp3` is served by the route handler at
// src/app/audio/[file]/route.ts (relays byte ranges from Cloudflare R2). It
// replaced a rewrite here whose cached partial responses broke playback.

// Static security headers for every response. The Content-Security-Policy
// is per-request (it carries a nonce) and is set in src/proxy.ts.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Legacy clickjacking guard; CSP frame-ancestors 'none' is the modern one.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // 3D map base tiles and MapLibre's worker: each build or upgrade writes
      // a new dated/versioned path, so a URL never changes content.
      {
        source: "/tiles/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Silence warnings in dev where we don't want source map uploads. Vercel
  // sets SENTRY_AUTH_TOKEN at build time so uploads run there.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Tunnel Sentry requests through a Next.js rewrite so ad blockers don't
  // strip them. It IS on both proxy allowlists (src/proxy.ts) so error
  // reports from the gate and preview pages still arrive; it only forwards
  // envelopes to Sentry and serves no archive content.
  tunnelRoute: "/monitoring",
  // disableLogger and automaticVercelMonitors are webpack-only options in
  // @sentry/nextjs 10.x — we're on Turbopack (Next 16 default) so both are
  // no-ops here. Omitting them entirely to silence deprecation warnings.
});

