import { describe, expect, it } from "vitest";

import { placeFromSlug, placeHref, placeSlug } from "./places";

describe("placeSlug", () => {
  it.each([
    ["Sweet Auburn", "sweet-auburn"],
    ["Old Fourth Ward", "old-fourth-ward"],
    ["Pittsburgh & Mechanicsville", "pittsburgh-and-mechanicsville"],
    ["People's Town", "peoples-town"],
    ["  Vine City ", "vine-city"],
    ["Cabbagetown (Fulton Bag)", "cabbagetown-fulton-bag"],
  ])("%s → %s", (name, slug) => {
    expect(placeSlug(name)).toBe(slug);
  });
});

describe("placeFromSlug", () => {
  const names = ["Sweet Auburn", "Vine City", "Old Fourth Ward"];
  it("round-trips canonical names and rejects unknown slugs", () => {
    for (const n of names) expect(placeFromSlug(names, placeSlug(n))).toBe(n);
    expect(placeFromSlug(names, "buckhead")).toBeNull();
    expect(placeHref("Old Fourth Ward")).toBe("/places/old-fourth-ward");
  });
});
