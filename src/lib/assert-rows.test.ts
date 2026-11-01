import { describe, expect, it } from "vitest";

import { assertRows } from "./assert-rows";

const isPlace = (r: { name: unknown; geometry?: unknown }) =>
  typeof r.name === "string" && typeof r.geometry === "object" && r.geometry !== null;

describe("assertRows", () => {
  it("accepts rows that pass", () => {
    expect(() => assertRows([{ name: "Sweet Auburn", geometry: {} }], isPlace, "places")).not.toThrow();
  });
  it("refuses a result from another query", () => {
    // The production failure: archive stats mapped onto these columns.
    expect(() => assertRows([{ name: 48 }], isPlace, "places")).toThrow(/places/);
  });
  it("refuses an empty result unless told it's fine", () => {
    expect(() => assertRows([], isPlace, "places")).toThrow();
    expect(() => assertRows([], isPlace, "places", { allowEmpty: true })).not.toThrow();
  });
});
