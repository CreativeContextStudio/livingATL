"use client";

import type { PostHog } from "posthog-js";

/**
 * Shared PostHog capture helper + lazy loader.
 *
 * `posthog-js` is ~100 KB gzipped, so it is not imported statically:
 * `src/instrumentation-client.ts` calls `initPostHog()` (the Next.js 15+
 * canonical mount point, which also hosts Sentry.init), which pulls the SDK
 * in with a dynamic `import()` off the critical path. Calls made while it is
 * loading are queued (bounded) and flushed on load, so the first `$pageview`
 * isn't lost. Safe to import from any client file: no-ops on the server and
 * when analytics is off (no key set in env); DNT is honored by the SDK.
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
  | "browser_search"
  // Sharing and clips (F-clips, F-portal-share)
  | "share_click"
  | "clip_create"
  | "shared_clip_landing"
  | "clip_continue"
  // Pre-playback content note — PRD §8.5
  | "advisory_shown"
  | "advisory_continue"
  // Listening queue, resume, paths, journey
  | "queue_add"
  | "queue_item_complete"
  | "resume_offered"
  | "resume_continue"
  | "resume_restart"
  | "path_start"
  | "path_complete"
  | "journey_start"
  | "journey_step"
  | "journey_listen"
  // Home, story cards, invites
  | "home_clip_play"
  | "story_cards_print"
  | "invite_redeemed";

type EventProps = Record<string, string | number | boolean | null | undefined>;

type Status = "off" | "loading" | "ready";
let status: Status = "off";
let client: PostHog | null = null;
const pending: Array<(ph: PostHog) => void> = [];
/** Cap so a stalled SDK download can't grow memory without bound. */
const MAX_PENDING = 50;

/**
 * Start loading + initializing PostHog. Called once from
 * `instrumentation-client.ts` when NEXT_PUBLIC_POSTHOG_KEY is set.
 */
export function initPostHog(key: string, host: string | undefined): void {
  if (typeof window === "undefined" || status !== "off") return;
  status = "loading";
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host ?? "https://us.i.posthog.com",
        // Pageviews are captured explicitly on route change by
        // `src/components/analytics/posthog-provider.tsx` — App Router
        // client navigations don't fire a page-load event.
        capture_pageview: false,
        capture_pageleave: true,
        respect_dnt: true,
        persistence: "localStorage+cookie",
        autocapture: false,
        disable_session_recording: true,
      });
      client = posthog;
      status = "ready";
      pending.splice(0).forEach((fn) => fn(posthog));
    })
    .catch(() => {
      // SDK failed to load (blocked, offline): drop queued events.
      status = "off";
      pending.length = 0;
    });
}

/**
 * Test seam: when a browser test defines `window.__analyticsSpy = []`, every
 * event is also recorded there (PostHog traffic can't be observed reliably in
 * headless runs). Undefined for real visitors, so this is a no-op in practice.
 */
function spy(event: string, props: EventProps): void {
  const target = (window as Window & { __analyticsSpy?: unknown[] }).__analyticsSpy;
  if (Array.isArray(target)) target.push({ event, props });
}

function withClient(fn: (ph: PostHog) => void): void {
  if (typeof window === "undefined") return;
  if (status === "ready" && client) fn(client);
  else if (status === "loading" && pending.length < MAX_PENDING) pending.push(fn);
}

/**
 * Fire an analytics event. Safe to call from anywhere:
 *   - Server-side, or analytics off (no key): no-op.
 *   - While the SDK is loading: queued, sent once it initializes.
 *   - After init: sent. DNT visitors are opted out by the SDK itself
 *     (`respect_dnt`), so they still see zero analytics traffic.
 */
export function captureEvent(
  event: AnalyticsEvent,
  props: EventProps = {},
): void {
  if (typeof window === "undefined") return;
  spy(event, props);
  withClient((ph) => ph.capture(event, props));
}

/** Alias used by the pageview provider to record `$pageview` explicitly. */
export function capturePageview(path: string): void {
  if (typeof window === "undefined") return;
  spy("$pageview", { $current_url: path });
  withClient((ph) => ph.capture("$pageview", { $current_url: path }));
}
