import "server-only";

import { asc } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import { neighborhoods } from "@/db/schema";

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
   *  Mapbox sources without reshaping — see `src/db/schema.ts::neighborhoods`
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
