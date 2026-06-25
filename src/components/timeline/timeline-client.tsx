"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  THEME_FAMILIES,
  familyColorVar,
  familyForEventCategory,
  isFamilyKey,
  isThemeKey,
  themeDotBackground,
  themeKeyToFamily,
  type FamilyKey,
  type ThemeKey,
} from "@/lib/theme-colors";
import {
  MIN_VIEW_SPAN,
  clampView,
  panByFraction,
  panByPixels,
  xPercent,
  zoomAtPct,
} from "@/lib/timeline-scale";
import {
  TimelineDetailFolio,
  type FolioCorpus,
  type FolioSelection,
} from "@/components/timeline/detail-folio";
import { TimelineDetailTether } from "@/components/timeline/detail-tether";
import {
  HoverTooltip,
  type HoverTip,
} from "@/components/timeline/hover-tooltip";
import {
  EMPTY_FILTER,
  TimelineFilterBar,
  isEmptyFilter,
  type TimelineFilter,
} from "@/components/timeline/filter-bar";
import type {
  TimelineData,
  TimelineHistoricalEvent,
  TimelineMoment,
} from "@/lib/queries/timeline";

/**
 * Interactive Timeline — Phase 2 + P3 (zoom / pan).
 *
 * Three horizontal bands over a shared year axis:
 *   1. Historical events (top) — vertical ticks + span bars.
 *   2. Axis — decade ticks, major-year labels, end caps.
 *   3. Moments (bottom) — theme-colored dots, y-jittered across 10 lanes
 *      to de-crowd clusters.
 *
 * Viewport: `view = [start, end]`. Default view is the dense era
 * 1890–1950 (per creative-tech P1 recommendation) clamped to the data's
 * actual bounds. Users can zoom via mouse wheel at the cursor position,
 * +/- keys, or on-canvas zoom controls; pan via click-drag or arrow
 * keys. View state round-trips through `?start=<y>&end=<y>` URL params
 * so zoom/pan are shareable and survive reload.
 *
 * Detail surface: persistent `TimelineDetailFolio` docks above the
 * canvas. Hover previews via the cheap `HoverTooltip`; click pins into
 * the folio. `TimelineDetailTether` connects the folio anchor to the
 * active marker's x-position inside the canvas.
 *
 * Lanes-on-zoom (moments grouping into per-recording lanes when zoomed
 * in far enough) is tracked as P3b — follow-up once the zoom/pan feel
 * is settled.
 */

// ---------------------------------------------------------------------------
// Layout / viewport constants
// ---------------------------------------------------------------------------

const MOMENT_LANES = 10;
const DEFAULT_VIEW: [number, number] = [1910, 1960];
/** Drag threshold — mouse has to move this many pixels before we
 *  treat it as a pan rather than a click. */
const DRAG_CLICK_THRESHOLD_PX = 3;
/** When the view shows less than this many years, moments reorganize
 *  from jittered de-crowding into per-recording lanes. Picked so the
 *  transition happens once the viewer has committed to exploring a
 *  specific window rather than scanning the archive at large. */
const LANE_MODE_THRESHOLD_YEARS = 25;
/** If more visible recordings than this, lane-mode still groups by
 *  recording but suppresses left-edge labels (they'd overlap). */
const LANE_LABEL_CAP = 15;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function laneFor(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % MOMENT_LANES;
}

function momentAnchorYear(m: TimelineMoment): number | null {
  if (m.eraStartYear != null && m.eraEndYear != null) {
    return (m.eraStartYear + m.eraEndYear) / 2;
  }
  return m.eraStartYear ?? m.eraEndYear ?? null;
}

function eventAnchorYear(e: TimelineHistoricalEvent): number | null {
  return e.year ?? e.yearStart ?? null;
}

/** Decade-granularity ticks across a view range. */
function decadeTicks(view: [number, number]): number[] {
  const [start, end] = view;
  const first = Math.ceil(start / 10) * 10;
  const ticks: number[] = [];
  for (let y = first; y <= end; y += 10) ticks.push(y);
  return ticks;
}

