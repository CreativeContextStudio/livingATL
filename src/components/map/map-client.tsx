"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { NeighborhoodPreview } from "./neighborhood-preview";
import { neighborhoodColor } from "@/components/shared/category-colors";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import type { GeoJSONGeometry, MapRecording, NeighborhoodGeometry } from "@/lib/queries/map";

/**
 * Interactive Map — PRD §7.5, drawn version (2026-10-29).
 *
 * Replaces the Mapbox street map: an illustrated map drawn from our own
 * neighborhood geometry (`public.neighborhoods`) in the site's colors and
 * type. No tiles, token, or third-party service, so nothing to fail to
 * load, and dark mode follows the site theme through CSS variables.
 *
 * What's drawn: one pin per neighborhood at its (approximate) center,
 * sized by how many recordings in the current filter touch it; the Sweet
 * Auburn outline and the Auburn Avenue corridor, the two places with real
 * shapes; Five Points as the city's center; a north arrow and a 1-mile
 * scale. Labels are placed largest-first and skipped where they'd collide.
 *
 * Selecting a pin (or a name in the list below, the keyboard path) opens
 * the preview: right column on desktop, bottom sheet on phones.
 *
 * 3D (2026-10-30): where WebGL works, `map-3d.tsx` (MapLibre, our own
 * static vector tiles of streets + buildings) loads lazily over this
 * drawing and replaces it once ready; this drawn map is what renders first
 * and what stays when 3D can't run.
 */

const Map3D = dynamic(() => import("./map-3d").then((m) => m.Map3D), { ssr: false });

/** Can this browser draw the 3D map? It needs WebGL, plus DecompressionStream
 *  for the gzipped tiles (iOS before 16.4 has no such thing, and without it
 *  the map would load blank). Checked once on the client; false on the server. */
