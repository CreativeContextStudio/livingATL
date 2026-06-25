/**
 * Interactive Timeline — piecewise-linear scale (PRD §7.3.1, P3).
 *
 * The axis is NOT linear in year space. Years in dense editorial regions
 * get more screen real estate per year than years in sparse regions, so
 * the 1900–1950 core (where the vast majority of moments live) renders
 * at a scale that gives each moment room to read.
 *
 * At the default 1910–1960 view this is invisible — the entire view
 * sits inside the dense region, so the scale is effectively linear.
 * When users zoom out to see the full span (1855–1989), the 1900–1950
 * core visibly stretches while 1855–1900 compresses. Seam between
 * regions is subtle but reads as "density rhythm" rather than a broken
 * axis.
 *
 * The math operates in a "weighted year" coordinate space. `yearToWeightedX`
 * maps year → weighted-x, monotonic and piecewise-linear. Every
 * rendered position (moment dot, event bar, tick, band) uses `xPercent`,
 * which normalizes the weighted-x of the target against the view's
 * weighted-x bounds. Zoom and pan math run in weighted space so cursor
 * anchoring stays accurate and drag distance maps to the correct
 * year shift in both dense and sparse regions.
 */

type Region = { from: number; to: number; weight: number };

/** Region weights. Higher = more screen real estate per year. Absolute
 *  values don't matter, only ratios. Tuned so the dense core takes
 *  roughly 2× the per-year space of the post-core, and pre-1900
 *  compresses modestly. Lower the core weight toward 1.0 to flatten
 *  toward linear; raise it past 2.5 to push the seam harder. */
const PIECEWISE_REGIONS: readonly Region[] = [
  { from: 1800, to: 1900, weight: 0.7 },
  { from: 1900, to: 1950, weight: 2.0 },
  { from: 1950, to: 2100, weight: 1.0 },
];

/** Precomputed cumulative weighted-x at each region start. */
type Breakpoint = Region & { xStart: number };

const PIECEWISE_BREAKPOINTS: readonly Breakpoint[] = (() => {
  const out: Breakpoint[] = [];
  let cumulative = 0;
  for (const r of PIECEWISE_REGIONS) {
    out.push({ ...r, xStart: cumulative });
    cumulative += (r.to - r.from) * r.weight;
  }
  return out;
})();

/** Year → weighted-x. Monotonic piecewise-linear. Years outside the
 *  defined regions extrapolate with the nearest region's weight so the
 *  function is defined everywhere. */
export function yearToWeightedX(year: number): number {
  for (const r of PIECEWISE_BREAKPOINTS) {
    if (year <= r.to) {
      const localYears = Math.max(0, year - r.from);
      return r.xStart + localYears * r.weight;
    }
  }
  const last = PIECEWISE_BREAKPOINTS[PIECEWISE_BREAKPOINTS.length - 1];
  return last.xStart + (year - last.from) * last.weight;
}

/** Weighted-x → year. Inverse of `yearToWeightedX`, used by cursor
 *  anchoring during wheel-zoom. */
export function weightedXToYear(x: number): number {
  for (const r of PIECEWISE_BREAKPOINTS) {
    const xEnd = r.xStart + (r.to - r.from) * r.weight;
    if (x <= xEnd) {
      return r.from + (x - r.xStart) / r.weight;
    }
  }
  const last = PIECEWISE_BREAKPOINTS[PIECEWISE_BREAKPOINTS.length - 1];
  return last.from + (x - last.xStart) / last.weight;
}

/** x position (in percent of canvas width) for a year, given the
 *  currently visible viewport. Percent space is uniform; the mapping
 *  to that space is piecewise-linear in year space. */
export function xPercent(year: number, view: [number, number]): number {
  const startX = yearToWeightedX(view[0]);
  const endX = yearToWeightedX(view[1]);
  if (endX === startX) return 50;
  const yearX = yearToWeightedX(year);
  return ((yearX - startX) / (endX - startX)) * 100;
}

/** Hard floor on zoom-in — at less than 5y visible the axis becomes a
 *  point and interactions feel broken. */
export const MIN_VIEW_SPAN = 5;

/** Clamp a view range to sit within data bounds and respect the
 *  minimum visible span. Operates in year space — piecewise weights
 *  don't affect bounds semantics, just layout. */
export function clampView(
  view: [number, number],
  bounds: [number, number],
  minSpan = MIN_VIEW_SPAN,
): [number, number] {
  let [start, end] = view;
  const [minB, maxB] = bounds;
  if (end - start < minSpan) {
    const mid = (start + end) / 2;
    start = mid - minSpan / 2;
    end = mid + minSpan / 2;
  }
  if (end - start >= maxB - minB) {
    return [minB, maxB];
  }
  if (start < minB) {
    const span = end - start;
    start = minB;
    end = minB + span;
  }
  if (end > maxB) {
    const span = end - start;
    end = maxB;
    start = maxB - span;
  }
  return [start, end];
}

/** Zoom scale per wheel tick / +/- press. */
const ZOOM_SCALE_IN = 0.82;
const ZOOM_SCALE_OUT = 1.22;

/** Zoom anchored at a cursor position (0..1 across canvas). The anchor
 *  year stays put under the cursor. Math runs in weighted-x space so
 *  the anchor's percent position is preserved across the zoom. */
export function zoomAtPct(
  view: [number, number],
  pct: number,
  directionIn: boolean,
  bounds: [number, number],
): [number, number] {
  const startX = yearToWeightedX(view[0]);
  const endX = yearToWeightedX(view[1]);
  const spanX = endX - startX;
  const anchorX = startX + spanX * pct;

  const newSpanX = spanX * (directionIn ? ZOOM_SCALE_IN : ZOOM_SCALE_OUT);
  const newStartX = anchorX - newSpanX * pct;
  const newEndX = newStartX + newSpanX;

  return clampView(
    [weightedXToYear(newStartX), weightedXToYear(newEndX)],
    bounds,
  );
}

/** Pan by a pixel delta, preserving the pixel-to-weighted-years ratio
 *  that the user's drag gesture started with. */
export function panByPixels(
  startView: [number, number],
  dx: number,
  canvasWidth: number,
  bounds: [number, number],
): [number, number] {
  if (canvasWidth === 0) return startView;
  const startX = yearToWeightedX(startView[0]);
  const endX = yearToWeightedX(startView[1]);
  const spanX = endX - startX;
  const shiftX = -(dx / canvasWidth) * spanX;
  return clampView(
    [weightedXToYear(startX + shiftX), weightedXToYear(endX + shiftX)],
    bounds,
  );
}

/** Pan by a fraction of the visible span (used by arrow-key handlers). */
export function panByFraction(
  view: [number, number],
  fraction: number,
  bounds: [number, number],
): [number, number] {
  const startX = yearToWeightedX(view[0]);
  const endX = yearToWeightedX(view[1]);
  const spanX = endX - startX;
  const shiftX = spanX * fraction;
  return clampView(
    [weightedXToYear(startX + shiftX), weightedXToYear(endX + shiftX)],
    bounds,
  );
}