/** Quarter-century bands — used for background rhythm shading. */
function quarterCenturyBands(
  view: [number, number],
): Array<{ start: number; end: number; index: number }> {
  const [start, end] = view;
  const first = Math.floor(start / 25) * 25;
  const bands: Array<{ start: number; end: number; index: number }> = [];
  let idx = 0;
  for (let y = first; y < end; y += 25) {
    bands.push({
      start: Math.max(y, start),
      end: Math.min(y + 25, end),
      index: idx,
    });
    idx += 1;
  }
  return bands;
}

function momentSelectionId(m: TimelineMoment): string {
  return `moment:${m.recordingId}:${m.momentIndex}`;
}

function eventSelectionId(e: TimelineHistoricalEvent): string {
  const anchor = e.year ?? e.yearStart ?? "undated";
  return `event:${e.category}:${anchor}:${e.label}`;
}

function tipAnchorYear(tip: HoverTip | null): number | null {
  if (!tip) return null;
  return tip.kind === "moment"
    ? momentAnchorYear(tip.moment)
    : eventAnchorYear(tip.event);
}

function pinnedAnchorYear(sel: FolioSelection | null): number | null {
  if (!sel) return null;
  return sel.kind === "moment"
    ? momentAnchorYear(sel.moment)
    : eventAnchorYear(sel.event);
}

// ---------------------------------------------------------------------------
// View math
// ---------------------------------------------------------------------------
// `xPercent`, `clampView`, `zoomAtPct`, `panByPixels`, and `panByFraction`
// live in `@/lib/timeline-scale` so the piecewise-linear scale is in one
// place. See that file for the weighted-year math that underpins the
// non-uniform axis spacing.

/** Read ?start=&end= from URL params, falling back to DEFAULT_VIEW. */
function viewFromSearchParams(
  params: URLSearchParams | null,
  bounds: [number, number],
): [number, number] {
  if (params) {
    const s = Number(params.get("start"));
    const e = Number(params.get("end"));
    if (Number.isFinite(s) && Number.isFinite(e) && s < e) {
      return clampView([s, e], bounds);
    }
  }
  return clampView(DEFAULT_VIEW, bounds);
}

/** Read filter state from URL params. Drops unknown theme/family keys so
 *  a stale query string can't corrupt the render. */
