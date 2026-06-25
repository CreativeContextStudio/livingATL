import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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

