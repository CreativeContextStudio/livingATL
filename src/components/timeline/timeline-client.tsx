"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { usePathname, useSearchParams } from "next/navigation";
import { MinusIcon, PlusIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  FAMILY_KEYS,
  familyColorVar,
  familyForEventCategory,
  isFamilyKey,
  isThemeKey,
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
  type FolioSelection,
} from "@/components/timeline/detail-folio";
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
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Interactive Timeline — PRD §7.3 (2026-10-29 simplification).
 *
 * One chart over a shared year axis, top to bottom:
 *   1. Moments — one dot per moment at the year it BEGINS, stacked into
 *      tidy columns (grouped by theme family, filter matches at the base)
 *      so the chart reads as the collection's shape at a glance.
 *   2. Span track — the hovered or selected moment's full era as a bar,
 *      so ranges appear on demand instead of 500 overlapping stripes.
 *   3. Axis — adaptive year labels.
 *   4. Historical events — a thin row of ticks (ranges as faint lines).
 *
 * The selected moment opens in a sticky panel beside the chart on desktop
 * (the chart never moves) and in a bottom sheet on phones. With nothing
 * selected the panel suggests highlights in view.
 *
 * View: `[start, end]`, default the whole collection; `?start=&end=` and
 * the filter round-trip through the URL. Drag pans; pinch or Ctrl/⌘ +
 * wheel zooms (a plain wheel scrolls the page); a horizontal trackpad
 * swipe pans; +/−/0 and the buttons work too.
 */

// ---------------------------------------------------------------------------
// Layout constants (px)
// ---------------------------------------------------------------------------

const DRAG_CLICK_THRESHOLD_PX = 3;
const TOP_PAD = 14;
const SPAN_TRACK = 18;
const AXIS_BAND = 28;
const EVENT_ROW = 26;
const MIN_LABEL_GAP_PX = 46;
const SUGGESTION_COUNT = 5;
/** Phones open on the dense core: the whole 130 years in ~360px stacks
 *  dots on top of each other. "Show the whole collection" still works. */
const NARROW_DEFAULT_VIEW: [number, number] = [1905, 1955];

const FAMILY_ORDER = new Map<string, number>(FAMILY_KEYS.map((k, i) => [k, i]));

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Year a moment is plotted at: where it begins. */
function momentStartYear(m: TimelineMoment): number | null {
  return m.eraStartYear ?? m.eraEndYear ?? null;
}

function momentFamily(m: TimelineMoment): FamilyKey | null {
  const primary = m.themes.find((t): t is ThemeKey => isThemeKey(t));
  return primary ? themeKeyToFamily(primary) : null;
}

function eventStartYear(e: TimelineHistoricalEvent): number | null {
  return e.yearStart ?? e.year ?? null;
}

function momentSelectionId(m: TimelineMoment): string {
  return `moment:${m.recordingId}:${m.momentIndex}`;
}

function eventSelectionId(e: TimelineHistoricalEvent): string {
  const anchor = e.year ?? e.yearStart ?? "undated";
  return `event:${e.category}:${anchor}:${e.label}`;
}

function eraText(m: TimelineMoment): string {
  const s = m.eraStartYear;
  const e = m.eraEndYear;
  if (s != null && e != null && e !== s) return `${s}–${e}`;
  return String(s ?? e ?? "");
}

/** Year labels: the smallest of 10/20/25/50-year steps that keeps labels
 *  at least MIN_LABEL_GAP_PX apart on this (piecewise) scale. */
function yearLabels(view: [number, number], widthPx: number): number[] {
  for (const step of [10, 20, 25, 50]) {
    const first = Math.ceil(view[0] / step) * step;
    const years: number[] = [];
    for (let y = first; y <= view[1]; y += step) years.push(y);
    let minGap = Infinity;
    for (let i = 1; i < years.length; i++) {
      const gap = ((xPercent(years[i], view) - xPercent(years[i - 1], view)) / 100) * widthPx;
      minGap = Math.min(minGap, gap);
    }
    if (minGap >= MIN_LABEL_GAP_PX || step === 50) return years;
  }
  return [];
}