let webglSupport: boolean | null = null;
function detectWebGL(): boolean {
  if (webglSupport == null) {
    try {
      const c = document.createElement("canvas");
      webglSupport =
        typeof DecompressionStream !== "undefined" &&
        Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const subscribeNoop = () => () => {};

export type MapClientProps = {
  recordings: MapRecording[];
  allRecordingCount: number;
  neighborhoods: NeighborhoodGeometry[];
  counts: Record<string, number>;
  advisoryByNeighborhood: Record<string, boolean>;
  /** Pre-selected neighborhood — `/map?neighborhood=X` deep links (e.g.
   *  from a place page) open with its preview showing. */
  initialNeighborhood?: string;
};

// ---------------------------------------------------------------------------
// Projection: equirectangular, longitude scaled by cos(latitude) so a mile
// is the same length both ways at Atlanta's latitude.
// ---------------------------------------------------------------------------

const LAT0 = 33.77;
const LON_SCALE = Math.cos((LAT0 * Math.PI) / 180);
const FIVE_POINTS: [number, number] = [-84.388, 33.7537];
/** Degrees of latitude per mile. */
const MILE_LAT = 1 / 69.0;
const PAD = 0.012;

type Box = { minX: number; maxX: number; minY: number; maxY: number };

function project([lon, lat]: [number, number]): [number, number] {
  return [lon * LON_SCALE, -lat];
}

function allPoints(g: GeoJSONGeometry): Array<[number, number]> {
  if (g.type === "Point") return [g.coordinates];
  if (g.type === "LineString") return g.coordinates;
  if (g.type === "Polygon") return g.coordinates[0];
  return g.coordinates.flatMap((poly) => poly[0]);
}

/** Where a neighborhood's pin goes. */
function anchorPoint(g: GeoJSONGeometry): [number, number] {
  if (g.type === "Point") return g.coordinates;
  if (g.type === "LineString") return g.coordinates[Math.floor(g.coordinates.length / 2)];
  const ring = g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0][0];
  const pts = ring.slice(0, -1).length ? ring.slice(0, -1) : ring;
  const [x, y] = pts.reduce(([sx, sy], [px, py]) => [sx + px, sy + py], [0, 0]);
  return [x / pts.length, y / pts.length];
}

function pinRadius(count: number): number {
  if (count < 0) return 7; // Five Points cross
  return count > 0 ? 9 + Math.sqrt(count) * 3.2 : 4;
}

function luminance(hex: string): number {
  const ch = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}

/**
 * Fill + count-text colors for a pin with readable (≥ 4.5:1) numbers: dark
 * text on light colors, white on dark ones, and mid-tone colors (where
 * neither reaches 4.5) darkened just enough for white text.
 */
function pinColors(hex: string): { fill: string; text: string } {
  const DARK = "#1a1a2e";
  const darkL = luminance(DARK);
  if ((luminance(hex) + 0.05) / (darkL + 0.05) >= 4.5) return { fill: hex, text: DARK };
  let fill = hex;
  for (let k = 0; k < 10 && 1.05 / (luminance(fill) + 0.05) < 4.5; k++) {
    fill =
      "#" +
      [1, 3, 5]
        .map((i) => Math.round(parseInt(fill.slice(i, i + 2), 16) * 0.92).toString(16).padStart(2, "0"))
        .join("");
  }
  return { fill, text: "#ffffff" };
}

/**
 * Nudge pins apart (in pixels) so no pin hides another — neighborhood
 * centers a few blocks apart would otherwise overlap. Positions are
 * approximate already; the push is a few pixels. Returns fractions.
 */
function relaxPins(pins: Pin[], width: number, height: number): Pin[] {
  const pts = pins.map((p) => ({ x: p.fx * width, y: p.fy * height, r: pinRadius(p.count) + 2 }));
  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d >= min) continue;
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
  return pins.map((p, i) => ({
    ...p,
    fx: Math.min(1, Math.max(0, pts[i].x / width)),
    fy: Math.min(1, Math.max(0, pts[i].y / height)),
  }));
}

/** Label width in pixels, measured with the page's body font. */
let measureCtx: CanvasRenderingContext2D | null = null;
function labelWidth(text: string): number {
  if (typeof document !== "undefined") {
    measureCtx ??= document.createElement("canvas").getContext("2d");
    if (measureCtx) {
      measureCtx.font = `11px ${getComputedStyle(document.body).fontFamily}`;
      return measureCtx.measureText(text).width;
    }
  }
  return text.length * 7;
}

type Pin = {
  name: string;
  count: number;
  advisory: boolean;
  color: string;
  /** Position as a fraction of the drawing (0–1). */
  fx: number;
  fy: number;
};

type Label = { name: string; x: number; y: number; anchor: "start" | "end" | "middle" };

const LABEL_H = 14;

/** Greedy label placement in pixels: right, left, above, below of each
 *  pin, largest pins first (selected first of all); skip if none fits. */
function placeLabels(
  pins: Pin[],
  width: number,
  height: number,
  selected: string | null,
): Label[] {
  const boxes: Array<{ x0: number; x1: number; y0: number; y1: number }> = pins.map((p) => {
    const r = pinRadius(p.count);
    return { x0: p.fx * width - r, x1: p.fx * width + r, y0: p.fy * height - r, y1: p.fy * height + r };
  });
  const overlaps = (b: { x0: number; x1: number; y0: number; y1: number }, skip: number) =>
    b.x0 < 2 || b.x1 > width - 2 || b.y0 < 2 || b.y1 > height - 2 ||
    boxes.some((o, i) => i !== skip && b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const order = pins
    .map((p, i) => ({ p, i }))
    .sort(
      (a, b) =>
        Number(b.p.name === selected) - Number(a.p.name === selected) ||
        b.p.count - a.p.count ||
        a.p.name.localeCompare(b.p.name),
    );
  const labels: Label[] = [];
  for (const { p, i } of order) {
    const r = pinRadius(p.count);
    const w = labelWidth(p.name) + 4;
    const cx = p.fx * width;
    const cy = p.fy * height;
    const candidates: Array<Label & { box: { x0: number; x1: number; y0: number; y1: number } }> = [
      { name: p.name, x: cx + r + 4, y: cy, anchor: "start", box: { x0: cx + r + 2, x1: cx + r + 4 + w, y0: cy - LABEL_H / 2, y1: cy + LABEL_H / 2 } },
      { name: p.name, x: cx - r - 4, y: cy, anchor: "end", box: { x0: cx - r - 4 - w, x1: cx - r - 2, y0: cy - LABEL_H / 2, y1: cy + LABEL_H / 2 } },
      { name: p.name, x: cx, y: cy - r - 9, anchor: "middle", box: { x0: cx - w / 2, x1: cx + w / 2, y0: cy - r - 4 - LABEL_H, y1: cy - r - 4 } },
      { name: p.name, x: cx, y: cy + r + 9, anchor: "middle", box: { x0: cx - w / 2, x1: cx + w / 2, y0: cy + r + 4, y1: cy + r + 4 + LABEL_H } },
    ];
    const fit = candidates.find((c) => !overlaps(c.box, i));
    if (fit) {
      boxes.push(fit.box);
      labels.push({ name: fit.name, x: fit.x, y: fit.y, anchor: fit.anchor });
    }
  }
  return labels;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapClient({
  recordings,
  allRecordingCount,
  neighborhoods,
  counts,
  advisoryByNeighborhood,
  initialNeighborhood,
}: MapClientProps) {
  const [activeNeighborhood, setActiveNeighborhood] = useState<string | null>(
    initialNeighborhood && counts[initialNeighborhood] ? initialNeighborhood : null,
  );
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const narrow = useMediaQuery("(max-width: 639px)");
  // Name tag for the pin under the pointer — crowded pins (downtown) can't
  // all carry a fixed label.
  const [hovered, setHovered] = useState<string | null>(null);
  // 3D: try it where WebGL works; the drawn map shows until it's ready.
  const webgl = useSyncExternalStore(subscribeNoop, detectWebGL, () => false);
  const [failed3D, setFailed3D] = useState(false);
  const [ready3D, setReady3D] = useState(false);
  const show3D = webgl && !failed3D;
  const live3D = show3D && ready3D;
  // Phones: the 3D map gets a taller frame; the drawn map (laid out for the
  // wide frame) isn't shown under it while it loads.
  const tall3D = show3D && narrow;
  const onReady3D = useCallback(() => setReady3D(true), []);
  const onFail3D = useCallback(() => setFailed3D(true), []);

  // Drawing extent: every neighborhood plus Five Points, padded.
  const box = useMemo<Box>(() => {
    const pts = [...neighborhoods.flatMap((n) => allPoints(n.geometry.geometry)), FIVE_POINTS].map(project);
    return {
      minX: Math.min(...pts.map((p) => p[0])) - PAD,
      maxX: Math.max(...pts.map((p) => p[0])) + PAD,
      minY: Math.min(...pts.map((p) => p[1])) - PAD,
      maxY: Math.max(...pts.map((p) => p[1])) + PAD,
    };
  }, [neighborhoods]);
  const spanX = box.maxX - box.minX;
  const spanY = box.maxY - box.minY;
  const frac = useCallback(
    (lonlat: [number, number]): [number, number] => {
      const [x, y] = project(lonlat);
      return [(x - box.minX) / spanX, (y - box.minY) / spanY];
    },
    [box, spanX, spanY],
  );

  const pins = useMemo<Pin[]>(
    () =>
      neighborhoods.map((n) => {
        const [fx, fy] = frac(anchorPoint(n.geometry.geometry));
        return {
          name: n.name,
          count: counts[n.name] ?? 0,
          advisory: Boolean(advisoryByNeighborhood[n.name]),
          color: neighborhoodColor(n.name),
          fx,
          fy,
        };
      }),
    [neighborhoods, counts, advisoryByNeighborhood, frac],
  );

  // Measured drawing size, for label placement in pixels.
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const placedPins = useMemo(
    () => (size.w ? relaxPins(pins, size.w, size.h) : pins),
    [pins, size],
  );
  const [fpX, fpY] = frac(FIVE_POINTS);
  const labels = useMemo(() => {
    if (!size.w) return [];
    // Five Points rides along as a zero-size, lowest-priority mark: placed
    // only where it won't collide with a pin or another label.
    const marks: Pin[] = [
      ...placedPins,
      { name: "Five Points", count: -1, advisory: false, color: "", fx: fpX, fy: fpY },
    ];
    return placeLabels(marks, size.w, size.h, activeNeighborhood);
  }, [placedPins, size, activeNeighborhood, fpX, fpY]);

  // Shapes: the polygon and corridor neighborhoods, in 0–1000 drawing units.
  const VB_W = 1000;
  const VB_H = (VB_W * spanY) / spanX;
  const shapes = useMemo(
    () =>
      neighborhoods
        .filter((n) => n.geometry.geometry.type !== "Point")
        .map((n) => {
          const pts = allPoints(n.geometry.geometry)
            .map((p) => frac(p))
            .map(([fx, fy]) => `${(fx * VB_W).toFixed(1)},${(fy * VB_H).toFixed(1)}`)
            .join(" ");
          return { name: n.name, kind: n.geometry.geometry.type, pts, color: neighborhoodColor(n.name) };
        }),
    [neighborhoods, frac, VB_H],
  );
  // 3D inputs: true positions (MapLibre places them), colors, extent.
  const pins3D = useMemo(
    () =>
      neighborhoods.map((n) => {
        const count = counts[n.name] ?? 0;
        const { fill, text } = pinColors(neighborhoodColor(n.name));
        return { name: n.name, count, r: pinRadius(count), fill, text, lngLat: anchorPoint(n.geometry.geometry) };
      }),
    [neighborhoods, counts],
  );
  const shapes3D = useMemo(() => neighborhoods.filter((n) => n.geometry.geometry.type !== "Point"), [neighborhoods]);
  const bounds3D = useMemo<[[number, number], [number, number]]>(() => {
    const pts = [...neighborhoods.map((n) => anchorPoint(n.geometry.geometry)), FIVE_POINTS];
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    return [
      [Math.min(...lons) - 0.008, Math.min(...lats) - 0.006],
      [Math.max(...lons) + 0.008, Math.max(...lats) + 0.006],
    ];
  }, [neighborhoods]);

  // One mile as a fraction of the drawing's width (x and y share a scale).
  const mileOfWidth = (MILE_LAT / spanY) * (VB_H / VB_W);

  const activeRecordings = useMemo(
    () => (activeNeighborhood ? recordings.filter((r) => r.neighborhoods.includes(activeNeighborhood)) : []),
    [activeNeighborhood, recordings],
  );
  const handleClose = useCallback(() => setActiveNeighborhood(null), []);
  const toggle = useCallback(
    (name: string) => setActiveNeighborhood((prev) => (prev === name ? null : name)),
    [],
  );

  const listed = useMemo(
    () => pins.filter((p) => p.count > 0).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    [pins],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
        <figure className="flex flex-col gap-2">
          <div
            ref={frameRef}
            role="group"
            aria-label="Map of Atlanta neighborhoods mentioned in the interviews"
            aria-describedby="map-keyboard-help"
            className="relative w-full overflow-hidden rounded-xl bg-card ring-1 ring-border"
            style={{ aspectRatio: tall3D ? "4 / 5" : `${VB_W} / ${VB_H}` }}
          >
            {tall3D && !ready3D ? (
              <p className="absolute inset-0 flex items-center justify-center font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
                Loading the map…
              </p>
            ) : null}
            {live3D || tall3D ? null : (
            <>
            {/* Drawing layer: shapes, Five Points, scale, north arrow. */}
            <svg aria-hidden viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="map-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" className="fill-foreground/10" />
                </pattern>
              </defs>
              <rect width={VB_W} height={VB_H} fill="url(#map-dots)" />
              {shapes.map((s) =>
                s.kind === "LineString" ? (
                  <polyline key={s.name} points={s.pts} fill="none" stroke={s.color} strokeOpacity={0.55} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <polygon key={s.name} points={s.pts} fill={s.color} fillOpacity={0.15} stroke={s.color} strokeOpacity={0.7} strokeWidth={2} />
                ),
              )}
              {/* Five Points */}
              <g transform={`translate(${fpX * VB_W} ${fpY * VB_H})`} className="text-foreground">
                <path d="M -7 0 L 7 0 M 0 -7 L 0 7" stroke="currentColor" strokeOpacity={0.55} strokeWidth={2} />
              </g>
            </svg>

            {/* North arrow and 1-mile scale: fixed-size HTML so they stay
                legible on a phone (SVG text would scale with the drawing). */}
            <div aria-hidden className="pointer-events-none absolute right-3 top-3 flex flex-col items-center text-muted-foreground">
              <svg viewBox="-8 -17 16 24" className="h-5 w-4">
                <path d="M 0 -16 L 7 6 L 0 1 L -7 6 Z" fill="currentColor" fillOpacity={0.6} />
              </svg>
              <span className="font-mono text-[10px]">N</span>
            </div>
            <div aria-hidden className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <span className="h-1.5 border-x-2 border-b-2 border-current" style={{ width: `${mileOfWidth * size.w}px` }} />
              1 mile
            </div>

            {/* Pins */}
            {placedPins.map((p) => {
              const r = pinRadius(p.count);
              const active = activeNeighborhood === p.name;
              const empty = p.count === 0;
              return (
                <button
                  key={p.name}
                  type="button"
                  tabIndex={-1}
                  disabled={empty}
                  aria-label={empty ? undefined : `${p.name}: ${p.count} recording${p.count === 1 ? "" : "s"}`}
                  aria-hidden={empty || undefined}
                  onClick={() => toggle(p.name)}
                  onMouseEnter={() => !empty && setHovered(p.name)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform focus:outline-none pointer-coarse:after:absolute pointer-coarse:after:-inset-3 pointer-coarse:after:content-['']",
                    empty
                      ? "cursor-default bg-muted-foreground/30"
                      : "cursor-pointer font-mono text-[11px] font-semibold tabular-nums shadow-sm ring-2 ring-card hover:z-10 hover:scale-110",
                    active && "z-20 scale-110 ring-[3px] ring-foreground",
                  )}
                  style={{
                    left: `${p.fx * 100}%`,
                    top: `${p.fy * 100}%`,
                    width: r * 2,
                    height: r * 2,
                    background: empty ? undefined : pinColors(p.color).fill,
                    color: empty ? undefined : pinColors(p.color).text,
                  }}
                >
                  {empty ? null : p.count}
                </button>
              );
            })}

            {/* Hover name tag */}
            {(() => {
              const p = hovered ? placedPins.find((x) => x.name === hovered) : undefined;
              if (!p) return null;
              return (
                <span
                  aria-hidden
                  className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm"
                  style={{ left: `${p.fx * 100}%`, top: `calc(${p.fy * 100}% - ${pinRadius(p.count) + 6}px)` }}
                >
                  {p.name} · {p.count}
                </span>
              );
            })()}

            {/* Labels */}
            {labels.map((l) => {
              const pin = placedPins.find((p) => p.name === l.name);
              const active = activeNeighborhood === l.name;
              if (!pin) {
                return (
                  <span
                    key="label-five-points"
                    aria-hidden
                    className="pointer-events-none absolute whitespace-nowrap font-mono text-[10px] leading-none tracking-[0.12em] uppercase text-muted-foreground"
                    style={{ left: l.x, top: l.y, transform: `translate(${l.anchor === "start" ? "0" : l.anchor === "end" ? "-100%" : "-50%"}, -50%)` }}
                  >
                    Five Points
                  </span>
                );
              }
              return (
                <span
                  key={`label-${l.name}`}
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute whitespace-nowrap text-[11px] leading-none",
                    active ? "font-semibold text-foreground" : pin.count > 0 ? "text-foreground/80" : "text-muted-foreground/70",
                  )}
                  style={{
                    left: l.x,
                    top: l.y,
                    transform: `translate(${l.anchor === "start" ? "0" : l.anchor === "end" ? "-100%" : "-50%"}, -50%)`,
                  }}
                >
                  {l.name}
                </span>
              );
            })}
            </>
            )}

            {show3D ? (
              <div className={cn("absolute inset-0 transition-opacity duration-500", ready3D ? "opacity-100" : "pointer-events-none opacity-0")}>
                <Map3D
                  pins={pins3D}
                  shapes={shapes3D}
                  shapeColor={neighborhoodColor}
                  bounds={bounds3D}
                  fivePoints={FIVE_POINTS}
                  active={activeNeighborhood}
                  onToggle={toggle}
                  onReady={onReady3D}
                  onFail={onFail3D}
                  pinScale={narrow ? 0.72 : 1}
                />
              </div>
            ) : null}
          </div>
          <figcaption className="text-xs leading-relaxed text-muted-foreground">
            Pins sit at each neighborhood&apos;s approximate center and grow with the number of
            recordings that mention it. + marks Five Points, the center of downtown.
            {live3D ? (
              <>
                {" "}
                {narrow
                  ? "Use two fingers to move, zoom and turn the map; the cube button tilts it."
                  : "Drag to move; Ctrl/⌘ + scroll to zoom; right-drag or the cube button to tilt and turn."}{" "}
                Streets and buildings are today&apos;s city, for orientation; many of the places in the
                stories are gone. Map data © OpenStreetMap contributors and Overture Maps.
              </>
            ) : null}
          </figcaption>
        </figure>

        {/* Desktop: preview column. Phones/tablets: bottom sheet below. */}
        <div className="hidden h-full min-h-0 lg:block">
          <NeighborhoodPreview
            activeNeighborhood={activeNeighborhood}
            recordings={activeRecordings}
            total={allRecordingCount}
            onClose={handleClose}
          />
        </div>
      </div>

      <p id="map-keyboard-help" className="sr-only">
        Map of neighborhoods mentioned in the interviews. To explore by keyboard, use the
        neighborhood list below the map.
      </p>
      <section aria-labelledby="map-neighborhood-list" className="flex flex-col gap-2">
        <h2 id="map-neighborhood-list" className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          Browse by neighborhood
        </h2>
        <ul className="flex flex-wrap gap-2">
          {listed.map((p) => {
            const selected = activeNeighborhood === p.name;
            return (
              <li key={p.name}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(p.name)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
                  {p.name}
                  <span className={cn("tabular-nums text-xs", selected ? "text-background" : "text-muted-foreground")}>
                    {p.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <p aria-live="polite" className="sr-only">
        {activeNeighborhood
          ? `${activeNeighborhood}: ${activeRecordings.length} recording${activeRecordings.length === 1 ? "" : "s"} shown`
          : ""}
      </p>

      <DialogPrimitive.Root open={!isDesktop && activeNeighborhood != null} onOpenChange={(open) => !open && handleClose()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 lg:hidden" />
          <DialogPrimitive.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col overflow-hidden overscroll-contain rounded-t-2xl border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-xl outline-none data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom lg:hidden">
            <DialogPrimitive.Title className="sr-only">{activeNeighborhood ?? "Neighborhood"} recordings</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Oral history interviews that touch this neighborhood.</DialogPrimitive.Description>
            <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20" />
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
