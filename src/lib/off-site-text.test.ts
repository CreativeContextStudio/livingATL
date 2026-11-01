import { describe, expect, it } from "vitest";

import { canQuoteOffSite, hasSlur, shareCardText } from "./off-site-text";

const spans = [{ start: 100, end: 120, category: "racial_violence", severity: "narrative" }];
const segments = [
  { start: 0, end: 10, text: "We lived on Auburn Avenue." },
  { start: 100, end: 110, text: "Then the mob came." },
  { start: 200, end: 210, text: "He called me a nigger that day." },
];
const base = { segments, keyQuotes: [], cardLine: "Life on Auburn Avenue.", flaggedSpans: spans };

describe("hasSlur", () => {
  it("catches the variants the transcripts contain, not lookalikes", () => {
    for (const t of ["a nigger", "NIGGERS", "that nigga", "niggas"]) expect(hasSlur(t)).toBe(true);
    for (const t of ["Negro", "Nigeria", "the Black Crackers", "niggardly"]) expect(hasSlur(t)).toBe(false);
  });
});

describe("canQuoteOffSite", () => {
  it("refuses text overlapping a flagged span", () => {
    expect(canQuoteOffSite("anything", spans, 115, 130)).toBe(false);
  });
  it("allows text touching a span's edge but not overlapping it", () => {
    expect(canQuoteOffSite("anything", spans, 120, 130)).toBe(true);
    expect(canQuoteOffSite("anything", spans, 90, 100)).toBe(true);
  });
  it("refuses a slur even when no span covers it", () => {
    expect(canQuoteOffSite("He called me a nigger", [], 0, 5)).toBe(false);
  });
});

describe("shareCardText", () => {
  it("quotes a clear clip", () => {
    expect(shareCardText({ ...base, clip: { start: 0, end: 10 } })).toEqual({
      quote: "We lived on Auburn Avenue.",
      line: base.cardLine,
      contentNote: false,
    });
  });
  it("labels a flagged clip and withholds its words", () => {
    expect(shareCardText({ ...base, clip: { start: 95, end: 112 } })).toEqual({
      quote: null,
      line: base.cardLine,
      contentNote: true,
    });
  });
  it("withholds an unflagged clip containing a slur", () => {
    const text = shareCardText({ ...base, clip: { start: 200, end: 210 } });
    expect(text.quote).toBeNull();
    expect(text.contentNote).toBe(true);
  });
  it("skips flagged key quotes on a plain recording link", () => {
    const keyQuotes = [
      { text: "Then the mob came.", start_time: 100, end_time: 110 },
      { text: "We lived on Auburn Avenue.", start_time: 0 },
    ];
    expect(shareCardText({ ...base, clip: null, keyQuotes }).quote).toBe("We lived on Auburn Avenue.");
  });
  it("treats a key quote with no end time as a short passage", () => {
    const keyQuotes = [{ text: "Starts just before the span.", start_time: 80 }];
    expect(shareCardText({ ...base, clip: null, keyQuotes }).quote).toBeNull();
  });
  it("falls back to the card line, unlabeled, when no key quote is safe", () => {
    const keyQuotes = [{ text: "Then the mob came.", start_time: 100, end_time: 110 }];
    expect(shareCardText({ ...base, clip: null, keyQuotes })).toEqual({
      quote: null,
      line: base.cardLine,
      contentNote: false,
    });
  });
});
