"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BoxIcon, MinusIcon, PlusIcon, RotateCcwIcon, SquareIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { MAPLIBRE_WORKER_URL } from "@/lib/maplibre-worker";
import type { NeighborhoodGeometry } from "@/lib/queries/map";

/**
 * Map — 3D view (2026-10-30). MapLibre (open source, no token) draws only
 * our own files: streets, rail, creeks, water and parks from OpenStreetMap
 * (`public/geo/atlanta-base.json`) and building blocks raised to their
 * height (`public/geo/atlanta-buildings.json`, core neighborhoods for now),
 * both built by `livingatl-pipeline/scripts/build_basemap.py`. No tiles,
 * glyphs or sprites — labels and pins are HTML markers in the site's type.
 *
 * Loaded lazily by `MapClient`, which shows the flat drawn map until this
 * reports `onReady`, and keeps it if WebGL isn't available (`onFail`).
 */

// Style types, derived from the map options (the style-spec package that
// defines them isn't a direct dependency).
type StyleSpecification = Exclude<maplibregl.MapOptions["style"], string | undefined>;
type LayerSpecification = StyleSpecification["layers"][number];
type FilterSpecification = NonNullable<Extract<LayerSpecification, { type: "line" }>["filter"]>;
type LineWidth = NonNullable<NonNullable<Extract<LayerSpecification, { type: "line" }>["paint"]>["line-width"]>;
type GeoJSONData = Extract<StyleSpecification["sources"][string], { type: "geojson" }>["data"];

export type Map3DPin = {
  name: string;
  count: number;
  /** Pin radius in px (same scale as the drawn map). */
  r: number;
  fill: string;
  text: string;
  lngLat: [number, number];
};

type Props = {
  pins: Map3DPin[];
  shapes: NeighborhoodGeometry[];
  shapeColor: (name: string) => string;
  bounds: [[number, number], [number, number]];
  fivePoints: [number, number];
  active: string | null;
  onToggle: (name: string) => void;
  onReady: () => void;
  onFail: () => void;
  /** Phones draw smaller pins (the whole city fits in ~360px). */
  pinScale?: number;
};

const TILT = 55;
const OVERVIEW_PITCH = 40;
const LABEL_H = 14;
const ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>';