/** Read ?start=&end= from URL params, falling back to the full range. */
function viewFromSearchParams(
  params: URLSearchParams | null,
  bounds: [number, number],
): [number, number] {
  if (params) {
    const s = Number(params.get("start"));
    const e = Number(params.get("end"));
    if (params.has("start") && params.has("end") && Number.isFinite(s) && Number.isFinite(e) && s < e) {
      return clampView([s, e], bounds);
    }
  }
  return bounds;
}

/** Read filter state from URL params. Drops unknown keys so a stale query
 *  string can't corrupt the render. `families` is still read so older
 *  shared links keep working; the UI now selects whole families through
 *  the Theme menu. */
function filterFromSearchParams(params: URLSearchParams | null): TimelineFilter {
  if (!params) return EMPTY_FILTER;
  const list = (k: string) =>
    (params.get(k) ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  return {
    themes: list("themes").filter((t): t is ThemeKey => isThemeKey(t)),
    neighborhoods: list("neighborhoods"),
    families: list("families").filter((f): f is FamilyKey => isFamilyKey(f)),
    highlightOnly: params.get("highlight") === "1",
  };
}

type Point = { clientX: number; clientY: number };

/** Keyboard focus has no cursor — anchor the preview to the marker itself. */
function focusPoint(evt: React.FocusEvent<HTMLElement>): Point {
  const r = evt.currentTarget.getBoundingClientRect();
  return { clientX: r.right, clientY: r.top + r.height / 2 };
}

/**
 * Roving focus across the markers on screen, in left-to-right (year)
 * order, ties broken top-to-bottom. `from = null` focuses the first.
 * Filtered-out markers are `aria-hidden` and skipped.
 */
function stepMarkerFocus(canvas: HTMLElement, from: HTMLElement | null, dir: 1 | -1): void {
  const bounds = canvas.getBoundingClientRect();
  const markers = Array.from(
    canvas.querySelectorAll<HTMLElement>('[data-timeline-marker]:not([aria-hidden="true"])'),
  )
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.right >= bounds.left && r.left <= bounds.right)
    .sort((a, b) => a.r.left - b.r.left || a.r.top - b.r.top)
    .map(({ el }) => el);
  if (markers.length === 0) return;
  const i = from ? markers.indexOf(from) : -1;
  const next = from ? markers[i + dir] : markers[0];
  // preventScroll: the canvas is overflow-hidden; a focus-scroll would
  // shift its content out from under the view math.
  next?.focus({ preventScroll: true });
}

/** OR within a field, AND across fields. */
function matchesFilter(m: TimelineMoment, filter: TimelineFilter): boolean {
  if (filter.highlightOnly && !m.highlight) return false;
  if (filter.themes.length > 0 && !m.themes.some((t) => filter.themes.includes(t as ThemeKey))) {
    return false;
  }
  if (
    filter.neighborhoods.length > 0 &&
    !m.neighborhoods.some((n) => filter.neighborhoods.includes(n))
  ) {
    return false;
  }
  if (
    filter.families.length > 0 &&
    !m.themes.some((t) => isThemeKey(t) && filter.families.includes(themeKeyToFamily(t)))
  ) {
    return false;
  }
  return true;
}

/** Historical events only respond to a family filter (legacy links). */
function matchesEventFilter(e: TimelineHistoricalEvent, filter: TimelineFilter): boolean {
  if (filter.families.length === 0) return true;
  const family = familyForEventCategory(e.category);
  return family != null && filter.families.includes(family);
}

