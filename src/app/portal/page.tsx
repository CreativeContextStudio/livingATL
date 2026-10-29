import type { Metadata } from "next";

import { PortalClient } from "./portal-client";
import {
  PortalContextRail,
  PortalIntro,
} from "@/components/portal/portal-context-rail";
import { requireArchiveAccess } from "@/lib/access-request";

/**
 * AI Portal — PRD §7.4.
 *
 * Public RSC shell. The interactive conversation lives in `<PortalClient />`.
 * Retrieval + synthesis run server-side via `/api/portal/chat`.
 *
 * Layout: bounded to the viewport on desktop so the conversation scrolls
 * within the chat column, not the page. `min-h` / `h` are offset by the
 * global `--footer-h` + safe-area-inset that `layout.tsx` also reserves on
 * `#main`. On mobile the grid stacks and the chat pane gets a dvh-sized
 * bound so the user isn't scrolling both the page and the chat list.
 *
 * Launch-gate behavior: NOT on the `src/proxy.ts` preview allowlist. When
 * `NEXT_PUBLIC_LAUNCH_ENABLED !== "true"`, the proxy rewrites `/portal` to
 * `/preview`. The API route also enforces the same check server-side as a
 * backstop (PRD §8.8).
 */
export const metadata: Metadata = {
  title: "Ask the archive",
  description:
    "Ask questions about Atlanta history and get answers grounded in the Living Atlanta oral history collection (1914–1977). Every answer cites the recording and timestamp it came from.",
};

export default async function PortalPage() {
  // PRD §8.8 backstop — the proxy is the first line; see src/lib/access.ts.
  await requireArchiveAccess();

  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 lg:py-10"
    >
      <div
        className={[
          // Desktop: two columns sharing one bounded grid row so both bottom-
          // align. We use an EXPLICIT height on lg and REFUSE to let the
          // grid be a `flex-1` item — because `flex-1` sets `flex-basis: 0%`
          // which overrides the `height` property on the main axis of a
          // flex-col parent, so a `flex-1 lg:h-[...]` grid just sizes to
          // content instead of honoring the explicit height. The 12rem
          // accounts for: SiteHeader `h-14` (3.5rem) + footer reserved by
          // `#main`'s `pb-[calc(var(--footer-h)+env(safe-area-inset-bottom))]`
          // (3.5rem) + main's `lg:py-10` top+bottom (5rem). On mobile the
          // grid has no height constraint — it stacks, and the chat card's
          // own `h-[70dvh]` bounds it.
          //
          // DOM order is intro → chat → rail so phones read the heading, then
          // reach the conversation without scrolling past the whole rail.
          // On lg the grid places intro + rail in the left column (rail
          // scrolls) and the chat across both rows on the right.
          "grid grid-cols-1 gap-8",
          "lg:h-[calc(100dvh-12rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-5",
        ].join(" ")}
      >
        <div className="lg:col-start-1 lg:row-start-1">
          <PortalIntro />
        </div>

        <div className="flex min-w-0 min-h-0 flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-full lg:overflow-hidden">
          <PortalClient />
        </div>

        <aside className="min-h-0 lg:col-start-1 lg:row-start-2 lg:h-full lg:overflow-y-auto lg:pr-1 lg:pb-2">
          <PortalContextRail />
        </aside>
      </div>
    </main>
  );
}
