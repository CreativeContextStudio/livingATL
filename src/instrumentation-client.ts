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
 *     build), init is skipped silently.
 */

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

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

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost ?? "https://us.i.posthog.com",
    capture_pageview: false,
    capture_pageleave: true,
    respect_dnt: true,
    persistence: "localStorage+cookie",
    autocapture: false,
    disable_session_recording: true,
  });
}

// Next.js 15+ optional hook for capturing router-transition errors. Exporting
// this lets Sentry instrument the App Router navigation spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
