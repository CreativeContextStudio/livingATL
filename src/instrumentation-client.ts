/**
 * Client-side instrumentation. Runs once when the first client component
 * hydrates. Next.js 15+ convention: this file replaces the older
 * `sentry.client.config.ts` and is also the canonical mount point for
 * PostHog's client SDK per their Next.js docs.
 *
 * Two analytics layers:
 *   - Sentry — runtime error + trace capture. Uses NEXT_PUBLIC_SENTRY_DSN
 *     (value ships in client bundle). Same DSN as the server — Sentry
 *     routes by DSN only, not by source.
 *   - PostHog — product analytics (PRD §1 metrics: portal_query,
 *     portal_citation_click, audio play/pause, etc.). `capture_pageview`
 *     stays false here because we capture pageviews explicitly on route
 *     change via `src/components/analytics/posthog-provider.tsx` — the
 *     App Router's client-side navigation doesn't fire a traditional
 *     page-load event. `respect_dnt: true` skips anyone with Do-Not-Track.
 *     If NEXT_PUBLIC_POSTHOG_KEY is missing (e.g. a stripped-down local
 *     build), init is skipped silently. The SDK itself is loaded lazily
 *     by `initPostHog()` so its ~100 KB isn't on every page's critical path.
 */

import * as Sentry from "@sentry/nextjs";
import { config as configureZod } from "zod";

import { initPostHog } from "@/lib/analytics/posthog";

// The CSP (src/lib/csp.ts) forbids eval. Zod v4 otherwise probes for it
// with `Function("")` on first use, which the browser reports as a CSP
// violation; jitless mode skips the probe (validation is unchanged).
configureZod({ jitless: true });

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  debug: false,
});

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Loads posthog-js lazily (dynamic import) — see src/lib/analytics/posthog.ts
// for the config and the pre-load event queue.
if (posthogKey) initPostHog(posthogKey, posthogHost);

// Next.js 15+ optional hook for capturing router-transition errors. Exporting
// this lets Sentry instrument the App Router navigation spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