type PlacedDot = { m: TimelineMoment; x: number; y: number; match: boolean };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimelineClient({ data }: { data: TimelineData }) {
  const { moments, historicalEvents, yearRange } = data;
  const bounds = useMemo<[number, number]>(() => [yearRange[0], yearRange[1]], [yearRange]);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<[number, number]>(() => viewFromSearchParams(searchParams, bounds));
  const [filter, setFilter] = useState<TimelineFilter>(() => filterFromSearchParams(searchParams));
  const [pinned, setPinned] = useState<FolioSelection | null>(null);
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);
  const hydratedRef = useRef(false);

  // `useSearchParams()` can be empty during SSR; re-read the real URL once
  // on mount so shared links (`/timeline?themes=…`) land with their state.
  useEffect(() => {
    if (hydratedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const narrow = window.innerWidth < 640 && !(params.has("start") && params.has("end"));
    setView(narrow ? clampView(NARROW_DEFAULT_VIEW, bounds) : viewFromSearchParams(params, bounds));
    setFilter(filterFromSearchParams(params));
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canHover = useMediaQuery("(hover: hover)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isWide = useMediaQuery("(min-width: 640px)");
  const dotSize = isWide ? 9 : 8;

  // Measured canvas width — dot columns are laid out in pixels.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dragStateRef = useRef<{ startClientX: number; startView: [number, number]; canvasWidth: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const didDragRef = useRef(false);

  const filterActive = !isEmptyFilter(filter);
  const pinnedId = pinned?.id ?? null;

  // -----------------------------------------------------------------------
  // Layout: stack dots into pixel columns
  // -----------------------------------------------------------------------

  // Pass 1: bucket visible moments into pixel columns (height-independent).
  const columns = useMemo(() => {
    const out = new Map<number, PlacedDot[]>();
    let matchCount = 0;
    const narrators = new Set<string>();
    if (width === 0) return { out, matchCount, narratorCount: 0, tallest: 0 };
    const pitch = dotSize + 2;
    for (const m of moments) {
      const year = momentStartYear(m);
      if (year == null || year < view[0] || year > view[1]) continue;
      const col = Math.round(((xPercent(year, view) / 100) * width) / pitch);
      const match = !filterActive || matchesFilter(m, filter);
      if (match) {
        matchCount += 1;
        narrators.add(m.intervieweeName ?? m.recordingId);
      }
      const list = out.get(col) ?? [];
      list.push({ m, x: col * pitch, y: 0, match });
      out.set(col, list);
    }
    for (const list of out.values()) {
      list.sort(
        (a, b) =>
          Number(b.match) - Number(a.match) ||
          (FAMILY_ORDER.get(momentFamily(a.m) ?? "") ?? 9) - (FAMILY_ORDER.get(momentFamily(b.m) ?? "") ?? 9) ||
          Number(b.m.highlight) - Number(a.m.highlight) ||
          (momentStartYear(a.m) ?? 0) - (momentStartYear(b.m) ?? 0) ||
          momentSelectionId(a.m).localeCompare(momentSelectionId(b.m)),
      );
    }
    const tallest = Math.max(0, ...[...out.values()].map((c) => c.length));
    return { out, matchCount, narratorCount: narrators.size, tallest };
  }, [moments, view, width, filter, filterActive, dotSize]);

  // The chart grows to fit the tallest column (so dots stay separate and
  // tappable) between a floor and a cap; beyond the cap the vertical step
  // shrinks and dots overlap slightly rather than leave the chart.
  const pitch = dotSize + 2;
  const chrome = TOP_PAD + SPAN_TRACK + AXIS_BAND + EVENT_ROW;
  const [minH, maxH] = isWide ? [380, 540] : [320, 560];
  const canvasHeight = Math.min(maxH, Math.max(minH, columns.tallest * pitch + chrome));
  const baseline = canvasHeight - EVENT_ROW - AXIS_BAND - SPAN_TRACK;
  const stackArea = baseline - TOP_PAD;

  // Pass 2: vertical positions.
  const placed = useMemo(() => {
    const step = Math.min(pitch, stackArea / Math.max(1, columns.tallest));
    const dots: PlacedDot[] = [];
    for (const list of columns.out.values()) {
      list.forEach((d, i) => dots.push({ ...d, y: baseline - step * i - dotSize / 2 - 1 }));
    }
    return { dots, matchCount: columns.matchCount, narratorCount: columns.narratorCount };
  }, [columns, pitch, stackArea, baseline, dotSize]);

  const plottableEvents = useMemo(
    () =>
      historicalEvents.filter((e) => {
        const start = eventStartYear(e);
        return start != null && start <= view[1] && (e.yearEnd ?? e.year ?? start) >= view[0];
      }),
    [historicalEvents, view],
  );

  const labels = useMemo(
    () =>
      width
        ? yearLabels(view, width).filter((y) => {
            const px = (xPercent(y, view) / 100) * width;
            return px > 18 && px < width - 18;
          })
        : [],
    [view, width],
  );

  // The moment whose era the span track shows: hover wins, else the pin.
  const spanMoment: TimelineMoment | null =
    hoverTip?.kind === "moment"
      ? hoverTip.moment
      : pinned?.kind === "moment"
        ? pinned.moment
        : null;

  // Panel suggestions: highlights in view (matching the filter).
  const suggestions = useMemo(
    () =>
      placed.dots
        .filter((d) => d.match && d.m.highlight)
        .map((d) => d.m)
        .sort((a, b) => (momentStartYear(a) ?? 0) - (momentStartYear(b) ?? 0))
        .filter((_, i, all) => all.length <= SUGGESTION_COUNT || i % Math.ceil(all.length / SUGGESTION_COUNT) === 0)
        .slice(0, SUGGESTION_COUNT),
    [placed.dots],
  );

  // -----------------------------------------------------------------------
  // Hover / click
  // -----------------------------------------------------------------------

  const onMomentEnter = useCallback((m: TimelineMoment, evt: Point) => {
    setHoverTip({ kind: "moment", moment: m, x: evt.clientX, y: evt.clientY });
  }, []);
  const onEventEnter = useCallback((e: TimelineHistoricalEvent, evt: Point) => {
    setHoverTip({ kind: "event", event: e, x: evt.clientX, y: evt.clientY });
  }, []);
  const onHoverLeave = useCallback(() => setHoverTip(null), []);

  const pinMoment = useCallback((m: TimelineMoment) => {
    const id = momentSelectionId(m);
    setPinned((prev) => (prev?.id === id ? null : { kind: "moment", id, moment: m }));
  }, []);
  const onMomentClick = useCallback(
    (m: TimelineMoment) => {
      if (didDragRef.current) return;
      pinMoment(m);
    },
    [pinMoment],
  );
  const onEventClick = useCallback((e: TimelineHistoricalEvent) => {
    if (didDragRef.current) return;
    const id = eventSelectionId(e);
    setPinned((prev) => (prev?.id === id ? null : { kind: "event", id, event: e }));
  }, []);
  const onClearPin = useCallback(() => setPinned(null), []);

  // -----------------------------------------------------------------------
  // View controls
  // -----------------------------------------------------------------------

  const onZoomIn = useCallback(() => setView((prev) => zoomAtPct(prev, 0.5, true, bounds)), [bounds]);
  const onZoomOut = useCallback(() => setView((prev) => zoomAtPct(prev, 0.5, false, bounds)), [bounds]);
  const onResetView = useCallback(() => setView(bounds), [bounds]);

  // Pinch / Ctrl-or-⌘ + wheel zooms at the cursor; a horizontal trackpad
  // swipe pans. A plain vertical wheel is left alone so the page scrolls.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (evt: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      if (evt.ctrlKey || evt.metaKey) {
        if (evt.deltaY === 0) return;
        evt.preventDefault();
        const pct = Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width));
        setView((prev) => zoomAtPct(prev, pct, evt.deltaY < 0, bounds));
      } else if (Math.abs(evt.deltaX) > Math.abs(evt.deltaY)) {
        evt.preventDefault();
        setView((prev) => panByPixels(prev, -evt.deltaX, rect.width, bounds));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bounds]);

  // Drag-pan. Document-level move/up listeners (no pointer capture, which
  // would swallow the markers' click events).
  const onPointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      if (evt.button !== 0 || !canvasRef.current) return;
      dragStateRef.current = {
        startClientX: evt.clientX,
        startView: view,
        canvasWidth: canvasRef.current.getBoundingClientRect().width,
      };
      didDragRef.current = false;
      setIsDragging(true);
    },
    [view],
  );
  useEffect(() => {
    const onMove = (evt: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dx = evt.clientX - state.startClientX;
      if (Math.abs(dx) > DRAG_CLICK_THRESHOLD_PX) didDragRef.current = true;
      setView(panByPixels(state.startView, dx, state.canvasWidth, bounds));
    };
    const onUp = () => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      setIsDragging(false);
      // Keep the drag flag for this frame's click event, then reset.
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

  // Keyboard: arrows pan, +/− zoom, 0/Home reset, Escape unpins. Only
  // while the canvas (or a marker in it) has focus.
  useEffect(() => {
    const onKeyDown = (evt: KeyboardEvent) => {
      const canvas = canvasRef.current;
      const active = document.activeElement as HTMLElement | null;
      const onMarker = !!active?.hasAttribute("data-timeline-marker");
      if (evt.key === "Escape") {
        if (pinned) setPinned(null);
        if (onMarker) canvas?.focus({ preventScroll: true });
        return;
      }
      if (evt.metaKey || evt.ctrlKey || evt.altKey) return;
      if (!canvas || !active || !canvas.contains(active)) return;
      if (onMarker) {
        if (evt.key === "ArrowLeft" || evt.key === "ArrowRight") {
          evt.preventDefault();
          stepMarkerFocus(canvas, active, evt.key === "ArrowRight" ? 1 : -1);
        }
        return;
      }
      if (active !== canvas) return;
      switch (evt.key) {
        case "Enter":
        case "ArrowDown":
          evt.preventDefault();
          stepMarkerFocus(canvas, null, 1);
          break;
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
          setView(bounds);
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [bounds, pinned]);

  // View + filter → URL (debounced, replaceState so no server round-trip).
  // Default state leaves the URL clean.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      const isFull = Math.abs(view[0] - bounds[0]) < 0.5 && Math.abs(view[1] - bounds[1]) < 0.5;
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const put = (k: string, v: string | null) => (v ? params.set(k, v) : params.delete(k));
      put("start", isFull ? null : String(Math.round(view[0])));
      put("end", isFull ? null : String(Math.round(view[1])));
      put("themes", filter.themes.join(",") || null);
      put("neighborhoods", filter.neighborhoods.join(",") || null);
      put("families", filter.families.join(",") || null);
      put("highlight", filter.highlightOnly ? "1" : null);
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    }, 200);
    return () => clearTimeout(timer);
    // `searchParams` intentionally omitted — read once on mount, owned after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filter, bounds, pathname]);

  const viewSpan = view[1] - view[0];
  const isFullView = viewSpan >= bounds[1] - bounds[0] - 0.5;
  const isMinView = viewSpan <= MIN_VIEW_SPAN + 0.5;
  const pct = (year: number) => xPercent(year, view);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const zoomControls = (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground" aria-live="polite">
        {Math.round(view[0])}–{Math.round(view[1])}
      </span>
      <div className="flex items-center rounded-md border border-border bg-background">
        <ZoomButton label="Zoom out" hint="−" onClick={onZoomOut} disabled={isFullView}>
          <MinusIcon aria-hidden className="size-3.5" />
        </ZoomButton>
        <ZoomButton label="Show the whole collection" hint="0" onClick={onResetView} disabled={isFullView}>
          <RotateCcwIcon aria-hidden className="size-3.5" />
        </ZoomButton>
        <ZoomButton label="Zoom in" hint="+" onClick={onZoomIn} disabled={isMinView}>
          <PlusIcon aria-hidden className="size-3.5" />
        </ZoomButton>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <TimelineFilterBar
            filter={filter}
            onChange={setFilter}
            moments={moments}
            matchingMomentCount={placed.matchCount}
            matchingNarratorCount={placed.narratorCount}
            trailing={zoomControls}
          />

          <p id="timeline-canvas-help" className="sr-only">
            Left and right arrows pan, plus and minus zoom, 0 shows the whole collection. Press
            Enter or Down arrow to move through the points on screen; left and right arrows then
            step between them in year order, Enter opens one, and Escape returns here.
          </p>
          <div
            ref={canvasRef}
            tabIndex={0}
            role="group"
            aria-roledescription="timeline"
            aria-label={`Timeline, ${Math.round(view[0])} to ${Math.round(view[1])}`}
            aria-describedby="timeline-canvas-help"
            className={cn(
              "relative overflow-hidden touch-pan-y select-none sm:touch-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{ height: canvasHeight }}
            onMouseLeave={onHoverLeave}
            onPointerDown={onPointerDown}
          >
            {/* Year gridlines through the moments area */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0" style={{ height: baseline }}>
              {labels.map((y) => (
                <div key={`grid-${y}`} className="absolute inset-y-0 w-px bg-border/50" style={{ left: `${pct(y)}%` }} />
              ))}
            </div>

            {/* Moments */}
            {placed.dots.map(({ m, x, y, match }) => {
              const id = momentSelectionId(m);
              const isPinned = pinnedId === id;
              const filteredOut = !match && !isPinned;
              return (
                <button
                  key={id}
                  type="button"
                  data-timeline-marker=""
                  tabIndex={-1}
                  aria-pressed={isPinned}
                  aria-hidden={filteredOut || undefined}
                  aria-label={`${m.title}. ${m.intervieweeName ?? m.recordingTitle} · ${m.eraLabel ?? eraText(m)}${m.highlight ? " · highlight" : ""}`}
                  className={cn(
                    "absolute rounded-full p-0 transition-[opacity,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    // Small extra touch margin only: in a tall stack a larger one
                    // reaches past the neighbor's center and steals its taps.
                    "pointer-coarse:after:absolute pointer-coarse:after:-inset-0.5 pointer-coarse:after:rounded-full pointer-coarse:after:content-['']",
                    filteredOut ? "pointer-events-none opacity-15" : "cursor-pointer hover:z-10 hover:scale-150",
                    isPinned && "z-20 scale-150 ring-2 ring-primary ring-offset-1 ring-offset-card",
                  )}
                  style={{
                    left: x - dotSize / 2,
                    top: y - dotSize / 2,
                    width: dotSize,
                    height: dotSize,
                    background: m.highlight
                      ? `radial-gradient(circle, var(--card) 0 ${dotSize / 5}px, ${familyColorVar(momentFamily(m))} ${dotSize / 5 + 0.5}px)`
                      : familyColorVar(momentFamily(m)),
                  }}
                  onMouseEnter={(evt) => canHover && onMomentEnter(m, evt)}
                  onFocus={(evt) => onMomentEnter(m, focusPoint(evt))}
                  onBlur={onHoverLeave}
                  onClick={() => onMomentClick(m)}
                />
              );
            })}

            {/* Span track — the hovered/selected moment's era */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: baseline + 4, height: SPAN_TRACK - 6 }}>
              {spanMoment ? <SpanBar moment={spanMoment} view={view} pinned={hoverTip == null} /> : null}
            </div>

            {/* Axis */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: baseline + SPAN_TRACK, height: AXIS_BAND }}>
              <div className="absolute inset-x-0 top-0 h-px bg-foreground/50" />
              {labels.map((y) => (
                <div key={`label-${y}`} className="absolute top-0 -translate-x-1/2" style={{ left: `${pct(y)}%` }}>
                  <div className="mx-auto h-1.5 w-px bg-foreground/50" />
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">{y}</div>
                </div>
              ))}
            </div>

            {/* Historical events — thin tick row */}
            <div className="pointer-events-none absolute inset-x-0" style={{ top: baseline + SPAN_TRACK + AXIS_BAND, height: EVENT_ROW }}>
              <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
              {plottableEvents.map((e) => {
                const start = eventStartYear(e)!;
                const end = e.yearEnd ?? start;
                const id = eventSelectionId(e);
                const isPinned = pinnedId === id;
                const filteredOut = !matchesEventFilter(e, filter) && !isPinned;
                return (
                  <span key={id}>
                    {end > start ? (
                      <span
                        aria-hidden
                        className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground/10"
                        style={{ left: `${Math.max(0, pct(start))}%`, width: `${Math.min(100, pct(end)) - Math.max(0, pct(start))}%` }}
                      />
                    ) : null}
                    <button
                      type="button"
                      data-timeline-marker=""
                      tabIndex={-1}
                      aria-pressed={isPinned}
                      aria-hidden={filteredOut || undefined}
                      aria-label={`Historical event: ${e.label} (${end > start ? `${start}–${end}` : start})`}
                      className={cn(
                        "absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "after:absolute after:-inset-x-1.5 after:-inset-y-1 after:content-['']",
                        filteredOut ? "pointer-events-none opacity-15" : "pointer-events-auto cursor-pointer hover:h-5 hover:bg-primary",
                        isPinned ? "h-5 w-[3px] bg-primary" : "bg-foreground/30",
                      )}
                      style={{ left: `${pct(start)}%` }}
                      onMouseEnter={(evt) => canHover && onEventEnter(e, evt)}
                      onFocus={(evt) => onEventEnter(e, focusPoint(evt))}
                      onBlur={onHoverLeave}
                      onClick={() => onEventClick(e)}
                    />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          Each dot is a moment from an interview, placed at the year it begins; dots with a light
          center are highlights. Ticks under the axis are historical events.{" "}
          <span className="hidden sm:inline">Drag to pan; pinch or Ctrl/⌘ + scroll to zoom.</span>
          <span className="sm:hidden">Drag to pan; use − and + to zoom.</span>
        </p>
      </div>

      {/* Desktop: sticky side panel. The chart never moves on selection. */}
      {isDesktop ? (
        <aside aria-label="Selected moment" className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-border bg-card">
          {pinned ? (
            <TimelineDetailFolio selected={pinned} onClear={onClearPin} />
          ) : (
            <Suggestions moments={suggestions} onPick={pinMoment} />
          )}
        </aside>
      ) : null}

      {/* Phones/tablets: bottom sheet. */}
      <DialogPrimitive.Root open={!isDesktop && pinned != null} onOpenChange={(open) => !open && onClearPin()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 lg:hidden" />
          <DialogPrimitive.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col overflow-y-auto rounded-t-2xl border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-xl outline-none data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom lg:hidden">
            <DialogPrimitive.Title className="sr-only">
              {pinned?.kind === "moment" ? pinned.moment.title : pinned?.kind === "event" ? pinned.event.label : "Timeline detail"}
            </DialogPrimitive.Title>
            <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20" />
            {pinned ? <TimelineDetailFolio selected={pinned} onClear={onClearPin} /> : null}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {hoverTip ? <HoverTooltip tip={hoverTip} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function ZoomButton({
  label,
  hint,
  onClick,
  disabled,
  children,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={`${label} (${hint})`}
      className="inline-flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:size-11"
    >
      {children}
    </button>
  );
}

/** The hovered/selected moment's era, clipped to the view, years at the ends. */
function SpanBar({ moment, view, pinned }: { moment: TimelineMoment; view: [number, number]; pinned: boolean }) {
  const start = moment.eraStartYear ?? moment.eraEndYear;
  const end = moment.eraEndYear ?? start;
  if (start == null || end == null) return null;
  const rawLeft = xPercent(start, view);
  const rawRight = xPercent(end, view);
  if (rawRight < 0 || rawLeft > 100) return null;
  const left = Math.max(0, rawLeft);
  const right = Math.min(100, rawRight);
  const color = familyColorVar(momentFamily(moment));
  const single = end <= start;
  const label = "absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] leading-none tabular-nums text-foreground";
  return (
    <div className={cn("absolute inset-y-0", pinned ? "opacity-100" : "opacity-80")} style={{ left: `${left}%`, width: `${Math.max(0.6, right - left)}%` }}>
      <div className={cn("absolute top-1/2 -translate-y-1/2 rounded-full", single ? "left-1/2 h-3 w-1 -translate-x-1/2" : "inset-x-0 h-1.5")} style={{ background: color }} />
      <span className={cn(label, "right-full mr-1.5")}>{rawLeft < 0 ? `‹ ${start}` : start}</span>
      {single ? null : <span className={cn(label, "left-full ml-1.5")}>{rawRight > 100 ? `${end} ›` : end}</span>}
    </div>
  );
}

/** Empty panel: a few highlights in the current view as starting points. */
function Suggestions({ moments, onPick }: { moments: TimelineMoment[]; onPick: (m: TimelineMoment) => void }) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Select a dot to read the moment and listen to it. Or start with a highlight:
      </p>
      {moments.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {moments.map((m) => (
            <li key={momentSelectionId(m)}>
              <button
                type="button"
                onClick={() => onPick(m)}
                className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: familyColorVar(momentFamily(m)) }} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{eraText(m)}</span>
                  <span className="line-clamp-2 text-sm font-medium leading-snug">{m.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{m.intervieweeName ?? m.recordingTitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SparklesIcon aria-hidden className="size-3.5" />
          No highlights in this view.
        </p>
      )}
    </div>
  );
}
