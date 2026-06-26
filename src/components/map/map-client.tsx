"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { MapFilterBar } from "./map-filter-bar";
import { NeighborhoodPreview } from "./neighborhood-preview";
import { neighborhoodColor } from "@/components/shared/category-colors";
import type {
  BrowserFacets,
  BrowserFilter,
  BrowserRecording,
} from "@/lib/queries/recordings";
import type {
  GeoJSONGeometry,
  NeighborhoodGeometry,
} from "@/lib/queries/map";

/**
 * Atlanta Brand System colors as Mapbox hex literals. Mapbox renders into
 * a canvas, so CSS variables in `globals.css` aren't reachable at paint
 * time — we mirror the Style Guide §2 palette here.
 */
const MAP_COLORS = {
  // Neighborhood pins (points) — coral in light mode. Dark-theme support
  // would need a second theme-aware source swap; v1 ships light-only per
  // the plan's scope non-goals.
  pinFill: "#ff7f5c",
  pinStroke: "#ffffff",
  pinFillMuted: "#f6b19c",
  pinActive: "#1a1a2e",
  // Polygon (Sweet Auburn) — coral fill at low opacity + strong stroke.
  polygonFill: "#ff7f5c",
  polygonFillOpacity: 0.18,
  polygonStroke: "#ff7f5c",
  polygonStrokeWidth: 2,
  // Buffered line (Auburn Avenue corridor) — secondary purple, wide.
  corridorColor: "#7b2fbe",
  corridorWidth: 8,
  // Content-advisory ring — warm amber per Style Guide §2 warning token.
  advisoryRing: "#ffb627",
  // Text on pin badges
  pinLabel: "#ffffff",
} as const;

const INITIAL_VIEWPORT = {
  center: [-84.3920, 33.7540] as [number, number], // Five Points
  zoom: 10.9,
};

type FeatureProps = {
  name: string;
  geometryKind: NeighborhoodGeometry["geometryKind"];
  count: number;
  hasAdvisory: boolean;
  /** Hex color from the shared neighborhood palette (see
   *  `category-colors.ts::neighborhoodColor`). Paint expressions pull this
   *  via `["get", "color"]` so pins / polygons / corridors match the
   *  Browser chip hue exactly. */
  color: string;
};

type PointFeature = {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: FeatureProps;
};

function buildFeatureCollection(
  neighborhoods: NeighborhoodGeometry[],
  counts: Record<string, number>,
  advisoryByNeighborhood: Record<string, boolean>,
): { type: "FeatureCollection"; features: PointFeature[] } {
  const features: PointFeature[] = neighborhoods.map((n) => ({
    type: "Feature",
    geometry: n.geometry.geometry,
    properties: {
      name: n.name,
      geometryKind: n.geometryKind,
      count: counts[n.name] ?? 0,
      hasAdvisory: Boolean(advisoryByNeighborhood[n.name]),
      color: neighborhoodColor(n.name),
    },
  }));
  return { type: "FeatureCollection", features };
}

export type MapClientProps = {
  recordings: BrowserRecording[];
  allRecordingCount: number;
  neighborhoods: NeighborhoodGeometry[];
  counts: Record<string, number>;
  advisoryByNeighborhood: Record<string, boolean>;
  facets: BrowserFacets;
  filter: BrowserFilter;
};

