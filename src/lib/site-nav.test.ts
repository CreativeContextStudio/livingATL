import { describe, expect, it } from "vitest";

import { NAV_SECTIONS, activeSection, sectionTabs } from "./site-nav";

describe("site nav", () => {
  it("has four doors and keeps every page reachable", () => {
    expect(NAV_SECTIONS).toHaveLength(4);
    const pages = NAV_SECTIONS.flatMap((s) => [s.href, ...(s.tabs ?? []).map((t) => t.href)]);
    for (const href of ["/browse", "/paths", "/timeline", "/map", "/places", "/portal", "/about", "/contact"]) {
      expect(pages).toContain(href);
    }
  });
  it("puts each page in its section, including detail pages", () => {
    expect(activeSection("/paths/sweet-auburn-1920s")?.label).toBe("Listen");
    expect(activeSection("/player/MSS%20637.104.002")?.label).toBe("Listen");
    expect(activeSection("/places/sweet-auburn")?.label).toBe("Explore");
    expect(activeSection("/portal/a/abc")?.label).toBe("Ask");
    expect(activeSection("/contact")?.label).toBe("About");
    expect(activeSection("/")).toBeNull();
  });
  it("doesn't match a path that only shares a prefix", () => {
    expect(activeSection("/mapped")).toBeNull();
  });
  it("shows tabs on tabbed pages only", () => {
    expect(sectionTabs("/map")?.active.label).toBe("Map");
    expect(sectionTabs("/paths/sweet-auburn-1920s")?.active.label).toBe("Paths");
    expect(sectionTabs("/portal")).toBeNull();
    expect(sectionTabs("/player/MSS%20637.104.002")).toBeNull();
    expect(sectionTabs("/")).toBeNull();
  });
});
