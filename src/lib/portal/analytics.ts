/**
 * Portal analytics — PRD §1 metrics.
 *
 * Thin typed wrapper over the shared PostHog capture helper
 * (`src/lib/analytics/posthog.ts`) that keeps the Portal's event surface
 * discoverable and typo-proof. Events defined here are the PRD-specified
 * ones for the AI Portal (§7.4): `portal_query`, `portal_citation_click`,
 * `portal_to_capture_handoff`.
 *
 * PostHog is initialized in `src/instrumentation-client.ts`. When the
 * SDK isn't loaded (no NEXT_PUBLIC_POSTHOG_KEY set, visitor has
 * Do-Not-Track on, server-side import, etc.) these calls drop silently.
 */

import { captureEvent } from "@/lib/analytics/posthog";

export type PortalEvent =
  | "portal_query"
  | "portal_citation_click"
  | "portal_to_capture_handoff";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function capturePortalEvent(event: PortalEvent, props: EventProps = {}) {
  captureEvent(event, props);
}