/** True when this browser can draw WebGL (the 3D view's only hard need). */
export function canUse3D(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Palette: read from the site's theme tokens so dark mode follows the site.
// ---------------------------------------------------------------------------

type Palette = {
  land: string;
  park: string;
  cemetery: string;
  water: string;
  waterLine: string;
  street: string;
  minor: string;
  major: string;
  motorway: string;
  rail: string;
  building: string;
};

function isDarkHex(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.5;
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const card = v("--card", "#fff0eb");
  if (isDarkHex(v("--background", "#fff8f5"))) {
    return {
      land: card,
      park: "#2f3d33",
      cemetery: "#34403a",
      water: "#243a4a",
      waterLine: "#2f5368",
      street: "#3b3b40",
      minor: "#46464c",
      major: "#55555c",
      motorway: "#6e4c42",
      rail: "#7a7a84",
      building: "#4a4a53",
    };
  }
  return {
    land: card,
    park: "#dce8d2",
    cemetery: "#e2e7d6",
    water: "#c7dfe8",
    waterLine: "#9fc6d6",
    street: "#ffffff",
    minor: "#ffffff",
    major: "#fffdfb",
    motorway: "#f6c2ae",
    rail: "#9a8f98",
    building: "#eaddd5",
  };
}

const kind = (k: string | string[]): FilterSpecification =>
  Array.isArray(k) ? ["in", ["get", "k"], ["literal", k]] : ["==", ["get", "k"], k];

const width = (stops: Array<[number, number]>): LineWidth =>
  ["interpolate", ["exponential", 1.6], ["zoom"], ...stops.flat()] as LineWidth;

function layers(p: Palette, shapeColor: (name: string) => string, shapes: NeighborhoodGeometry[]): LayerSpecification[] {
  const shapeLayers: LayerSpecification[] = shapes.flatMap((s, i): LayerSpecification[] => {
    const color = shapeColor(s.name);
    if (s.geometry.geometry.type === "LineString") {
      return [
        {
          id: `shape-${i}`,
          type: "line",
          source: `shape-${i}`,
          paint: { "line-color": color, "line-opacity": 0.6, "line-width": width([[11, 4], [16, 16]]) },
          layout: { "line-cap": "round", "line-join": "round" },
        },
      ];
    }
    return [
      { id: `shape-${i}-fill`, type: "fill", source: `shape-${i}`, paint: { "fill-color": color, "fill-opacity": 0.14 } },
      { id: `shape-${i}-line`, type: "line", source: `shape-${i}`, paint: { "line-color": color, "line-opacity": 0.75, "line-width": 2 } },
    ];
  });
  return [
    { id: "land", type: "background", paint: { "background-color": p.land } },
    { id: "park", type: "fill", source: "base", filter: kind("park"), paint: { "fill-color": p.park } },
    { id: "cemetery", type: "fill", source: "base", filter: kind("cemetery"), paint: { "fill-color": p.cemetery } },
    { id: "water", type: "fill", source: "base", filter: kind("water"), paint: { "fill-color": p.water } },
    {
      id: "waterway",
      type: "line",
      source: "base",
      filter: kind(["river", "stream"]),
      paint: { "line-color": p.waterLine, "line-width": width([[11, 0.8], [16, 3]]) },
    },
    {
      id: "street",
      type: "line",
      source: "base",
      minzoom: 13,
      filter: kind("street"),
      paint: { "line-color": p.street, "line-width": width([[13, 0.6], [17, 7]]), "line-opacity": 0.85 },
      layout: { "line-cap": "round", "line-join": "round" },
    },
    {
      id: "minor",
      type: "line",
      source: "base",
      filter: kind("minor"),
      paint: { "line-color": p.minor, "line-width": width([[11, 0.7], [17, 9]]) },
      layout: { "line-cap": "round", "line-join": "round" },
    },
    {
      id: "major",
      type: "line",
      source: "base",
      filter: kind("major"),
      paint: { "line-color": p.major, "line-width": width([[11, 1.2], [17, 12]]) },
      layout: { "line-cap": "round", "line-join": "round" },
    },
    {
      id: "motorway",
      type: "line",
      source: "base",
      filter: kind("motorway"),
      paint: { "line-color": p.motorway, "line-width": width([[11, 1.8], [17, 16]]) },
      layout: { "line-cap": "round", "line-join": "round" },
    },
    {
      id: "rail",
      type: "line",
      source: "base",
      filter: kind("rail"),
      paint: { "line-color": p.rail, "line-width": width([[11, 0.8], [17, 3]]), "line-dasharray": [3, 2] },
    },
    ...shapeLayers,
    {
      id: "buildings",
      type: "fill-extrusion",
      source: "buildings",
      minzoom: 12,
      paint: {
        "fill-extrusion-color": p.building,
        "fill-extrusion-height": ["get", "h"],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 12.6, 0.92],
        "fill-extrusion-vertical-gradient": true,
      },
    },
  ];
}

function buildStyle(p: Palette, shapeColor: (name: string) => string, shapes: NeighborhoodGeometry[]): StyleSpecification {
  const sources: StyleSpecification["sources"] = {
    base: { type: "geojson", data: "/geo/atlanta-base.json", attribution: ATTRIBUTION },
    buildings: { type: "geojson", data: "/geo/atlanta-buildings.json" },
  };
  shapes.forEach((s, i) => {
    sources[`shape-${i}`] = { type: "geojson", data: s.geometry as unknown as GeoJSONData };
  });
  return { version: 8, sources, layers: layers(p, shapeColor, shapes) };
}

