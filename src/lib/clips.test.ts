import { describe, expect, it } from "vitest";

import {
  MAX_CLIP_SECONDS,
  clipForSegments,
  clipHref,
  clipQuote,
  parseClipRange,
} from "./clips";

const segs = [
  { start: 0, end: 4.2, text: "So tell me about Auburn Avenue." },
  { start: 4.2, end: 9.8, text: "Well, it was the center of everything." },
  { start: 9.8, end: 15.1, text: "Banks, churches, the Royal Peacock." },
];

describe("parseClipRange", () => {
  it("parses mm:ss and h:mm:ss pairs", () => {
    expect(parseClipRange("12:04", "13:34")).toEqual({ start: 724, end: 814 });
    expect(parseClipRange("1:00:00", "1:01:30")).toEqual({ start: 3600, end: 3690 });
  });
  it("rejects missing, malformed, empty, or reversed ranges", () => {
    for (const [t, end] of [["12:04", null], [null, "1:00"], ["x", "1:00"], ["2:00", "2:00"], ["3:00", "2:00"]]) {
      expect(parseClipRange(t, end)).toBeNull();
    }
  });
  it("clamps very long ranges", () => {
    expect(parseClipRange("0:00", "59:00")).toEqual({ start: 0, end: MAX_CLIP_SECONDS });
  });
});

describe("clipForSegments", () => {
  it("spans whole segments in either selection direction", () => {
    expect(clipForSegments(segs, 1, 2)).toEqual({ start: 4, end: 16 });
    expect(clipForSegments(segs, 2, 1)).toEqual({ start: 4, end: 16 });
  });
  it("returns null for out-of-range indices", () => {
    expect(clipForSegments(segs, 1, 9)).toBeNull();
  });
});

describe("clipHref", () => {
  it("sets t and end and keeps other params", () => {
    const href = clipHref("https://x.test/player/MSS%201?from=portal&t=1:00", { start: 724, end: 814 });
    const url = new URL(href);
    expect(url.searchParams.get("t")).toBe("12:04");
    expect(url.searchParams.get("end")).toBe("13:34");
    expect(url.searchParams.get("from")).toBe("portal");
  });
});

describe("clipQuote", () => {
  it("joins overlapping segments", () => {
    expect(clipQuote(segs, { start: 5, end: 12 })).toBe(
      "Well, it was the center of everything. Banks, churches, the Royal Peacock.",
    );
  });
  it("truncates at a word boundary", () => {
    const q = clipQuote(segs, { start: 0, end: 16 }, 40);
    expect(q.endsWith("…")).toBe(true);
    expect(q.length).toBeLessThanOrEqual(41);
    expect(q).toBe("So tell me about Auburn Avenue. Well,…");
  });
});
