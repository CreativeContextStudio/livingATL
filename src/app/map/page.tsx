import type { Metadata } from "next";
import Link from "next/link";

import { MapLoader } from "@/components/map/map-loader";
import {
  fetchArchiveStats,
  fetchBrowserFacets,
  fetchBrowserRecordings,
  type BrowserFilter,
} from "@/lib/queries/recordings";
import { fetchNeighborhoodGeometries, toMapRecording } from "@/lib/queries/map";
import { requireArchiveAccess } from "@/lib/access-request";

/**
 * Interactive Map — PRD §7.5 realistic v1.
 *
 * Neighborhood-based pins / polygons / corridor line with recording count
 * badges, filter bar matching the Browser, hover/click preview listing
 * recordings that touch the neighborhood, click-through to the Player.
 *
 * Launch-gate behavior: this route is NOT on the preview allowlist in
 * `src/proxy.ts`, so it naturally rewrites to `/preview` until
 * `NEXT_PUBLIC_LAUNCH_ENABLED=true`. Same pattern as `/browse` + `/player`.
 */

export const metadata: Metadata = {
  title: "Map · Atlanta in place",
  description:
    "Explore the Living Atlanta oral history collection by neighborhood. Every pin connects to the storytellers whose stories touch that place.",
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // PRD §8.8 backstop — the proxy is the first line; see src/lib/access.ts.
  await requireArchiveAccess();
  const params = await searchParams;
  const filter: BrowserFilter = {
    theme: firstParam(params.theme),
    neighborhood: firstParam(params.neighborhood),
    decade: firstParam(params.decade),
    orgCategory: firstParam(params.org_cat),
    eventCategory: firstParam(params.event_cat),
    search: firstParam(params.q),
  };

  const [filtered, facets, neighborhoodGeometries, stats] = await Promise.all([
    fetchBrowserRecordings(filter, "alphabetical"),
    fetchBrowserFacets(),
    fetchNeighborhoodGeometries(),
    fetchArchiveStats(),
  ]);

  // Counts over the FILTERED recordings — pin sizes and badge numbers
  // reflect the current filter state.
  const counts: Record<string, number> = {};
  const advisoryByNeighborhood: Record<string, boolean> = {};
  for (const r of filtered) {
    for (const n of r.neighborhoods) {
      counts[n] = (counts[n] ?? 0) + 1;
      if (r.contentAdvisory?.display_advisory) {
        advisoryByNeighborhood[n] = true;
      }
    }
  }

  // Corpus total (every published recording) — used for "X of N" labels.
  const totalRecordings = stats.processedRecordings;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          Atlanta, in place
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {filtered.length} of {totalRecordings} recordings mapped by the
          neighborhoods their storytellers describe. Click a pin to see who spoke
          about that place, or{" "}
          <Link href="/places" className="text-primary-ink underline underline-offset-4">
            browse all neighborhoods
          </Link>
          .
        </p>
      </header>

      <MapLoader
        recordings={filtered.map(toMapRecording)}
        allRecordingCount={totalRecordings}
        neighborhoods={neighborhoodGeometries}
        counts={counts}
        advisoryByNeighborhood={advisoryByNeighborhood}
        facets={facets}
        filter={filter}
      />
    </main>
  );
}
