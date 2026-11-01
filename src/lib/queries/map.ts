import "server-only";

import { asc } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import { neighborhoods } from "@/db/schema";
import { assertRows } from "@/lib/assert-rows";
import type { BrowserRecording } from "@/lib/queries/recordings";

/**
 * What the Map sends to the browser per recording: only the fields the pin
 * counts and the preview cards use, with the card's one-line summary. The full Browser row carries both long summaries for every
 * recording (~350 KB of page data for the collection); this is ~10x smaller.
 */
export type MapRecording = Pick<
  BrowserRecording,
  | "id"
  | "catalogNumber"
  | "title"
  | "durationSeconds"
  | "recordingDate"
  | "recordingDatePrecision"
  | "contentAdvisory"
  | "neighborhoods"
  | "interviewees"
> & { summary: string };

export function toMapRecording(r: BrowserRecording): MapRecording {
  return {
    id: r.id,
    catalogNumber: r.catalogNumber,
    title: r.title,
    durationSeconds: r.durationSeconds,
    recordingDate: r.recordingDate,
    recordingDatePrecision: r.recordingDatePrecision,
    contentAdvisory: r.contentAdvisory,
    neighborhoods: r.neighborhoods,
    interviewees: r.interviewees,
    summary: r.cardLine,
  };
}

export type NeighborhoodGeometryKind =
  | "polygon"
  | "multipolygon"
  | "line"
  | "buffered_line"
  | "point";

export type NeighborhoodGeometry = {
  name: string;
  geometryKind: NeighborhoodGeometryKind;
  /** Full GeoJSON Feature (type + geometry + properties). Ship straight to
   *  the drawn map (`components/map/map-client.tsx`) without reshaping — see `src/db/schema.ts::neighborhoods`
   *  column comment. */
  geometry: GeoJSONFeature;
  source: string;
};

export type GeoJSONGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: Array<[number, number]> }
  | { type: "Polygon"; coordinates: Array<Array<[number, number]>> }
  | {
      type: "MultiPolygon";
      coordinates: Array<Array<Array<[number, number]>>>;
    };

export type GeoJSONFeature = {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties?: Record<string, unknown> | null;
};

/**
 * Fetch every canonical neighborhood geometry. Phase 1 seeded 30 rows via
 * `livingatl-pipeline/scripts/load_neighborhood_geometries.py`. Re-run that
 * script to refresh when ARC / City of Atlanta polygons replace the
 * fallback centroids.
 *
 * Wrapped with `unstable_cache` because the geometry table is essentially
 * static after the seed script runs. `scripts/ingest.py` POSTs to
 * `/api/revalidate?tag=neighborhoods` after every successful ingest batch;
 * 24h TTL is the safety net when the webhook's env vars are unset.
 */
async function _fetchNeighborhoodGeometriesInner(): Promise<
  NeighborhoodGeometry[]
> {
  const rows = await db
    .select({
      name: neighborhoods.name,
      geometryKind: neighborhoods.geometryKind,
      geometry: neighborhoods.geometry,
      source: neighborhoods.source,
    })
    .from(neighborhoods)
    .orderBy(asc(neighborhoods.name));

  assertRows(rows, (r) => typeof r.name === "string" && Boolean(r.geometry), "neighborhoods");
  return rows.map((r) => ({
    name: r.name,
    geometryKind: r.geometryKind as NeighborhoodGeometryKind,
    geometry: r.geometry as GeoJSONFeature,
    source: r.source,
  }));
}

export const fetchNeighborhoodGeometries = unstable_cache(
  _fetchNeighborhoodGeometriesInner,
  ["neighborhood-geometries"],
  { tags: ["neighborhoods"], revalidate: 86400 },
);