function filterFromSearchParams(
  params: URLSearchParams | null,
): TimelineFilter {
  if (!params) return EMPTY_FILTER;
  const themes = (params.get("themes") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is ThemeKey => isThemeKey(t));
  const neighborhoods = (params.get("neighborhoods") ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  const families = (params.get("families") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter((f): f is FamilyKey => isFamilyKey(f));
  const highlightOnly = params.get("highlight") === "1";
  return { themes, neighborhoods, families, highlightOnly };
}

/** Moment matches the active filter? OR-within-field semantics. */
function matchesFilter(m: TimelineMoment, filter: TimelineFilter): boolean {
  if (filter.highlightOnly && !m.highlight) return false;
  if (filter.themes.length > 0) {
    const hit = m.themes.some((t) =>
      filter.themes.includes(t as ThemeKey),
    );
    if (!hit) return false;
  }
  if (filter.neighborhoods.length > 0) {
    const hit = m.neighborhoods.some((n) => filter.neighborhoods.includes(n));
    if (!hit) return false;
  }
  if (filter.families.length > 0) {
    const hit = m.themes.some((t) => {
      if (!isThemeKey(t)) return false;
      return filter.families.includes(themeKeyToFamily(t));
    });
    if (!hit) return false;
  }
  return true;
}

/** Historical event matches the active filter? Events only respond to
 *  the family filter — themes/neighborhoods/highlightOnly don't apply to
 *  historical context and would over-filter the band. */
function matchesEventFilter(
  e: TimelineHistoricalEvent,
  filter: TimelineFilter,
): boolean {
  if (filter.families.length === 0) return true;
  const family = familyForEventCategory(e.category);
  return family != null && filter.families.includes(family);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimelineClient({
  data,
  corpus,
}: {
  data: TimelineData;
  corpus: FolioCorpus;
}) {
  const { moments, historicalEvents, yearRange } = data;
  // Memoize bounds so our clampView calls don't see a fresh array identity
  // on every render (same numeric pair, stable reference).
  const bounds = useMemo<[number, number]>(
    () => [yearRange[0], yearRange[1]],
    [yearRange],
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<[number, number]>(() =>
    viewFromSearchParams(searchParams, bounds),
  );
  const [filter, setFilter] = useState<TimelineFilter>(() =>
    filterFromSearchParams(searchParams),
  );
  const [pinned, setPinned] = useState<FolioSelection | null>(null);
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);
  // Tracks whether we've applied the URL hydration pass yet. Guards
  // the URL-sync effect from overwriting URL params with defaults
  // before the initial hydration completes.
  const hydratedRef = useRef(false);

  // On client mount, re-read URL params directly. `useSearchParams()`
  // can return null during SSR, which would leave state at defaults
  // even when the URL carries explicit state. This effect is the
  // backstop — it reads `window.location.search` once on mount so
  // shareable URLs like `/timeline?themes=...` land with the correct
  // state applied.
  useEffect(() => {
    if (hydratedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    setView(viewFromSearchParams(params, bounds));
    setFilter(filterFromSearchParams(params));
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    startClientX: number;
    startView: [number, number];
    canvasWidth: number;
  } | null>(null);
  // didDragRef persists briefly after pointer-up so marker onClick can
  // check whether the gesture was a click vs a pan. Reset on next frame.
  const didDragRef = useRef(false);

  const pinnedId = pinned?.id ?? null;
  const hoverId = hoverTip
    ? hoverTip.kind === "moment"
      ? momentSelectionId(hoverTip.moment)
      : eventSelectionId(hoverTip.event)
    : null;

  const tetherYear = useMemo(
    () => tipAnchorYear(hoverTip) ?? pinnedAnchorYear(pinned),
    [hoverTip, pinned],
  );

  const plottableMoments = useMemo(
    () =>
      moments.filter((m) => {
        const year = momentAnchorYear(m);
        return year != null && year >= view[0] && year <= view[1];
      }),
    [moments, view],
  );

  const plottableEvents = useMemo(
    () =>
      historicalEvents.filter((e) => {
        const start = e.yearStart ?? e.year;
        return (
          start != null &&
          start <= view[1] &&
          (e.yearEnd ?? e.year ?? start) >= view[0]
        );
      }),
    [historicalEvents, view],
  );

  const ticks = useMemo(() => decadeTicks(view), [view]);
  const bands2 = useMemo(() => quarterCenturyBands(view), [view]);

  // Filter match stats. Pinned moment is always considered "matching"
  // for count purposes so the stats reflect what the viewer sees.
  const filterActive = !isEmptyFilter(filter);
  const matchingVisibleMoments = useMemo(
    () =>
      filterActive
        ? plottableMoments.filter((m) => matchesFilter(m, filter))
        : plottableMoments,
    [filterActive, plottableMoments, filter],
  );
  const familyFilterActive = filter.families.length > 0;
  const matchingVisibleEvents = useMemo(
    () =>
      familyFilterActive
        ? plottableEvents.filter((e) => matchesEventFilter(e, filter))
        : plottableEvents,
    [familyFilterActive, plottableEvents, filter],
  );
  const matchingNarratorCount = useMemo(() => {
    const ids = new Set<string>();
    for (const m of matchingVisibleMoments) ids.add(m.recordingId);
    return ids.size;
  }, [matchingVisibleMoments]);

  // Lane mode — when zoomed in tight enough, reorganize moments from
  // jittered clusters into per-recording lanes so a narrator's arc reads
  // as a continuous thread across the visible years.
  const laneMode = view[1] - view[0] <= LANE_MODE_THRESHOLD_YEARS;
  const recordingLanes = useMemo(() => {
    if (!laneMode) return null;
    type LaneEntry = { firstYear: number; name: string };
    const byRecording = new Map<string, LaneEntry>();
    for (const m of plottableMoments) {
      const year = momentAnchorYear(m);
      if (year == null) continue;
      const existing = byRecording.get(m.recordingId);
      if (existing) {
        if (year < existing.firstYear) existing.firstYear = year;
      } else {
        byRecording.set(m.recordingId, {
          firstYear: year,
          name: m.intervieweeName ?? m.recordingTitle,
        });
      }
    }
    const sorted = [...byRecording.entries()].sort(
      ([, a], [, b]) => a.firstYear - b.firstYear,
    );
    const total = sorted.length;
    return new Map(
      sorted.map(([rid, data], idx) => [
        rid,
        { index: idx, total, name: data.name, firstYear: data.firstYear },
      ]),
    );
  }, [laneMode, plottableMoments]);

  // -----------------------------------------------------------------------
  // Hover / click handlers
  // -----------------------------------------------------------------------

  const onMomentEnter = useCallback(
    (m: TimelineMoment, evt: React.MouseEvent) => {
      setHoverTip({
        kind: "moment",
        moment: m,
        x: evt.clientX,
        y: evt.clientY,
      });
    },
    [],
  );
  const onEventEnter = useCallback(
    (e: TimelineHistoricalEvent, evt: React.MouseEvent) => {
      setHoverTip({
        kind: "event",
        event: e,
        x: evt.clientX,
        y: evt.clientY,
      });
    },
    [],
  );
  const onHoverLeave = useCallback(() => setHoverTip(null), []);

  // Suppress click if the gesture turned into a drag.
  const onMomentClick = useCallback((m: TimelineMoment) => {
    if (didDragRef.current) return;
    const id = momentSelectionId(m);
    setPinned((prev) =>
      prev?.id === id ? null : { kind: "moment", id, moment: m },
    );
  }, []);
  const onEventClick = useCallback((e: TimelineHistoricalEvent) => {
    if (didDragRef.current) return;
    const id = eventSelectionId(e);
    setPinned((prev) =>
      prev?.id === id ? null : { kind: "event", id, event: e },
    );
  }, []);

  const onClearPin = useCallback(() => setPinned(null), []);

  /** Toggle a top-level family in the filter. Repurposes the legend swatch
   *  row (was static display) into a click-target so the 5 color tags
   *  double as sort controls. OR semantics within the field. */
  const onToggleFamily = useCallback((family: FamilyKey) => {
    setFilter((prev) => {
      const active = prev.families.includes(family);
      return {
        ...prev,
        families: active
          ? prev.families.filter((k) => k !== family)
          : [...prev.families, family],
      };
    });
  }, []);

  // -----------------------------------------------------------------------
  // View controls
  // -----------------------------------------------------------------------

  const onZoomIn = useCallback(() => {
    setView((prev) => zoomAtPct(prev, 0.5, true, bounds));
  }, [bounds]);
  const onZoomOut = useCallback(() => {
    setView((prev) => zoomAtPct(prev, 0.5, false, bounds));
  }, [bounds]);
  const onResetView = useCallback(() => {
    setView(clampView(DEFAULT_VIEW, bounds));
  }, [bounds]);

  // Wheel-zoom, anchored on cursor x. Non-passive so we can preventDefault
  // and stop the page from scrolling when the cursor is over the canvas.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (evt: WheelEvent) => {
      // Only intercept horizontal/vertical wheel that looks like zoom intent.
      // Trackpad pinch reports ctrlKey; mouse wheel is just deltaY.
      if (evt.deltaY === 0 && evt.deltaX === 0) return;
      evt.preventDefault();
      const rect = el.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (evt.clientX - rect.left) / rect.width),
      );
      const delta = evt.deltaY !== 0 ? evt.deltaY : evt.deltaX;
      setView((prev) => zoomAtPct(prev, pct, delta < 0, bounds));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bounds]);

  // Drag-pan via pointer events.
  //
  // Deliberately NOT using `setPointerCapture` on the canvas — doing so
  // redirects subsequent pointer events (including pointerup) to the
  // canvas, which suppresses click events on child buttons (moment dots
  // and event bars). Instead we attach document-level pointermove /
  // pointerup listeners after pointerdown so pan continues even when
  // the cursor leaves the canvas, while child button clicks still fire
  // their own synthesized click event.
  const onPointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      if (evt.button !== 0) return; // primary button only
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      dragStateRef.current = {
        startClientX: evt.clientX,
        startView: view,
        canvasWidth: rect.width,
      };
      didDragRef.current = false;
    },
    [view],
  );

  // Document-level pan listeners. Always mounted; no-op when
  // `dragStateRef.current` is null (i.e. the user hasn't pressed down
  // yet). This avoids re-binding on every pointerdown.
  useEffect(() => {
    const onMove = (evt: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dx = evt.clientX - state.startClientX;
      if (Math.abs(dx) > DRAG_CLICK_THRESHOLD_PX) {
        didDragRef.current = true;
      }
      setView(panByPixels(state.startView, dx, state.canvasWidth, bounds));
    };
    const onUp = () => {
      dragStateRef.current = null;
      // Let the drag flag persist just long enough for the click event
      // to see it. Reset on the next frame so future clicks fire
      // normally.
      requestAnimationFrame(() => {
        didDragRef.current = false;
      });
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [bounds]);

  // Keyboard — document-level. Arrow L/R pan, +/- zoom, 0/Home reset,
  // Escape unpins. Skipped when a text input is focused so typing
  // doesn't pan the timeline.
  useEffect(() => {
    const onKeyDown = (evt: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || active?.isContentEditable) {
        return;
      }
      if (evt.key === "Escape") {
        if (pinned) setPinned(null);
        return;
      }
      switch (evt.key) {
        case "ArrowLeft":
          evt.preventDefault();
          setView((prev) => panByFraction(prev, -0.1, bounds));
          break;
        case "ArrowRight":
          evt.preventDefault();
          setView((prev) => panByFraction(prev, 0.1, bounds));
          break;
        case "+":
        case "=":
          evt.preventDefault();
          setView((prev) => zoomAtPct(prev, 0.5, true, bounds));
          break;
        case "-":
        case "_":
          evt.preventDefault();
          setView((prev) => zoomAtPct(prev, 0.5, false, bounds));
          break;
        case "0":
        case "Home":
          evt.preventDefault();
          setView(clampView(DEFAULT_VIEW, bounds));
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [view, bounds, pinned]);

  // Sync view + filter → URL, debounced. Clears params when they match
  // default state so the canonical URL is clean. Skipped until the
  // hydration effect has run so initial URL params aren't clobbered
  // by defaults.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      const defaulted = clampView(DEFAULT_VIEW, bounds);
      const isDefaultView =
        Math.abs(view[0] - defaulted[0]) < 0.5 &&
        Math.abs(view[1] - defaulted[1]) < 0.5;
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (isDefaultView) {
        params.delete("start");
        params.delete("end");
      } else {
        params.set("start", String(Math.round(view[0])));
        params.set("end", String(Math.round(view[1])));
      }
      if (filter.themes.length > 0) {
        params.set("themes", filter.themes.join(","));
      } else {
        params.delete("themes");
      }
      if (filter.neighborhoods.length > 0) {
        params.set("neighborhoods", filter.neighborhoods.join(","));
      } else {
        params.delete("neighborhoods");
      }
      if (filter.families.length > 0) {
        params.set("families", filter.families.join(","));
      } else {
        params.delete("families");
      }
      if (filter.highlightOnly) {
        params.set("highlight", "1");
      } else {
        params.delete("highlight");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 200);
    return () => clearTimeout(timer);
    // intentionally omitting `searchParams` — we read a snapshot once on
    // mount and own view/filter params thereafter. Including it would
    // create a feedback loop with router.replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filter, bounds, pathname, router]);

  // Full-view check for disabling zoom-out / reset buttons
  const viewSpan = view[1] - view[0];
  const dataSpan = bounds[1] - bounds[0];
  const isFullView = viewSpan >= dataSpan - 0.5;
  const isMinView = viewSpan <= MIN_VIEW_SPAN + 0.5;
  const isDefaultView =
    Math.abs(view[0] - clampView(DEFAULT_VIEW, bounds)[0]) < 0.5 &&
    Math.abs(view[1] - clampView(DEFAULT_VIEW, bounds)[1]) < 0.5;

  return (
    <div className="flex flex-col gap-4">
      <TimelineDetailFolio
        selected={pinned}
        onClear={onClearPin}
        corpus={corpus}
      />

      {hoverTip ? <HoverTooltip tip={hoverTip} /> : null}

      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card">
        {/* Row 1: filter bar */}
        <TimelineFilterBar
          filter={filter}
          onChange={setFilter}
          moments={moments}
          matchingMomentCount={matchingVisibleMoments.length}
          matchingNarratorCount={matchingNarratorCount}
          totalMomentCount={moments.length}
        />

        {/* Row 2: family filter swatches (click to narrow canvas by
            family) + interaction controls. The 5 swatches double as the
            color legend and the top-level sort controls. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/60 px-4 py-2 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground/80 sm:px-6">
          <span className="flex items-center gap-1 normal-case tracking-normal">
            {THEME_FAMILIES.map((f) => {
              const isActive = filter.families.includes(f.key);
              const anyActive = filter.families.length > 0;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onToggleFamily(f.key)}
                  title={
                    isActive
                      ? `Turn off ${f.label} filter`
                      : `Filter by ${f.label}`
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isActive
                      ? "bg-muted text-foreground"
                      : anyActive
                        ? "text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "inline-block size-2 rounded-full transition-opacity",
                      !isActive && anyActive ? "opacity-40" : "opacity-100",
                    )}
                    style={{ backgroundColor: familyColorVar(f.key) }}
                  />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </span>
          <span className="ml-auto flex items-center gap-2 normal-case tracking-normal">
            <span>
              {familyFilterActive
                ? `${matchingVisibleEvents.length}/${plottableEvents.length}`
                : `${plottableEvents.length}/${historicalEvents.length}`}{" "}
              events
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>{Math.round(view[0])}–{Math.round(view[1])}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{laneMode ? "lanes" : "jitter"}</span>
            <span className="hidden text-muted-foreground/50 sm:inline">·</span>
            <span className="hidden sm:inline">scroll to zoom · drag to pan · +/− · 0</span>
          </span>
        </div>

        {/* Canvas — the three bands + axis, plus drag-pan pointer handlers
            and the floating zoom controls. */}
        <div
          ref={canvasRef}
          className={cn(
            "relative h-[360px] overflow-hidden touch-pan-y select-none sm:h-[480px] sm:touch-none",
            dragStateRef.current ? "cursor-grabbing" : "cursor-grab",
          )}
          onMouseLeave={onHoverLeave}
          onPointerDown={onPointerDown}
        >
          {/* Quarter-century shading */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {bands2.map((b) => {
              const left = xPercent(b.start, view);
              const width = xPercent(b.end, view) - left;
              return (
                <div
                  key={`band-${b.start}`}
                  className={cn(
                    "absolute inset-y-0",
                    b.index % 2 === 0 ? "bg-muted/35" : "bg-transparent",
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}
            {bands2.slice(1).map((b) => (
              <div
                key={`band-div-${b.start}`}
                className="absolute inset-y-0 w-px bg-border/30"
                style={{ left: `${xPercent(b.start, view)}%` }}
              />
            ))}
          </div>

          {/* Tether */}
          <TimelineDetailTether
            year={tetherYear}
            yearRange={view}
            isPinned={pinned != null && hoverTip == null}
          />

          {/* Historical events band — one bar per event, tinted by
              theme family (Justice/Place/Daily Life/Institutions/Culture)
              via category lookup. Unmapped categories fall back to a
              neutral muted tone. Family filter fades non-matches to 15%
              so the band's gestalt survives. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28%]">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border/40" />
            {plottableEvents.map((e) => {
              const start = e.year ?? e.yearStart!;
              const end = e.yearEnd ?? e.year ?? e.yearStart!;
              const left = xPercent(start, view);
              const width = Math.max(
                0.2,
                xPercent(end, view) - xPercent(start, view),
              );
              const isRange = e.yearStart != null && e.yearEnd != null;
              const weight = Math.min(0.6, 0.28 + e.recordingCount * 0.05);
              const id = eventSelectionId(e);
              const isPinnedMarker = pinnedId === id;
              const isHoverMarker = hoverId === id;
              const family = familyForEventCategory(e.category);
              const fillVar = family
                ? familyColorVar(family)
                : "var(--color-muted-foreground)";
              const isMatch = matchesEventFilter(e, filter);
              const filteredOut =
                filter.families.length > 0 && !isMatch && !isPinnedMarker;
              return (
                <button
                  key={id}
                  type="button"
                  data-selected={(isPinnedMarker || isHoverMarker) || undefined}
                  aria-pressed={isPinnedMarker}
                  className={cn(
                    "absolute top-[8%] h-[84%] cursor-pointer rounded-sm border transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    filteredOut
                      ? "pointer-events-none opacity-15"
                      : "pointer-events-auto",
                    !filteredOut &&
                      (isRange
                        ? "opacity-70 hover:opacity-95"
                        : "opacity-80 hover:opacity-100"),
                    !filteredOut &&
                      (isPinnedMarker || isHoverMarker) &&
                      "opacity-100",
                    isPinnedMarker &&
                      "ring-2 ring-primary ring-offset-1 ring-offset-card",
                  )}
                  style={{
                    left: `${left}%`,
                    width: isRange ? `${width}%` : "2px",
                    backgroundColor: `color-mix(in oklab, ${fillVar} ${Math.round(weight * 100)}%, transparent)`,
                    borderColor: `color-mix(in oklab, ${fillVar} 30%, transparent)`,
                  }}
                  aria-label={`${e.label} (${
                    isRange ? `${e.yearStart}–${e.yearEnd}` : e.year
                  })`}
                  onMouseEnter={(evt) => onEventEnter(e, evt)}
                  onClick={() => onEventClick(e)}
                />
              );
            })}
          </div>

          {/* Axis */}
          <div className="pointer-events-none absolute inset-x-0 top-[30%] h-[8%]">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-foreground/70" />
            <div className="pointer-events-none absolute top-1/2 left-0 h-3 w-0.5 -translate-y-1/2 bg-foreground/70" />
            <div className="pointer-events-none absolute top-1/2 right-0 h-3 w-0.5 -translate-y-1/2 bg-foreground/70" />
            {ticks.map((year) => {
              const left = xPercent(year, view);
              const isMajor = year % 20 === 0;
              return (
                <div
                  key={`tick-${year}`}
                  className="pointer-events-none absolute top-0 -translate-x-1/2"
                  style={{ left: `${left}%` }}
                >
                  <div
                    className={cn(
                      "mx-auto w-px",
                      isMajor ? "h-5 bg-foreground/70" : "h-2 bg-foreground/30",
                    )}
                  />
                  {isMajor ? (
                    <div className="mt-1 font-heading text-[13px] font-bold tracking-tight whitespace-nowrap text-center text-foreground">
                      {year}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Moments band — in jitter mode dots spread across 10 visual
              lanes via a deterministic hash. In lane mode (zoomed in to
              ≤25y) dots stack into per-recording lanes sorted by earliest
              visible moment, with interviewee names on the left. */}
          <div className="pointer-events-none absolute inset-x-0 top-[40%] h-[60%] pb-2">
            {/* Lane labels — only render when there are few enough lanes
                to keep each label legible. */}
            {laneMode && recordingLanes && recordingLanes.size <= LANE_LABEL_CAP
              ? [...recordingLanes.values()].map((entry) => {
                  const spread = Math.max(1, entry.total - 1);
                  const top =
                    entry.total === 1 ? 40 : (entry.index / spread) * 80 + 5;
                  return (
                    <span
                      key={`lane-label-${entry.name}-${entry.index}`}
                      className="pointer-events-none absolute left-2 max-w-[140px] -translate-y-1/2 truncate whitespace-nowrap rounded bg-card/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground backdrop-blur-sm"
                      style={{ top: `${top}%` }}
                      title={entry.name}
                    >
                      {entry.name}
                    </span>
                  );
                })
              : null}
            {plottableMoments.map((m) => {
              const year = momentAnchorYear(m)!;
              const left = xPercent(year, view);
              let top: number;
              if (recordingLanes) {
                const entry = recordingLanes.get(m.recordingId);
                if (entry) {
                  const spread = Math.max(1, entry.total - 1);
                  top =
                    entry.total === 1 ? 40 : (entry.index / spread) * 80 + 5;
                } else {
                  top = 50;
                }
              } else {
                const lane = laneFor(`${m.recordingId}:${m.momentIndex}`);
                top = (lane / (MOMENT_LANES - 1)) * 80;
              }
              const id = momentSelectionId(m);
              const isPinnedMarker = pinnedId === id;
              // Multi-theme dots render as a small conic pie so secondary
              // themes show up at scan time. Single-theme dots stay solid.
              const dotBackground = themeDotBackground(m.themes);
              // Filter fade — non-matching moments drop to 15% and stop
              // accepting pointer events so they don't distract. Pinned
              // moment overrides the fade so the reader's focus stays.
              const isMatch = !filterActive || matchesFilter(m, filter);
              const filteredOut = filterActive && !isMatch && !isPinnedMarker;
              return (
                <button
                  key={id}
                  type="button"
                  data-selected={isPinnedMarker || undefined}
                  aria-pressed={isPinnedMarker}
                  className={cn(
                    "absolute block size-2.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0 transition-[top,transform,opacity] duration-200 ease-out hover:z-10 hover:scale-[1.6] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    filteredOut
                      ? "opacity-15 pointer-events-none"
                      : "pointer-events-auto",
                    !filteredOut &&
                      (m.highlight
                        ? "opacity-100 ring-[1.5px] ring-primary ring-offset-1 ring-offset-card"
                        : "opacity-55 hover:opacity-90"),
                    isPinnedMarker &&
                      "z-10 scale-[1.8] ring-2 ring-primary ring-offset-1 ring-offset-card opacity-100",
                  )}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    background: dotBackground,
                  }}
                  aria-label={`${m.title}. ${m.intervieweeName ?? m.recordingTitle}${m.eraLabel ? ` · ${m.eraLabel}` : ""}`}
                  onMouseEnter={(evt) => onMomentEnter(m, evt)}
                  onClick={() => onMomentClick(m)}
                />
              );
            })}
          </div>

          {/* Floating zoom controls — bottom-right of the canvas. */}
          <div className="pointer-events-auto absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={onZoomOut}
              disabled={isFullView}
              aria-label="Zoom out"
              title="Zoom out (−)"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <MinusIcon aria-hidden className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onResetView}
              disabled={isDefaultView}
              aria-label="Reset view"
              title="Reset view (0)"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <RotateCcwIcon aria-hidden className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              disabled={isMinView}
              aria-label="Zoom in"
              title="Zoom in (+)"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <PlusIcon aria-hidden className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
