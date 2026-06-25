"use client";

import posthog from "posthog-js";

/**
 * Shared PostHog capture helper.
 *
 * Initialization itself lives in `src/instrumentation-client.ts` (the
 * Next.js 15+ canonical mount point, which also hosts Sentry.init). This
 * module is a thin typed wrapper that's safe to import from any client
 * file: it no-ops on the server and silently skips when the SDK isn't
 * initialized (no key set in env, DNT honored, etc.).
 *
 * Event names + properties follow PRD §1 metrics. Add new event types to
 * the `AnalyticsEvent` union below as surfaces get wired, so call sites
 * can't fat-finger a typo into a dashboard.
 */

export type AnalyticsEvent =
  // AI Portal — PRD §7.4
  | "portal_query"
  | "portal_citation_click"
  | "portal_to_capture_handoff"
  // Audio Player — PRD §7.2 (placeholder, wired when Player events land)
  | "player_play"
  | "player_pause"
  | "player_seek"
  | "player_citation_click"
  // Collection Browser — PRD §7.1 (placeholder)
  | "browser_filter_change"
  | "browser_search";

type EventProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Fire an analytics event. Safe to call from anywhere:
 *   - Server-side: no-op (PostHog is browser-only).
 *   - Client-side before PostHog has loaded: no-op.
 *   - Client-side after init: sends to PostHog.
 *
 * `__loaded` is the documented way to check init state without triggering
 * a warning from posthog-js. If the SDK wasn't initialized (missing key
 * or DNT set), we just drop the event — matches the spec that DNT visitors
 * should see zero analytics traffic.
 */
export function captureEvent(
  event: AnalyticsEvent,
  props: EventProps = {},
): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  posthog.capture(event, props);
}

/** Alias used by the pageview provider to record `$pageview` explicitly. */
export function capturePageview(path: string): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  posthog.capture("$pageview", { $current_url: path });
}
