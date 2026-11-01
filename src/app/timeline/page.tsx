import type { Metadata } from "next";

import { TimelineClient } from "@/components/timeline/timeline-client";
import { requireArchiveAccess } from "@/lib/access-request";
import { fetchArchiveStatsOrNull } from "@/lib/queries/recordings";
import { fetchTimelineData } from "@/lib/queries/timeline";

/**
 * Interactive Timeline — PRD §7.3.
 *
 * Every authored brief-moment and every historical event on one zoomable
 * year axis; see `components/timeline/timeline-client.tsx`.
 *
 * Launch-gate behavior: this route is intentionally NOT on either allowlist in
 * `src/proxy.ts`, so the proxy sends visitors without access to `/gate` or
 * `/preview`. `requireArchiveAccess()` below is the PRD §8.8 backstop shared
 * with Browse, Map, Player and Portal.
 */
export const metadata: Metadata = {
  title: "Timeline",
  description:
    "Explore the Living Atlanta collection as a single horizontal timeline: every chapter and every historical event the storytellers reference, placed on a shared year axis.",
};

export default async function TimelinePage() {
  // PRD §8.8 backstop — the proxy is the first line; see src/lib/access.ts.
  await requireArchiveAccess();

  const [data, stats] = await Promise.all([fetchTimelineData(), fetchArchiveStatsOrNull()]);

  // Same storyteller count as Home and About (every interviewee, so joint
  // interviews count both people). If the stats query fails, fall back to
  // distinct interviewee names on the moments.
  const narratorCount =
    stats?.distinctInterviewees ??
    new Set(data.moments.map((m) => m.intervieweeName ?? m.recordingId)).size;
  const [yearFrom, yearTo] = data.yearRange;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          A century of Atlanta
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          {data.moments.length} chapters from {narratorCount} storytellers, placed on the years they
          describe, from about {yearFrom} to {yearTo}. Select a dot to read the chapter and hear it.
        </p>
      </header>

      <TimelineClient data={data} />
    </main>
  );
}
