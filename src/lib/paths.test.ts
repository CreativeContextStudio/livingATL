import { describe, expect, it } from "vitest";

import { LISTENING_PATHS, findPath, momentKey } from "./paths";

describe("listening paths", () => {
  it("have unique URL-safe slugs and no repeated steps", () => {
    const slugs = LISTENING_PATHS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of LISTENING_PATHS) {
      expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      const keys = p.steps.map((s) => momentKey(s.catalogNumber, s.momentIndex));
      expect(new Set(keys).size).toBe(keys.length);
      expect(p.steps.every((s) => Number.isInteger(s.momentIndex) && s.momentIndex >= 0)).toBe(true);
    }
  });
  it("finds by slug", () => {
    expect(findPath("sweet-auburn-1920s")?.title).toBe("Sweet Auburn, 1920s");
    expect(findPath("nope")).toBeNull();
  });
});