// ---------------------------------------------------------------------------
// Screen layout of the HTML markers (recomputed as the camera moves)
// ---------------------------------------------------------------------------

type MarkerLayout = { dx: number; dy: number; label: "right" | "left" | null };

/** Nudge overlapping pins apart and place labels where they fit. */
function layoutMarkers(
  pts: Array<{ name: string; x: number; y: number; r: number; count: number; labelW: number }>,
  active: string | null,
): Record<string, MarkerLayout> {
  const p = pts.map((q) => ({ ...q, ox: q.x, oy: q.y }));
  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const a = p[i];
        const b = p[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r + 3;
        if (d >= min || d > 200) continue;
        const push = (min - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  type Box = { x0: number; x1: number; y0: number; y1: number };
  const boxes: Box[] = p.map((q) => ({ x0: q.x - q.r, x1: q.x + q.r, y0: q.y - q.r, y1: q.y + q.r }));
  const hits = (b: Box, skip: number) => boxes.some((o, i) => i !== skip && b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const out: Record<string, MarkerLayout> = {};
  const order = p
    .map((q, i) => ({ q, i }))
    .sort((a, b) => Number(b.q.name === active) - Number(a.q.name === active) || b.q.count - a.q.count);
  for (const { q, i } of order) {
    let label: MarkerLayout["label"] = null;
    if (q.count !== 0) {
      const right: Box = { x0: q.x + q.r + 2, x1: q.x + q.r + 6 + q.labelW, y0: q.y - LABEL_H / 2, y1: q.y + LABEL_H / 2 };
      const left: Box = { x0: q.x - q.r - 6 - q.labelW, x1: q.x - q.r - 2, y0: q.y - LABEL_H / 2, y1: q.y + LABEL_H / 2 };
      if (!hits(right, i)) {
        boxes.push(right);
        label = "right";
      } else if (!hits(left, i)) {
        boxes.push(left);
        label = "left";
      }
    }
    out[q.name] = { dx: q.x - q.ox, dy: q.y - q.oy, label };
  }
  return out;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string): number {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * 7;
  measureCtx.font = `11px ${getComputedStyle(document.body).fontFamily}`;
  return measureCtx.measureText(text).width;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Map3D({ pins: rawPins, shapes, shapeColor, bounds, fivePoints, active, onToggle, onReady, onFail, pinScale = 1 }: Props) {
  const pins = useMemo(
    () => (pinScale === 1 ? rawPins : rawPins.map((p) => ({ ...p, r: Math.max(4, Math.round(p.r * pinScale)) }))),
    [rawPins, pinScale],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // One element per marker (this component only renders on the client).
  const [markerEls] = useState<Record<string, HTMLElement>>(() =>
    Object.fromEntries(
      [...pins.map((p) => p.name), "Five Points"].map((name) => {
        const el = document.createElement("div");
        el.className = "map3d-marker";
        return [name, el];
      }),
    ),
  );
  const [layout, setLayout] = useState<Record<string, MarkerLayout>>({});
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(OVERVIEW_PITCH);
  const [hovered, setHovered] = useState<string | null>(null);

  // Latest values for map event handlers (the map is created once).
  const live = useRef({ pins, active, onReady, onFail });
  useEffect(() => {
    live.current = { pins, active, onReady, onFail };
  }, [pins, active, onReady, onFail]);

  const relayout = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const { pins: ps, active: act } = live.current;
    const pts = [
      ...ps.map((p) => {
        const s = map.project(p.lngLat);
        return { name: p.name, x: s.x, y: s.y, r: p.r, count: p.count, labelW: textWidth(p.name) };
      }),
      (() => {
        const s = map.project(fivePoints);
        return { name: "Five Points", x: s.x, y: s.y, r: 6, count: -1, labelW: textWidth("FIVE POINTS") + 12 };
      })(),
    ];
    setLayout(layoutMarkers(pts, act));
  }, [fivePoints]);

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: maplibregl.Map;
    try {
      maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL);
      map = new maplibregl.Map({
        container,
        style: buildStyle(readPalette(), shapeColor, shapes),
        bounds,
        fitBoundsOptions: { padding: 24 },
        pitch: OVERVIEW_PITCH,
        maxPitch: 70,
        minZoom: 10.5,
        maxZoom: 17.5,
        maxBounds: [
          [bounds[0][0] - 0.06, bounds[0][1] - 0.05],
          [bounds[1][0] + 0.06, bounds[1][1] + 0.05],
        ],
        cooperativeGestures: true,
        attributionControl: { compact: true, customAttribution: ATTRIBUTION },
        maplibreLogo: false,
        validateStyle: false,
      });
    } catch {
      live.current.onFail();
      return;
    }
    mapRef.current = map;

    // One HTML marker per pin, plus Five Points; React portals into them.
    const markers: maplibregl.Marker[] = [];
    for (const p of [...live.current.pins.map((q) => ({ name: q.name, lngLat: q.lngLat })), { name: "Five Points", lngLat: fivePoints }]) {
      const el = markerEls[p.name];
      if (el) markers.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(p.lngLat).addTo(map));
    }

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        relayout();
      });
    };
    map.on("move", schedule);
    map.on("resize", schedule);
    map.on("rotate", () => setBearing(map.getBearing()));
    map.on("pitch", () => setPitch(map.getPitch()));
    map.on("load", () => {
      // Start the credit collapsed to its ⓘ button; the caption also credits OSM.
      container.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      relayout();
      live.current.onReady();
    });
    const canvas = map.getCanvas();
    const lost = () => live.current.onFail();
    canvas.addEventListener("webglcontextlost", lost);

    // Follow the site theme.
    const observer = new MutationObserver(() => {
      if (!map.isStyleLoaded()) return;
      const p = readPalette();
      const set = (id: string, prop: Parameters<maplibregl.Map["setPaintProperty"]>[1], value: string) => {
        if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
      };
      set("land", "background-color", p.land);
      set("park", "fill-color", p.park);
      set("cemetery", "fill-color", p.cemetery);
      set("water", "fill-color", p.water);
      set("waterway", "line-color", p.waterLine);
      set("street", "line-color", p.street);
      set("minor", "line-color", p.minor);
      set("major", "line-color", p.major);
      set("motorway", "line-color", p.motorway);
      set("rail", "line-color", p.rail);
      set("buildings", "fill-extrusion-color", p.building);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    return () => {
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      if (frame) cancelAnimationFrame(frame);
      markers.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // Created once; later prop changes reach handlers through `live`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to the selected neighborhood.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    relayout();
    if (!active) return;
    const pin = pins.find((p) => p.name === active);
    if (!pin) return;
    map.flyTo({ center: pin.lngLat, zoom: Math.max(map.getZoom(), 14.3), pitch: TILT, duration: 1400, essential: false });
  }, [active, pins, relayout]);

  // Pin sizes change with the filter.
  useEffect(() => {
    relayout();
  }, [pins, relayout]);

  const zoomBy = (d: number) => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() ?? 12) + d, duration: 300 });
  const toggleTilt = () => mapRef.current?.easeTo({ pitch: pitch > 5 ? 0 : TILT, duration: 500 });
  const resetView = () => {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds(bounds, { padding: 24, pitch: OVERVIEW_PITCH, bearing: 0, duration: 900 });
  };
  const flat = pitch <= 5;

  const markerContent = useMemo(
    () =>
      Object.entries(markerEls).map(([name, el]) => {
        const lay = layout[name] ?? { dx: 0, dy: 0, label: null };
        if (name === "Five Points") {
          return createPortal(
            <div aria-hidden className="pointer-events-none relative" style={{ transform: `translate(${lay.dx}px, ${lay.dy}px)` }}>
              <svg viewBox="-7 -7 14 14" className="size-3.5 text-foreground">
                <path d="M -6 0 L 6 0 M 0 -6 L 0 6" stroke="currentColor" strokeOpacity={0.65} strokeWidth={2} />
              </svg>
              {lay.label ? (
                <span
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] leading-none tracking-[0.12em] uppercase text-muted-foreground",
                    lay.label === "right" ? "left-full ml-1.5" : "right-full mr-1.5",
                  )}
                >
                  Five Points
                </span>
              ) : null}
            </div>,
            el,
            name,
          );
        }
        const p = pins.find((q) => q.name === name);
        if (!p) return null;
        const empty = p.count === 0;
        const isActive = active === name;
        return createPortal(
          <div className="relative" style={{ transform: `translate(${lay.dx}px, ${lay.dy}px)` }}>
            <button
              type="button"
              tabIndex={-1}
              disabled={empty}
              aria-label={empty ? undefined : `${p.name}: ${p.count} recording${p.count === 1 ? "" : "s"}`}
              aria-hidden={empty || undefined}
              onClick={() => onToggle(p.name)}
              onMouseEnter={() => !empty && setHovered(p.name)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "flex items-center justify-center rounded-full transition-transform focus:outline-none",
                empty
                  ? "cursor-default bg-muted-foreground/40"
                  : cn(
                      "cursor-pointer font-mono font-semibold tabular-nums shadow-md ring-2 ring-card hover:scale-110",
                      p.r < 10 ? "text-[9px]" : "text-[11px]",
                    ),
                isActive && "scale-110 ring-[3px] ring-foreground",
              )}
              style={{ width: p.r * 2, height: p.r * 2, background: empty ? undefined : p.fill, color: empty ? undefined : p.text }}
            >
              {empty ? null : p.count}
            </button>
            {lay.label || hovered === name || isActive ? (
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1 text-[11px] leading-[14px] [text-shadow:0_0_3px_var(--card),0_0_3px_var(--card)]",
                  lay.label === "left" ? "right-full mr-1" : "left-full ml-1",
                  isActive ? "font-semibold text-foreground" : "text-foreground/85",
                  (hovered === name || isActive) && !lay.label && "bg-card shadow-sm",
                )}
              >
                {p.name}
              </span>
            ) : null}
          </div>,
          el,
          name,
        );
      }),
    [markerEls, layout, pins, active, hovered, onToggle],
  );

  return (
    <div className="absolute inset-0">
      {/* size-full, not inset-0: MapLibre's CSS makes its container position: relative. */}
      <div ref={containerRef} className="size-full" />
      {markerContent}
      <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-lg border border-border bg-card/95 shadow-sm sm:right-3 sm:top-3">
        <MapButton label="Zoom in" onClick={() => zoomBy(1)}>
          <PlusIcon aria-hidden className="size-3.5" />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => zoomBy(-1)}>
          <MinusIcon aria-hidden className="size-3.5" />
        </MapButton>
        <MapButton label={flat ? "Tilt to 3D" : "Flatten to 2D"} onClick={toggleTilt}>
          {flat ? <BoxIcon aria-hidden className="size-3.5" /> : <SquareIcon aria-hidden className="size-3.5" />}
        </MapButton>
        <MapButton label="Reset view (north up, whole map)" onClick={resetView}>
          {Math.abs(bearing) > 1 ? (
            <svg aria-hidden viewBox="-8 -10 16 20" className="size-3.5" style={{ transform: `rotate(${-bearing}deg)` }}>
              <path d="M 0 -9 L 5 4 L 0 1 L -5 4 Z" fill="currentColor" />
            </svg>
          ) : (
            <RotateCcwIcon aria-hidden className="size-3.5" />
          )}
        </MapButton>
      </div>
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center border-b border-border text-muted-foreground transition-colors last:border-b-0 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring pointer-coarse:size-10"
    >
      {children}
    </button>
  );
}
