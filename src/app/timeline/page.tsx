import type { Metadata } from "next";

import { TimelineClient } from "@/components/timeline/timeline-client";
import { requireArchiveAccess } from "@/lib/access-request";
import { fetchTimelineData } from "@/lib/queries/timeline";

/**
 * Interactive Timeline — PRD §7.3.
 *
 * P1 scope: static horizontal timeline rendering every authored
 * brief-moment + every historical event across the corpus. Linear axis.
 * No zoom, no pan, no filters — those ship in P3. See `PHASE1_STATE.md`
 * for the full Timeline phase plan.
 *
 * Launch-gate behavior: this route is intentionally NOT on either allowlist in
 * `src/proxy.ts`, so the proxy sends visitors without access to `/gate` or
 * `/preview`. `requireArchiveAccess()` below is the PRD §8.8 backstop shared
 * with Browse, Map, Player and Portal.
 */
export const metadata: Metadata = {
  title: "Timeline",
  description:
    "Explore the Living Atlanta collection as a single horizontal timeline: every authored brief-moment and every historical event the narrators reference, placed on a shared year axis.",
};

export default async function TimelinePage() {
  // PRD §8.8 backstop — the proxy is the first line; see src/lib/access.ts.
  await requireArchiveAccess();

  const data = await fetchTimelineData();

  // Unique narrators, keyed by interviewee name when present so multi-clip
  // interviews (e.g. MarianDoom1 + MarianDoom2) collapse into one narrator.
  // Falls back to recordingId for rows that don't carry an interviewee
  // name yet, so an anonymous narrator still counts as a distinct bucket.
  const narratorCount = new Set(
    data.moments.map((m) => m.intervieweeName ?? m.recordingId),
  ).size;
  const [yearFrom, yearTo] = data.yearRange;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          Timeline
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-5xl">
          A century of Atlanta.
        </h1>
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          {data.moments.length} moments
          <span className="mx-2 text-muted-foreground">·</span>
          {narratorCount} narrators
          <span className="mx-2 text-muted-foreground">·</span>
          {data.historicalEvents.length} historical events
          <span className="mx-2 text-muted-foreground">·</span>c. {yearFrom}
          –{yearTo}
        </p>
        <p className="text-muted-foreground">
          Every authored chapter of every interview, placed on the year it
          describes. Hover any dot for a preview in the panel below; click
          to pin it and read at your own pace. The vertical band at the top
          is the historical record the narrators kept returning to.
        </p>
      </header>

      <TimelineClient
        data={data}
        corpus={{
          momentCount: data.moments.length,
          narratorCount,
          yearRange: data.yearRange,
        }}
      />
    </main>
  );
}
