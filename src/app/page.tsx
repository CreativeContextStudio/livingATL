import type { Metadata } from "next";

import { PreviewHero } from "@/components/preview-hero";
import { fetchArchiveStats } from "@/lib/queries/recordings";

/**
 * `/` landing route.
 *
 * PRD §8.8 allowlists `/` in preview mode, so this page is served directly
 * (not rewritten to `/preview`). During invite-only preview it renders the
 * same <PreviewHero /> as `/preview`. When `NEXT_PUBLIC_LAUNCH_ENABLED` is
 * flipped to `true`, replace this file with the real livingATL landing
 * page — `/preview` continues to render the status page for allowlisted
 * preview visitors.
 */

export const metadata: Metadata = {
  title: "livingATL. Atlanta's elders are talking.",
  description:
    "A public archive of Atlanta oral history, 1914–1977. 500+ recordings from WRFG's Living Atlanta series, made searchable, listenable, and open. Citation-first. Currently invite-only.",
};

export default async function Home() {
  const { processedRecordings, distinctInterviewees } =
    await fetchArchiveStats();
  return (
    <PreviewHero
      processedRecordings={processedRecordings}
      distinctInterviewees={distinctInterviewees}
    />
  );
}
