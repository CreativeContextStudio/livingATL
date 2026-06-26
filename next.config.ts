import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// TEMPORARY — Option B audio bridge.
// The R2 bucket's public `*.r2.dev` URL does not serve CORS headers (only a
// Cloudflare custom domain does), so wavesurfer's cross-origin fetch of the
// MP3 is blocked. Until the bucket is moved behind a custom domain (Option A:
// requires creativecontext.studio DNS on Cloudflare), we proxy audio through
// the app's own origin so the browser fetch is same-origin and CORS never
// applies. `recordings.audio_url` is backfilled to `<app-origin>/audio/...`.
//
// REMOVE THIS REWRITE when Option A lands: point R2_PUBLIC_URL at the custom
// domain, re-run scripts.backfill_audio_url, and delete the rewrites() block.
const R2_AUDIO_ORIGIN = "https://pub-fd228e83f3154be8aa86ac191a8244de.r2.dev";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/audio/:path*",
        destination: `${R2_AUDIO_ORIGIN}/audio/:path*`,
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
  // strip them. Stays OFF the launch-gate allowlist (see src/proxy.ts) —
  // the tunnel is not user-reachable during preview mode.
  tunnelRoute: "/monitoring",
  // disableLogger and automaticVercelMonitors are webpack-only options in
  // @sentry/nextjs 10.x — we're on Turbopack (Next 16 default) so both are
  // no-ops here. Omitting them entirely to silence deprecation warnings.
});

