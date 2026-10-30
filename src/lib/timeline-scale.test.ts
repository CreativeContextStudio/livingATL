import { describe, expect, it } from "vitest";

import { centerViewOn, xPercent, yearToWeightedX } from "./timeline-scale";

const BOUNDS: [number, number] = [1855, 1985];

describe("centerViewOn", () => {
  it("puts the year in the middle of the screen, across the weighted seams", () => {
    for (const year of [1905, 1925, 1952]) {
      const view = centerViewOn(year, [1910, 1940], BOUNDS);
      expect(xPercent(year, view)).toBeCloseTo(50, 5);
    }
  });

  it("keeps the on-screen zoom of the given width", () => {
    const widthOf: [number, number] = [1910, 1940];
    const view = centerViewOn(1930, widthOf, BOUNDS);
    const weighted = (v: [number, number]) => yearToWeightedX(v[1]) - yearToWeightedX(v[0]);
    expect(weighted(view)).toBeCloseTo(weighted(widthOf), 5);
  });

  it("clamps at the ends instead of showing empty years", () => {
    const view = centerViewOn(1857, [1900, 1930], BOUNDS);
    expect(view[0]).toBe(1855);
    const late = centerViewOn(1984, [1900, 1930], BOUNDS);
    expect(late[1]).toBe(1985);
  });

  it("keeps the zoom when stepping along the edges", () => {
    const weighted = (v: [number, number]) => yearToWeightedX(v[1]) - yearToWeightedX(v[0]);
    let view = centerViewOn(1860, [1920, 1940], BOUNDS);
    const width = weighted(view);
    for (const year of [1862, 1865, 1870, 1880, 1981, 1984]) {
      view = centerViewOn(year, view, BOUNDS);
      expect(weighted(view)).toBeCloseTo(width, 5);
    }
  });

  it("returns the whole range when the width covers it", () => {
    expect(centerViewOn(1930, [1800, 2000], BOUNDS)).toEqual(BOUNDS);
  });
});
