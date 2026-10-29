import type { Metadata } from "next";

import { PreviewHero } from "@/components/preview-hero";
import { fetchArchiveStatsOrNull } from "@/lib/queries/recordings";

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
  title: "livingATL · Atlanta oral histories, 1914–1977",
  description:
    "Listen to WRFG's Living Atlanta interviews: Atlantans recorded in the late 1970s, telling stories of the city from 1914 to 1977. Searchable, with transcripts. Private preview.",
};

export default async function Home() {
  // Landing must render without the database; the stats card degrades.
  return <PreviewHero stats={await fetchArchiveStatsOrNull()} />;
}