export function MapClient({
  recordings,
  allRecordingCount,
  neighborhoods,
  counts,
  advisoryByNeighborhood,
  facets,
  filter,
}: MapClientProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [activeNeighborhood, setActiveNeighborhood] = useState<string | null>(
    null,
  );

  // Below `lg` the preview can't sit in a side column, so a selected
  // neighborhood opens as a bottom-sheet over the map (otherwise the result
  // list renders below a full-height map, off-screen). `isDesktop` gates the
  // sheet's `open` state so the dialog never traps focus / locks scroll on
  // desktop, where the right sidebar is used instead. Matches the `lg`
  // breakpoint (1024px) used by the grid below.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const featureCollection = useMemo(
    () => buildFeatureCollection(neighborhoods, counts, advisoryByNeighborhood),
    [neighborhoods, counts, advisoryByNeighborhood],
  );

  const activeRecordings = useMemo(() => {
    if (!activeNeighborhood) return [];
    return recordings.filter((r) =>
      r.neighborhoods.includes(activeNeighborhood),
    );
  }, [activeNeighborhood, recordings]);

  // Map init — runs once on mount.
  useEffect(() => {
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: INITIAL_VIEWPORT.center,
      zoom: INITIAL_VIEWPORT.zoom,
      minZoom: 9,
      maxZoom: 16,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("neighborhoods", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        promoteId: "name",
      });

      // Fill layer for polygons + multipolygons
      map.addLayer({
        id: "nbhd-fill",
        type: "fill",
        source: "neighborhoods",
        filter: [
          "any",
          ["==", ["get", "geometryKind"], "polygon"],
          ["==", ["get", "geometryKind"], "multipolygon"],
        ],
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            [">", ["get", "count"], 0],
            MAP_COLORS.polygonFillOpacity,
            0.04,
          ],
        },
      });
      map.addLayer({
        id: "nbhd-fill-stroke",
        type: "line",
        source: "neighborhoods",
        filter: [
          "any",
          ["==", ["get", "geometryKind"], "polygon"],
          ["==", ["get", "geometryKind"], "multipolygon"],
        ],
        paint: {
          "line-color": ["get", "color"],
          "line-width": MAP_COLORS.polygonStrokeWidth,
          "line-opacity": [
            "case",
            [">", ["get", "count"], 0],
            1,
            0.35,
          ],
        },
      });

      // Line layer for corridors
      map.addLayer({
        id: "nbhd-corridor",
        type: "line",
        source: "neighborhoods",
        filter: [
          "any",
          ["==", ["get", "geometryKind"], "buffered_line"],
          ["==", ["get", "geometryKind"], "line"],
        ],
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": MAP_COLORS.corridorWidth,
          "line-opacity": [
            "case",
            [">", ["get", "count"], 0],
            0.7,
            0.25,
          ],
        },
      });

      // Circle layer for point pins — size by count
      map.addLayer({
        id: "nbhd-pin",
        type: "circle",
        source: "neighborhoods",
        filter: ["==", ["get", "geometryKind"], "point"],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "count"],
            0, 6,
            1, 9,
            5, 14,
            20, 20,
            50, 28,
          ],
          "circle-color": [
            "case",
            [">", ["get", "count"], 0],
            ["get", "color"],
            MAP_COLORS.pinFillMuted,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_COLORS.pinStroke,
          "circle-opacity": [
            "case",
            [">", ["get", "count"], 0],
            0.92,
            0.45,
          ],
        },
      });

      // Count label on the pin
      map.addLayer({
        id: "nbhd-pin-count",
        type: "symbol",
        source: "neighborhoods",
        filter: [
          "all",
          ["==", ["get", "geometryKind"], "point"],
          [">", ["get", "count"], 0],
        ],
        layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 11,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": MAP_COLORS.pinLabel,
        },
      });

      // Content-advisory ring — a thin second circle overlay for pins
      // whose aggregated neighborhood contains a recording with
      // `display_advisory=true`.
      map.addLayer({
        id: "nbhd-pin-advisory",
        type: "circle",
        source: "neighborhoods",
        filter: [
          "all",
          ["==", ["get", "geometryKind"], "point"],
          ["==", ["get", "hasAdvisory"], true],
        ],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "count"],
            0, 10,
            1, 13,
            5, 18,
            20, 24,
            50, 32,
          ],
          "circle-color": "transparent",
          "circle-stroke-color": MAP_COLORS.advisoryRing,
          "circle-stroke-width": 2,
          "circle-opacity": 1,
        },
      });

      const openFeature = (name: string, coords?: [number, number]) => {
        setActiveNeighborhood(name);
        if (coords) map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 12.5) });
      };

      map.on("click", "nbhd-pin", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const name = (feat.properties?.name as string) ?? null;
        if (!name) return;
        const g = feat.geometry as GeoJSONGeometry;
        const coords =
          g.type === "Point" ? (g.coordinates as [number, number]) : undefined;
        openFeature(name, coords);
      });
      map.on("click", "nbhd-fill", (e) => {
        const feat = e.features?.[0];
        const name = feat?.properties?.name as string | undefined;
        if (name) openFeature(name, [e.lngLat.lng, e.lngLat.lat]);
      });
      map.on("click", "nbhd-corridor", (e) => {
        const feat = e.features?.[0];
        const name = feat?.properties?.name as string | undefined;
        if (name) openFeature(name, [e.lngLat.lng, e.lngLat.lat]);
      });

      for (const layer of ["nbhd-pin", "nbhd-fill", "nbhd-corridor"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [token]);

  // Push updated FeatureCollection into the source whenever filter-driven
  // counts change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("neighborhoods") as
      | (mapboxgl.GeoJSONSource & { setData: (d: unknown) => void })
      | undefined;
    if (src) src.setData(featureCollection);
  }, [featureCollection, ready]);

  const handleClose = useCallback(() => setActiveNeighborhood(null), []);

  if (!token) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Mapbox token is missing. Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in
        <code>.env.local</code> and restart the dev server.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MapFilterBar facets={facets} filter={filter} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
        <div
          ref={containerRef}
          role="application"
          aria-label="Atlanta oral history map"
          className="h-[60dvh] min-h-[360px] w-full overflow-hidden rounded-xl bg-[color:var(--color-surface)] ring-1 ring-border lg:h-[70dvh] lg:min-h-[420px]"
        />

        {/* Desktop (lg+): the preview is the right sidebar, exactly as before.
            Hidden below lg, where the bottom-sheet takes over so tap results
            don't land off-screen under a full-height map. */}
        <div className="hidden h-full min-h-0 lg:block">
          <NeighborhoodPreview
            activeNeighborhood={activeNeighborhood}
            recordings={activeRecordings}
            total={allRecordingCount}
            onClose={handleClose}
          />
        </div>
      </div>

      {/* Mobile/tablet (< lg): selecting a pin opens the preview as a
          dismissible bottom-sheet over the map. `open` is gated on `!isDesktop`
          so the dialog never traps focus or locks scroll on desktop. */}
      <DialogPrimitive.Root
        open={!isDesktop && activeNeighborhood != null}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 lg:hidden" />
          <DialogPrimitive.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-xl outline-none data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom lg:hidden">
            <DialogPrimitive.Title className="sr-only">
              {activeNeighborhood ?? "Neighborhood"} recordings
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Oral history recordings that touch this neighborhood.
            </DialogPrimitive.Description>
            {/* Drag-handle affordance */}
            <div
              aria-hidden
              className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20"
            />
            <NeighborhoodPreview
              activeNeighborhood={activeNeighborhood}
              recordings={activeRecordings}
              total={allRecordingCount}
              onClose={handleClose}
              className="min-h-0 flex-1 rounded-none border-0 bg-transparent"
            />
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
