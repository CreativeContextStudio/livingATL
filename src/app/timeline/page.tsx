import type { Metadata } from "next";
import Link from "next/link";

import { TimelineClient } from "@/components/timeline/timeline-client";
import { fetchTimelineData } from "@/lib/queries/timeline";

/**
 * Interactive Timeline — PRD §7.3.
 *
 * P1 scope: static horizontal timeline rendering every authored
 * brief-moment + every historical event across the corpus. Linear axis.
 * No zoom, no pan, no filters — those ship in P3. See `PHASE1_STATE.md`
 * for the full Timeline phase plan.
 *
 * Launch-gate behavior: this route is intentionally NOT on the preview
 * allowlist in `src/proxy.ts`. When `NEXT_PUBLIC_LAUNCH_ENABLED !== "true"`,
 * the proxy rewrites `/timeline` to `/preview`. Route-level backstop
 * below matches the Browser/Map pattern per PRD §8.8.
 */
export const metadata: Metadata = {
  title: "Timeline",
  description:
    "Explore the Living Atlanta collection as a single horizontal timeline: every authored brief-moment and every historical event the narrators reference, placed on a shared year axis.",
};

export default async function TimelinePage() {
  const launchEnabled = process.env.NEXT_PUBLIC_LAUNCH_ENABLED === "true";
  if (!launchEnabled) {
    // Backstop if the proxy is ever bypassed. The proxy is the real
    // gate; this is belt-and-braces per PRD §8.8. Prefer the preview
    // experience over a 404 so invite holders see the same holding
    // page regardless of which route they tried.
    return (
      <main
        className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col items-start gap-4 px-6 py-16"
        id="main"
      >
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          Preview mode
        </p>
        <h1 className="font-heading text-3xl font-bold">Timeline is invite-only</h1>
        <p className="text-muted-foreground">
          The Interactive Timeline is part of the Phase 2 surface that goes
          live alongside the rest of the Collection when the archive opens.
        </p>
        <Link
          href="/preview"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to preview
        </Link>
      </main>
    );
  }

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
          <span className="mx-2 text-muted-foreground/50">·</span>
          {narratorCount} narrators
          <span className="mx-2 text-muted-foreground/50">·</span>
          {data.historicalEvents.length} historical events
          <span className="mx-2 text-muted-foreground/50">·</span>c. {yearFrom}
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
