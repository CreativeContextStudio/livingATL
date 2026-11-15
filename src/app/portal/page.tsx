import type { Metadata } from "next";

import { PortalClient } from "./portal-client";
import { PortalIntro } from "@/components/portal/portal-intro";
import { requireArchiveAccess } from "@/lib/access-request";

/**
 * AI Portal — PRD §7.4.
 *
 * Single readable column: intro, then the conversation, which flows with
 * the page (no inner scroll box) while the question box stays pinned to
 * the bottom of the screen. Retrieval + synthesis run server-side via
 * `/api/portal/chat`.
 *
 * Launch-gate: not on the preview allowlist in `src/proxy.ts`; the API
 * route repeats the access check (PRD §8.8).
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
    <main className="page-container flex flex-1 flex-col gap-8 pt-8 sm:pt-10 lg:pt-14">
      <PortalIntro />
      <PortalClient />
    </main>
  );
}
